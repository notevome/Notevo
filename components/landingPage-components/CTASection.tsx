"use client";
import { Button } from "../ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative isolate overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
          <h2 className="mt-10 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Ready to get started?
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Join thousands of users who are already organizing their thoughts
            with Notevo. Start your journey today and experience the power of
            AI-powered Note Taking.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Link href="/signup">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link
              href="/#pricing"
              className="text-sm font-semibold leading-6 text-foreground hover:text-muted-foreground"
            >
              View pricing <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
