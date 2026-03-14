import MaxWContainer from "@/components/ui/MaxWContainer";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-primary/20 rounded-md animate-pulse ${className}`} />
  );
}

function ParagraphSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-10/12" />
      <Skeleton className="h-4 w-9/12" />
    </div>
  );
}

export default function Loading() {
  return (
    <MaxWContainer className="relative my-8 space-y-5">
      <div className="mb-6">
        <Skeleton className="h-8 w-2/3 mb-3" />
        <Skeleton className="h-4 w-48" />
      </div>
      <ParagraphSkeleton />
      <div className="h-40 rounded-lg bg-primary/10 animate-pulse" />
      <ParagraphSkeleton />
    </MaxWContainer>
  );
}
