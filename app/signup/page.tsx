"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthActions } from "@convex-dev/auth/react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { FcGoogle } from "react-icons/fc";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { NOISE_PNG } from "@/lib/data";
import NotevoLogo from "@/public/Notevo-logo.svg";
import NoteImage from "@/public/LightModeImage.svg";
function SignInWithMagicLink({
  handleLinkSent,
}: {
  handleLinkSent: () => void;
}) {
  const { signIn } = useAuthActions();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Zod schema for email
  const emailSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
  });

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof emailSchema>) {
    setLoading(true);
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("redirectTo", "/home");
    try {
      await signIn("resend", formData);
      handleLinkSent();
    } catch {
      toast({
        variant: "destructive",
        title: "Invalid Email or Password",
        description: "Example for a valid email : example@email.com",
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Form {...form}>
      <form className="flex flex-col " onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground text-base">
                Enter your email
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="email"
                  placeholder="name@email.com"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} className="mt-3">
          {loading ? (
            <>
              <LoadingAnimation className="mx-2 w-4 h-4" /> Sending...
            </>
          ) : (
            "Send sign-in link"
          )}
        </Button>
      </form>
    </Form>
  );
}

export default function SignInPage() {
  const [step, setStep] = useState<"signIn" | "linkSent">("signIn");
  return (
    <div className=" force-light relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10 overflow-hidden">
      {/* Real PNG grain noise overlay — always light mode, fixed values */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0"
        style={{
          backgroundImage: `url(${NOISE_PNG})`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          opacity: 0.07,
          mixBlendMode: "multiply",
          zIndex: 5,
        }}
      />
      <div className="absolute inset-0 -z-[1] h-full w-full bg-background ">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(-180deg, transparent, transparent 5px, rgba(75, 85, 99,0.4) 3px, rgba(75, 85, 99, 0.2) 7px, transparent 6px, transparent 112px),
              repeating-linear-gradient(-180deg, transparent, transparent 5px, rgba(107, 114, 128, 0.4) 3px, rgba(107, 114, 128, 0.2) 3px, transparent 5px, transparent 70px)
            `,
          }}
        />
      </div>
      <div className="w-full relative max-w-sm Desktop:max-w-[53rem]  rounded-lg">
        <motion.svg
          className="absolute z-[2] Desktop:-top-16 -top-14 Desktop:-left-16 -left-12 w-40 h-40 md:w-48 md:h-48 text-primary/80"
          viewBox="0 0 120 120"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.path
            d="M30 60 Q15 35,50 25 Q85 15,95 50 Q105 75,80 90 Q55 105,30 85"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 0.8, ease: "easeOut", delay: 0.3 },
              opacity: { duration: 0.4 },
            }}
          />
        </motion.svg>
        <div className="flex flex-col gap-4">
          <span className=" w-full flex justify-start items-center px-1 ">
            <Badge variant="secondary" className="text-xs w-fit">
              BETA
            </Badge>
          </span>

          <Card className="overflow-hidden z-[5] bg-background border border-border shadow-xl shadow-primary/10">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center mb-2 text-center">
                    <Image
                      src={NotevoLogo}
                      alt="log Image"
                      width={45}
                      height={45}
                      className="mb-3 hover:scale-110 transition-transform duration-200 sm:block md:hidden lg:hidden"
                    />
                    <h1 className="text-2xl font-bold text-foreground">
                      Welcome back
                    </h1>
                    <p className="text-balance text-muted-foreground">
                      Login or create an account
                    </p>
                  </div>
                  {step === "signIn" ? (
                    <>
                      <SignInWithMagicLink
                        handleLinkSent={() => setStep("linkSent")}
                      />
                      <div className=" relative py-3 ">
                        <hr className=" border-primary/20 !my-0" />
                        <span className=" text-sm bg-background absolute top-2/4 -translate-y-1/2 left-2/4 -translate-x-1/2 z-10 px-6 text-muted-foreground">
                          OTHER OPTIONS
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <SignInWithGitHub />
                        <SignInWithGoogle />
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="font-semibold text-2xl tracking-tight text-foreground">
                        Check your email
                      </h2>
                      <p className="text-muted-foreground">
                        A sign-in link has been sent to your email address.
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => setStep("signIn")}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="relative hidden bg-card/60 backdrop-blur-md md:block">
                <Image
                  src={NoteImage}
                  alt="login Image"
                  width={800}
                  height={600}
                  className="absolute blur-sm opacity-60 inset-0 h-full w-full object-cover"
                />
                <Image
                  src={NotevoLogo}
                  alt="log Image"
                  width={65}
                  height={65}
                  className="absolute top-2/4 left-1/2 -translate-x-1/2 -translate-y-1/2 inset-0 object-cover"
                />
              </div>
            </CardContent>
          </Card>
          <div className="text-balance text-center text-xs text-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-muted-foreground">
            By signing up and continue, you agree to our{" "}
            <Link target="_blank" prefetch={true} href="/terms-of-service">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link target="_blank" prefetch={true} href="/privacy-policy">
              Privacy Policy
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInWithGitHub() {
  const { signIn } = useAuthActions();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      className="w-full flex-1"
      variant="outline"
      type="button"
      onClick={() => {
        setLoading(true);
        void signIn("github", { redirectTo: "/home" }).finally(() =>
          setLoading(false),
        );
      }}
      disabled={loading}
    >
      {loading ? (
        <>
          <LoadingAnimation className="mx-2 w-4 h-4" /> GitHub...
        </>
      ) : (
        <>
          <GitHubLogoIcon className="mr-2 h-4 w-4" /> GitHub
        </>
      )}
    </Button>
  );
}

function SignInWithGoogle() {
  const { signIn } = useAuthActions();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      className="w-full flex-1"
      variant="outline"
      type="button"
      onClick={() => {
        setLoading(true);
        void signIn("google", { redirectTo: "/home" }).finally(() =>
          setLoading(false),
        );
      }}
      disabled={loading}
    >
      {loading ? (
        <>
          <LoadingAnimation className="mx-2 w-4 h-4" /> Google...
        </>
      ) : (
        <>
          <FcGoogle className="mr-2 h-4 w-4" /> Google
        </>
      )}
    </Button>
  );
}
