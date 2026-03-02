"use client";
import { Button } from "../ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
export default function SignUpToday() {
  return (
    <section
      className={cn(
        "px-4 sm:px-6 md:px-8",
        "py-12 sm:py-16 md:py-20 Desktop:py-24",
        "relative overflow-hidden",
      )}
    >
      <div className="relative flex flex-col items-center justify-center gap-8 ">
        <div className="text-center space-y-4 ">
          <h2 className="text-5xl md:text-7xl Desktop:text-[94px] font-bold tracking-tight bg-gradient-to-r from-primary/90 via-primary to-primary/90 bg-clip-text text-transparent">
            It Doesn't Have To Be Complicated
          </h2>
          <p className="text-lg md:text-xl font-semibold text-muted-foreground">
            Start your journey today and experience the power of Simple,
            Structured Note Taking.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link
              prefetch={true}
              href="/signup"
              className="text-base font-medium"
            >
              Start Free
            </Link>
          </Button>
          {/* <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/#pricing" className="text-base font-medium">
                View Pricing
              </Link>
            </Button> */}
        </div>
      </div>
    </section>
  );
}
