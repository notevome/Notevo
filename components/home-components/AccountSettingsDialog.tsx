"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CreditCard,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import { formatUserEmail } from "@/lib/utils";
interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Doc<"users"> | undefined;
}

type PhotoSize = {
  width: number;
  height: number;
};

type CropBox = {
  x: number;
  y: number;
  size: number;
};

type CropCorner = "nw" | "ne" | "sw" | "se";

function splitName(name: string | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function createEditedAvatarBlob(src: string, crop: CropBox) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not edit avatar image");
  }

  context.fillStyle = "#111827";
  context.fillRect(0, 0, size, size);
  context.translate(size / 2, size / 2);
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.size,
    crop.size,
    -size / 2,
    -size / 2,
    size,
    size,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not export avatar image"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

function createCenteredCrop(photoSize: PhotoSize): CropBox {
  const size = Math.min(photoSize.width, photoSize.height) * 0.8;

  return {
    x: (photoSize.width - size) / 2,
    y: (photoSize.height - size) / 2,
    size,
  };
}

function clampCrop(crop: CropBox, photoSize: PhotoSize): CropBox {
  const maxSize = Math.min(photoSize.width, photoSize.height);
  const size = Math.min(Math.max(crop.size, maxSize * 0.2), maxSize);
  const x = Math.min(Math.max(crop.x, 0), photoSize.width - size);
  const y = Math.min(Math.max(crop.y, 0), photoSize.height - size);

  return { x, y, size };
}

