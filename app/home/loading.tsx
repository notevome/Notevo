import MaxWContainer from "@/components/ui/MaxWContainer";
import SkeletonTextAnimation from "@/components/ui/SkeletonTextAnimation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function WorkspaceCardSkeleton() {
  return (
    <Card className="relative overflow-hidden bg-card border-border flex-shrink-0 w-[330px] min-h-[230px] flex flex-col">
      <CardHeader className="pb-3 relative">
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="flex-grow flex-1">
        <div className="h-full flex items-center justify-center">
          <Skeleton className="h-8 w-8 app-radius-md" />
        </div>
      </CardContent>
      <CardFooter className="py-4 flex justify-between items-center border-t border-border">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-12" />
      </CardFooter>
    </Card>
  );
}

function NoteCardSkeleton() {
  return (
    <Card className="relative overflow-hidden bg-card border-border flex-shrink-0 w-[330px] h-[230px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex-1 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </CardContent>
      <CardFooter className="py-4 flex justify-between items-center border-t border-border mt-auto">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-12" />
      </CardFooter>
    </Card>
  );
}

function SliderRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-[250px] group">
      <div className="absolute inset-0 flex gap-4 h-fit overflow-x-auto scrollbar-hide">
        {children}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <MaxWContainer className="relative">
      {/* Hero Section */}
      <div className="overflow-hidden py-6 mb-16">
        <header className="flex flex-col justify-center items-start gap-2 relative">
          <h1 className="text-3xl sm:text-5xl font-bold text-primary">
            <SkeletonTextAnimation className="mx-0 min-w-52 h-10" />
          </h1>
          <p className="text-white/90 text-md">
            Organize your thoughts , and manage your workspaces,
          </p>
        </header>
      </div>

      {/* Workspaces Slider */}
      <div className="mb-8">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-foreground text-xl font-semibold">
            Your Workspaces
          </h2>
          <Skeleton className="h-9 w-36" />
        </div>
        <SliderRow>
          {[1, 2, 3, 4].map((i) => (
            <WorkspaceCardSkeleton key={i} />
          ))}
        </SliderRow>
      </div>

      {/* Recent Notes Slider */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-foreground text-xl font-semibold">
            Recent Notes
          </h2>
        </div>
        <SliderRow>
          {[1, 2, 3].map((i) => (
            <NoteCardSkeleton key={i} />
          ))}
        </SliderRow>
      </div>
    </MaxWContainer>
  );
}
