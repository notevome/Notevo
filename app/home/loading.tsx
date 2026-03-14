import MaxWContainer from "@/components/ui/MaxWContainer";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-primary/20 rounded-md animate-pulse ${className}`} />;
}

function SliderRow({ count }: { count: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[300px] h-[225px] rounded-xl border border-border bg-card/70 backdrop-blur-sm p-4"
        >
          <Skeleton className="h-5 w-2/3 mb-3" />
          <Skeleton className="h-3 w-1/2 mb-6" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-2" />
          <Skeleton className="h-4 w-4/6" />
          <div className="mt-8 flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <MaxWContainer className="relative my-8">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-muted from-20% via-transparent via-70% to-muted p-8 mb-10">
        <div className="max-w-3xl mx-auto text-center">
          <Skeleton className="h-10 w-56 mx-auto mb-4" />
          <Skeleton className="h-4 w-full max-w-xl mx-auto mb-2" />
          <Skeleton className="h-4 w-5/6 max-w-lg mx-auto" />
        </div>
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <SliderRow count={4} />
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-10" />
        </div>
        <SliderRow count={3} />
      </div>
    </MaxWContainer>
  );
}