export default function AccountSettingsDialog({
  open,
  onOpenChange,
  user,
}: AccountSettingsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoPreviewRef = useRef<HTMLDivElement>(null);
  const cropInteractionRef = useRef<{
    mode: "move" | "resize";
    corner?: CropCorner;
    startClientX: number;
    startClientY: number;
    startCrop: CropBox;
  } | null>(null);
  const generateAvatarUploadUrl = useMutation(
    api.users.generateAvatarUploadUrl,
  );
  const updateProfile = useMutation(api.users.updateProfile);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const nameParts = useMemo(() => splitName(user?.name), [user?.name]);
  const [firstName, setFirstName] = useState(nameParts.firstName);
  const [lastName, setLastName] = useState(nameParts.lastName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [selectedPhotoSize, setSelectedPhotoSize] = useState<PhotoSize | null>(
    null,
  );
  const [photoPreviewSize, setPhotoPreviewSize] = useState(385);
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] =
    useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState("");
  const removeAvatarTooltip = useHoverTooltip(100);

  useEffect(() => {
    if (!open) return;
    setFirstName(nameParts.firstName);
    setLastName(nameParts.lastName);
  }, [nameParts.firstName, nameParts.lastName, open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (selectedPhotoUrl) URL.revokeObjectURL(selectedPhotoUrl);
    };
  }, [selectedPhotoUrl]);

  useEffect(() => {
    if (!selectedPhotoUrl) {
      setSelectedPhotoSize(null);
      setCrop(null);
      return;
    }

    let isCurrent = true;

    void loadImage(selectedPhotoUrl).then((image) => {
      if (!isCurrent) return;

      const photoSize = {
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      };

      setSelectedPhotoSize(photoSize);
      setCrop(createCenteredCrop(photoSize));
    });

    return () => {
      isCurrent = false;
    };
  }, [selectedPhotoUrl]);

  useEffect(() => {
    if (!isPhotoEditorOpen || !photoPreviewRef.current) return;

    const updatePreviewSize = () => {
      if (!photoPreviewRef.current) return;
      setPhotoPreviewSize(photoPreviewRef.current.clientWidth);
    };

    updatePreviewSize();
    const resizeObserver = new ResizeObserver(updatePreviewSize);
    resizeObserver.observe(photoPreviewRef.current);

    return () => resizeObserver.disconnect();
  }, [isPhotoEditorOpen]);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const currentName = (user?.name ?? "").trim();
  const hasNameChanges = fullName.length > 0 && fullName !== currentName;
  const displayName = fullName || currentName || "Your profile";
  const avatarSrc = previewUrl ?? user?.image;
  const hasAvatarImage = Boolean(avatarSrc);
  const displayedPhotoRect = selectedPhotoSize
    ? (() => {
        const scale = Math.min(
          photoPreviewSize / selectedPhotoSize.width,
          photoPreviewSize / selectedPhotoSize.height,
        );
        const width = selectedPhotoSize.width * scale;
        const height = selectedPhotoSize.height * scale;

        return {
          left: (photoPreviewSize - width) / 2,
          top: (photoPreviewSize - height) / 2,
          width,
          height,
          scale,
        };
      })()
    : null;
  const cropStyle =
    crop && displayedPhotoRect
      ? {
          left: displayedPhotoRect.left + crop.x * displayedPhotoRect.scale,
          top: displayedPhotoRect.top + crop.y * displayedPhotoRect.scale,
          width: crop.size * displayedPhotoRect.scale,
          height: crop.size * displayedPhotoRect.scale,
        }
      : null;

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please choose a JPG or PNG image.");
        return;
      }

      if (file.size / 1024 / 1024 > 5) {
        toast.error("Avatar must be 5MB or smaller.");
        return;
      }

      setIsUploadingAvatar(true);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return objectUrl;
      });

      try {
        const uploadUrl = await generateAvatarUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error("Avatar upload failed");
        }

        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };

        await updateProfile({ avatarStorageId: storageId });
        toast.success("Avatar updated.");
      } catch (error) {
        console.error("Error updating avatar:", error);
        toast.error("Could not update avatar. Please try again.");
        setPreviewUrl(null);
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [generateAvatarUploadUrl, updateProfile],
  );

  const closePhotoEditor = useCallback(() => {
    setIsPhotoEditorOpen(false);
    setCrop(null);
    setSelectedPhotoSize(null);
    setSelectedPhotoUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return null;
    });
  }, []);

  const openPhotoEditorFromFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size / 1024 / 1024 > 5) {
      toast.error("Avatar must be 5MB or smaller.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedPhotoUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return objectUrl;
    });
    setIsPhotoEditorOpen(true);
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) openPhotoEditorFromFile(file);
    },
    [openPhotoEditorFromFile],
  );
  const startCropInteraction = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>,
      mode: "move" | "resize",
      corner?: CropCorner,
    ) => {
      if (!crop) return;

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      cropInteractionRef.current = {
        mode,
        corner,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startCrop: crop,
      };
    },
    [crop],
  );

  const handleCropPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const interaction = cropInteractionRef.current;
      if (!interaction || !displayedPhotoRect || !selectedPhotoSize) return;

      event.preventDefault();
      const deltaX =
        (event.clientX - interaction.startClientX) / displayedPhotoRect.scale;
      const deltaY =
        (event.clientY - interaction.startClientY) / displayedPhotoRect.scale;

      if (interaction.mode === "move") {
        setCrop(
          clampCrop(
            {
              ...interaction.startCrop,
              x: interaction.startCrop.x + deltaX,
              y: interaction.startCrop.y + deltaY,
            },
            selectedPhotoSize,
          ),
        );
        return;
      }

      const start = interaction.startCrop;
      const corner = interaction.corner ?? "se";
      const signedDeltaX = corner.includes("w") ? -deltaX : deltaX;
      const signedDeltaY = corner.includes("n") ? -deltaY : deltaY;
      const nextSize = start.size + Math.max(signedDeltaX, signedDeltaY);
      const normalizedSize = Math.min(
        Math.max(
          nextSize,
          Math.min(selectedPhotoSize.width, selectedPhotoSize.height) * 0.2,
        ),
        Math.min(selectedPhotoSize.width, selectedPhotoSize.height),
      );
      const nextCrop = {
        x: corner.includes("w")
          ? start.x + start.size - normalizedSize
          : start.x,
        y: corner.includes("n")
          ? start.y + start.size - normalizedSize
          : start.y,
        size: normalizedSize,
      };

      setCrop(clampCrop(nextCrop, selectedPhotoSize));
    },
    [displayedPhotoRect, selectedPhotoSize],
  );

  const endCropInteraction = useCallback(() => {
    cropInteractionRef.current = null;
  }, []);

  const handleConfirmPhotoEdit = useCallback(async () => {
    if (!selectedPhotoUrl || !crop) return;

    try {
      const blob = await createEditedAvatarBlob(selectedPhotoUrl, crop);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      closePhotoEditor();
      await handleAvatarUpload(file);
    } catch (error) {
      console.error("Error editing avatar:", error);
      toast.error("Could not edit this photo. Please try another image.");
    }
  }, [closePhotoEditor, crop, handleAvatarUpload, selectedPhotoUrl]);

  const handleDeleteAvatar = useCallback(async () => {
    if (!hasAvatarImage || isDeletingAvatar) return;

    setIsDeletingAvatar(true);
    removeAvatarTooltip.hide();
    try {
      await updateProfile({ clearAvatar: true });
      setPreviewUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return null;
      });
      toast.success("Avatar removed.");
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("Could not remove avatar. Please try again.");
    } finally {
      setIsDeletingAvatar(false);
    }
  }, [hasAvatarImage, isDeletingAvatar, removeAvatarTooltip, updateProfile]);

  const handleSaveName = useCallback(async () => {
    if (!hasNameChanges) return;

    setIsSavingName(true);
    try {
      await updateProfile({ name: fullName });
      toast.success("Profile updated.");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Could not save your name. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  }, [fullName, hasNameChanges, updateProfile]);

  const isDeleteConfirmationValid =
    Boolean(user?.email) && deleteConfirmationEmail === user?.email;

  const handleDeleteAccount = useCallback(async () => {
    if (isDeletingAccount || !isDeleteConfirmationValid) return;

    setIsDeletingAccount(true);
    try {
      await deleteAccount({});
      setIsDeleteAccountDialogOpen(false);
      onOpenChange(false);
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Could not delete your account. Please try again.");
      setIsDeletingAccount(false);
    }
  }, [
    deleteAccount,
    isDeletingAccount,
    isDeleteConfirmationValid,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=" md:min-w-[850px] max-w-3xl overflow-hidden p-0 text-foreground z-[900001] ">
        <DialogHeader className=" px-4 pb-2 pt-4 border-b border-border ">
          <DialogTitle>Account settings</DialogTitle>
          <DialogDescription>
            Manage your profile, billing preferences, and account safety.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 px-4 py-4 max-h-[78vh] overflow-y-auto crollbar-gutter-stable [&::-webkit-scrollbar]:w-[0.4rem] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">My Profile</h2>
                <p className="text-sm text-muted-foreground">
                  Update the name and avatar shown across Notevo.
                </p>
              </div>
              <Button
                variant="outline"
                disabled={!hasNameChanges || isSavingName}
                onClick={() => void handleSaveName()}
              >
                {isSavingName ? "Saving..." : "Save changes"}
              </Button>
            </div>

            <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">
              <div className="space-y-2">
                <div className="relative h-20 w-20">
                  <Button
                    variant="outline"
                    className="group relative block !p-0 h-20 w-20 overflow-hidden app-radius-lg bg-muted"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar || isDeletingAvatar}
                    aria-label={
                      hasAvatarImage
                        ? "Edit profile photo"
                        : "Upload a new avatar"
                    }
                  >
                    <Avatar className="h-full w-full app-radius-lg">
                      {avatarSrc ? (
                        <AvatarImage src={avatarSrc} alt={displayName} />
                      ) : null}
                      <AvatarFallback className="bg-border text-lg text-foreground">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="h-5 w-5" />
                    </span>
                  </Button>
                  {hasAvatarImage ? (
                    <Tooltip open={removeAvatarTooltip.open}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Remove profile photo"
                          disabled={isUploadingAvatar || isDeletingAvatar}
                          onClick={() => void handleDeleteAvatar()}
                          {...removeAvatarTooltip.triggerProps}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        sideOffset={6}
                        className=" text-xs px-1.5 py-0.5 z-[900001]"
                      >
                        Remove profile photo
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  {isUploadingAvatar
                    ? "Uploading..."
                    : isDeletingAvatar
                      ? "Removing..."
                      : "Click to change"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="account-first-name">First name</Label>
                  <Input
                    id="account-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="account-last-name">Last name</Label>
                  <Input
                    id="account-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </section>
          <Separator />
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Billing</h2>
            </div>
            <div className="border border-border bg-muted/20 p-4 app-radius-lg">
              <p className="font-medium">Billing options are coming soon</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Subscription plans and invoices will live here when Notevo adds
                paid plans.
              </p>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <h2 className="text-base font-semibold">Danger zone</h2>
            </div>
            <div className="border border-destructive/40 bg-destructive/5 p-4 app-radius-lg">
              <p className="font-medium text-destructive">Delete account</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently deleting your user will remove access to your
                workspaces, notes, uploads, and account data.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                You are signed in as {user?.email}
              </p>
              <Button
                variant="outline"
                className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setIsDeleteAccountDialogOpen(true)}
              >
                Delete your account
              </Button>
            </div>
          </section>
        </div>

        <AlertDialog
          open={isDeleteAccountDialogOpen}
          onOpenChange={(nextOpen) => {
            if (isDeletingAccount) return;
            setIsDeleteAccountDialogOpen(nextOpen);
            setDeleteConfirmationEmail("");
          }}
        >
          <AlertDialogContent className="z-[900002] !border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and remove access to
                your workspaces, notes, uploads, and account data. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="delete-account-email-confirm">
                Type <span className="font-medium">{user?.email}</span> to
                confirm
              </Label>
              <Input
                id="delete-account-email-confirm"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                placeholder={user ? user.email : "write your exact email"}
                spellCheck={false}
                value={deleteConfirmationEmail}
                onChange={(event) =>
                  setDeleteConfirmationEmail(event.target.value)
                }
                disabled={isDeletingAccount}
                className="h-9"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingAccount}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
                disabled={isDeletingAccount || !isDeleteConfirmationValid}
                onClick={(event) => {
                  event.preventDefault();
                  void handleDeleteAccount();
                }}
              >
                {isDeletingAccount ? "Deleting..." : "Delete account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isPhotoEditorOpen && selectedPhotoUrl ? (
          <div
            data-avatar-photo-editor
            className="fixed inset-0 z-[900002] flex items-center justify-center bg-background/30 px-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-[550px] overflow-hidden app-radius-lg border border-border bg-card text-card-foreground shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-2 py-2">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={closePhotoEditor}
                    aria-label="Back to account settings"
                    className=" h-8 flex justify-center items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Profile photo</h3>
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  onClick={closePhotoEditor}
                  size="icon"
                  aria-label="Close photo editor"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6 px-2.5 pt-5 pb-2.5">
                <div
                  ref={photoPreviewRef}
                  className="relative mx-auto aspect-square w-full max-w-[385px] overflow-hidden bg-muted"
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={endCropInteraction}
                  onPointerCancel={endCropInteraction}
                >
                  <div
                    role="img"
                    aria-label="Selected profile photo preview"
                    className="absolute bg-contain bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url(${selectedPhotoUrl})`,
                      left: displayedPhotoRect?.left ?? 0,
                      top: displayedPhotoRect?.top ?? 0,
                      width: displayedPhotoRect?.width ?? "100%",
                      height: displayedPhotoRect?.height ?? "100%",
                    }}
                  />

                  {cropStyle ? (
                    <>
                      <div
                        className="absolute bg-background/55"
                        style={{
                          left: displayedPhotoRect?.left ?? 0,
                          top: displayedPhotoRect?.top ?? 0,
                          width: displayedPhotoRect?.width ?? 0,
                          height:
                            cropStyle.top - (displayedPhotoRect?.top ?? 0),
                        }}
                      />
                      <div
                        className="absolute bg-background/55"
                        style={{
                          left: displayedPhotoRect?.left ?? 0,
                          top: cropStyle.top + cropStyle.height,
                          width: displayedPhotoRect?.width ?? 0,
                          height:
                            (displayedPhotoRect?.top ?? 0) +
                            (displayedPhotoRect?.height ?? 0) -
                            (cropStyle.top + cropStyle.height),
                        }}
                      />
                      <div
                        className="absolute bg-background/55"
                        style={{
                          left: displayedPhotoRect?.left ?? 0,
                          top: cropStyle.top,
                          width:
                            cropStyle.left - (displayedPhotoRect?.left ?? 0),
                          height: cropStyle.height,
                        }}
                      />
                      <div
                        className="absolute bg-background/55"
                        style={{
                          left: cropStyle.left + cropStyle.width,
                          top: cropStyle.top,
                          width:
                            (displayedPhotoRect?.left ?? 0) +
                            (displayedPhotoRect?.width ?? 0) -
                            (cropStyle.left + cropStyle.width),
                          height: cropStyle.height,
                        }}
                      />

                      <div
                        className="absolute cursor-move touch-none border border-dashed border-foreground/80"
                        style={cropStyle}
                        onPointerDown={(event) =>
                          startCropInteraction(event, "move")
                        }
                      >
                        {[
                          {
                            corner: "nw" as const,
                            position: "left-[-5px] top-[-5px]",
                          },
                          {
                            corner: "ne" as const,
                            position: "right-[-5px] top-[-5px]",
                          },
                          {
                            corner: "sw" as const,
                            position: "bottom-[-5px] left-[-5px]",
                          },
                          {
                            corner: "se" as const,
                            position: "bottom-[-5px] right-[-5px]",
                          },
                        ].map(({ corner, position }) => (
                          <button
                            key={corner}
                            type="button"
                            className={`absolute h-3 w-3 touch-none border border-foreground bg-card ${position}`}
                            aria-label="Resize crop area"
                            onPointerDown={(event) =>
                              startCropInteraction(event, "resize", corner)
                            }
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className=" h-8 !rounded-none"
                      onClick={() => {
                        closePhotoEditor();
                        if (hasAvatarImage) void handleDeleteAvatar();
                      }}
                    >
                      Delete photo
                    </Button>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleConfirmPhotoEdit()}
                    disabled={isUploadingAvatar}
                    className=" !rounded-none h-8"
                  >
                    {isUploadingAvatar ? "Uploading..." : "Confirm"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
