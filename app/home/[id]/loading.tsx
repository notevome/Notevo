import MaxWContainer from "@/components/ui/MaxWContainer";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-primary/20 rounded-md animate-pulse ${className}`} />
  );
}

function TabsSkeleton({ count }: { count: number }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex items-center gap-3 p-1 bg-card/90 backdrop-blur-sm rounded-lg border border-border">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="px-6 py-2.5 rounded-lg bg-muted/30"
          >
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden"
        >
          <div className="p-4 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-6" />
            </div>
          </div>
          <div className="px-4 pb-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
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
    <MaxWContainer className="my-5">
      {/* Header (match WorkingSpacePageClient layout) */}
      <header className="pb-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted from-20% via-transparent via-70% to-muted p-8">
          <div className="relative flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Skeleton className="h-10 w-72 mb-3" />
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-sm">
                    <Skeleton className="h-4 w-20" />
                  </span>
                </div>
              </div>
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mt-6 mb-6">
        <TabsSkeleton count={5} />
      </div>

      {/* Control Bar */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md w-full">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden">
              <Skeleton className="h-9 w-10 rounded-none" />
              <Skeleton className="h-9 w-10 rounded-none" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-10 rounded-lg" />
          </div>
        </div>

        {/* Notes grid */}
        <NotesGridSkeleton count={6} />

        {/* Show more */}
        <div className="flex justify-center pt-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
    </MaxWContainer>
  );
}
