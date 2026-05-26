"use client";
import MaxWContainer from "@/components/ui/MaxWContainer";
import { useEffect } from "react";
import imgsrc from "@/public/Notevo-logo.svg";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { formatUserNoteTitle } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const errorMessage =
    error.message && error.message.length < 20
      ? error.message
      : "An unexpected error occurred. Please try again.";

  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-background p-6 overflow-hidden">
      <MaxWContainer className="flex flex-col items-center justify-center gap-3 *:text-center relative px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden bg-card/90 backdrop-blur-md border-border ">
          <CardContent className="relative pt-4 pb-16">
            <div className="flex flex-col justify-center">
              <div className="  flex flex-col items-center justify-center gap-4 text-center">
                <h2 className="text-3xl md:text-6xl bg-gradient-to-b from-foreground to-transparent bg-clip-text text-transparent font-semibold">
                  Something went wrong!
                </h2>
                <p className="  text-muted-foreground text-xs md:text-sm font-medium lg:font-medium px-2 py-1">
                  {errorMessage}
                </p>
              </div>
            </div>
            <Button className=" absolute bottom-0 right-0 w-auto mt-4 h-9">
              <Link href="/">Try again</Link>
            </Button>
          </CardContent>
        </Card>
        <div className=" w-full flex justify-start items-center ">
          <Image
            src={imgsrc}
            alt="Notevo Logo"
            priority
            width={16}
            height={16}
          />
          <p className="text-muted-foreground text-xs font-medium px-2 ">
            {`! Hi this is Notevo team we're sorry | hit the try again button `}
          </p>
        </div>
      </MaxWContainer>
    </section>
  );
}
