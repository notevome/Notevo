import MaxWContainer from "@/components/ui/MaxWContainer";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-border rounded-md animate-pulse ${className}`} />;
}

export default function Loading() {
  return (
    <MaxWContainer className="flex h-full w-[900px] flex-col px-0 py-0 mx-0">
      <div className="flex-1 rounded-none border border-border bg-transparent animate-pulse" />
    </MaxWContainer>
  );
}
