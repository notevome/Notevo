"use client";

import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Notebook,
  Star,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MaxWContainer from "@/components/ui/MaxWContainer";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-primary/20 rounded-md animate-pulse ${className}`} />
  );
}

function SkeletonText({ width = "w-full" }: { width?: string }) {
  return <Skeleton className={`h-4 ${width}`} />;
}

function SkeletonTitle() {
  return <Skeleton className="h-6 w-3/4" />;
}

function GreetingSkeleton() {
  return <Skeleton className="h-10 w-48 inline-block" />;
}

function Slider({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-[250px] group">
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div
        className="absolute inset-0 flex gap-4 h-fit overflow-x-auto scrollbar-hide scroll-smooth"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {children}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    </div>
  );
}
function WorkspaceCardSkeleton() {
  return (
    <Card className="relative overflow-hidden bg-card/90 backdrop-blur-sm border-border flex-shrink-0 w-[300px] h-fit">
      <CardHeader className="pb-3">
        <SkeletonTitle />
      </CardHeader>

      <CardContent className="pb-3">
        <div className="h-20 flex items-center justify-center">
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
      </CardContent>

      <CardFooter className="pt-3 flex justify-between items-center text-xs border-t border-border">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </CardFooter>
    </Card>
  );
}

function NoteCardSkeleton() {
  return (
    <Card className="relative overflow-hidden bg-card/90 backdrop-blur-sm border-border flex-shrink-0 w-[300px] h-[225px]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <SkeletonTitle />
            <SkeletonText width="w-1/2" />
          </div>
          <div className="h-4 w-4" />
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-2">
        <SkeletonText />
        <SkeletonText width="w-5/6" />
        <SkeletonText width="w-4/6" />
      </CardContent>

      <CardFooter className="pt-3 flex justify-between items-center text-xs border-t border-border">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </CardFooter>
    </Card>
  );
}

export default function homeSkeleton() {
  return (
    <MaxWContainer className="relative my-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted from-20% via-transparent via-70% to-muted p-8 mb-8">
        <header className="relative max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-primary inline-block">
            Hello, <GreetingSkeleton />
          </h1>
          <p className="text-white/90 text-md max-w-2xl mx-auto mb-6">
            <Skeleton className="h-5 w-full max-w-lg mx-auto" />
            <Skeleton className="h-5 w-3/4 max-w-md mx-auto mt-2" />
          </p>
        </header>
      </div>

      <div className="mb-12">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-foreground text-xl font-semibold">
            Your Workspaces
          </h2>
          <Button variant="outline" size="sm" disabled>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:block">New Workspace</span>
          </Button>
        </div>

        <Slider>
          {[1, 2].map((i) => (
            <WorkspaceCardSkeleton key={i} />
          ))}
        </Slider>
      </div>
      <div className="mb-12">
        <div className="mb-6">
          <h2 className="text-foreground text-xl font-semibold">
            Recent Notes
          </h2>
        </div>

        <Slider>
          {[1, 2, 3, 4].map((i) => (
            <NoteCardSkeleton key={i} />
          ))}
        </Slider>
      </div>
    </MaxWContainer>
  );
}
