import MaxWContainer from "@/components/ui/MaxWContainer";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-border app-radius-md animate-pulse ${className}`} />
  );
}

export default function Loading() {
  return (
    <div className="flex h-full max-w-full min-h-0 flex-col px-0 py-0 mx-0">
      <div className="flex-1 rounded-none border border-border bg-card animate-pulse" />
    </div>
  );
}
