import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse app-radius-lg bg-border", className)}
      {...props}
    />
  );
}

export { Skeleton };
