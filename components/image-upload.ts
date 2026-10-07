import { createImageUpload } from "novel";
import { toast } from "sonner";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string,
);

const onUpload = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    toast.promise(
      (async () => {
        const uploadUrl = await convex.mutation(
          api.files.generateUploadUrl,
          {},
        );

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error("Failed to upload image to storage.");
        }

        const { storageId } = (await result.json()) as { storageId: string };

        const publicUrl = await convex.mutation(api.files.getUrl, {
          storageId: storageId as any,
        });

        if (!publicUrl) {
          throw new Error("Could not retrieve image URL after upload.");
        }

        await new Promise<void>((res, rej) => {
          const img = new Image();
          img.src = publicUrl;
          img.onload = () => res();
          img.onerror = () =>
            rej(new Error("Image failed to load after upload."));
        });

        resolve(publicUrl);
        return publicUrl;
      })(),
      {
        loading: "Uploading image...",
        success: "Image uploaded successfully.",
        error: (e: Error) => {
          reject(e);
          return e.message;
        },
      },
    );
  });
};

export const uploadFn = createImageUpload({
  onUpload,
  validateFn: (file) => {
    if (!file.type.includes("image/")) {
      toast.error("File type not supported.");
      return false;
    }
    if (file.size / 1024 / 1024 > 20) {
      toast.error("File size too big (max 20MB).");
      return false;
    }
    return true;
  },
});
