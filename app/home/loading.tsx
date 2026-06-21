import MaxWContainer from "@/components/ui/MaxWContainer";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-border rounded-md animate-pulse ${className}`} />;
}

function WorkspaceCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[330px] min-h-[230px] rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <div className="p-6 pb-3">
        <Skeleton className="h-5 w-3/4" />
      </div>
      <div className="px-6 flex-1">
        <div className="h-full flex items-center justify-center">
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      <div className="px-6 py-4 flex justify-between items-center border-t border-border">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-12" />
      </div>
    </div>
  );
}

function NoteCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[330px] h-[230px] rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <div className="p-6 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
      <div className="px-6 pb-3 flex-1 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
      <div className="px-6 py-4 flex justify-between items-center border-t border-border mt-auto">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-12" />
      </div>
    </div>
  );
}

function SliderRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-4 overflow-hidden h-[250px]">{children}</div>;
}

export default function Loading() {
  return (
    <MaxWContainer className="relative my-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-muted from-20% via-transparent via-70% to-muted p-8 mb-8">
        <div className="max-w-3xl mx-auto text-center">
          <Skeleton className="h-10 w-56 mx-auto mb-4" />
          <Skeleton className="h-4 w-full max-w-xl mx-auto mb-2" />
          <Skeleton className="h-4 w-5/6 max-w-lg mx-auto" />
        </div>
      </div>

      <div className="mb-12">
        <div className="mb-6 flex justify-between items-center">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-9 w-36" />
        </div>
        <SliderRow>
          {[1, 2, 3, 4].map((i) => (
            <WorkspaceCardSkeleton key={i} />
          ))}
        </SliderRow>
      </div>

      <div className="mb-12">
        <div className="mb-6">
          <Skeleton className="h-7 w-36" />
        </div>
        <SliderRow>
          {[1, 2, 3].map((i) => (
            <NoteCardSkeleton key={i} />
          ))}
        </SliderRow>
      </div>

      <div className="mb-12">
        <div className="mb-6">
          <Skeleton className="h-7 w-36" />
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
