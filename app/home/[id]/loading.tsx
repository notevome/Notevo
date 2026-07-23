import MaxWContainer from "@/components/ui/MaxWContainer";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export default function Loading() {
  return (
    <MaxWContainer className="my-5 grid grid-cols-1">
      <header>
        <div className="relative flex justify-between items-end w-full">
          <div className="flex-1 px-1.5 border border-border bg-muted app-radius-md">
            <h1 className="text-3xl md:text-5xl font-bol my-4 h-[3rem]">
              <div className="bg-border app-radius-md animate-pulse h-10 w-64 inline-block" />
            </h1>
          </div>
        </div>
      </header>

      <div>
        {/* Tab bar: simple flow layout sized to match the real ~44px tab strip */}
        <div className="sticky top-0 left-0 mb-6 z-40">
          <div className="flex items-center gap-1 px-1 pt-2 bg-muted border border-border border-b-0">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className={`px-4 py-2.5 min-w-[110px] rounded-t-lg border-2 border-b-0 ${
                  i === 0 ? "border-border bg-card" : "border-transparent"
                }`}
              >
                <div className="h-4 w-16 bg-border rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-[2px] bg-border" />
        </div>

        <div className="grid grid-cols-1 gap-6 w-full max-w-full">
          <div className="flex flex-wrap gap-y-2 gap-x-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0 md:max-w-md">
                <div className="h-9 w-full bg-border rounded animate-pulse" />
              </div>
            </div>

            <div className="flex items-center gap-2 w-auto justify-end">
              <div className="hidden sm:flex h-9 items-center border border-border app-radius-lg overflow-hidden">
                <div className="h-9 w-10 bg-border animate-pulse" />
                <div className="h-9 w-10 bg-border animate-pulse border-l border-r border-border" />
                <div className="h-9 w-10 bg-border animate-pulse" />
              </div>
              <div className="h-9 w-28 bg-border rounded-lg animate-pulse" />
              <div className="h-9 w-9 bg-border rounded-lg animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={index}
                className="bg-card/90 backdrop-blur-sm border-border flex flex-col min-h-[230px]"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-5 w-3/4 bg-border rounded animate-pulse" />
                    <div className="h-5 w-5 bg-border rounded animate-pulse" />
                  </div>
                </CardHeader>
                <CardContent className="flex-grow flex-1">
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-border rounded animate-pulse" />
                    <div className="h-4 w-5/6 bg-border rounded animate-pulse" />
                    <div className="h-4 w-4/6 bg-border rounded animate-pulse" />
                  </div>
                </CardContent>
                <CardFooter className="py-4 flex items-center justify-between border-t border-border">
                  <div className="h-4 w-24 bg-border rounded animate-pulse" />
                  <div className="h-9 w-12 bg-border rounded animate-pulse" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MaxWContainer>
  );
}
