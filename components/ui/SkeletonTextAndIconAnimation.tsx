import { cn } from "@/lib/utils";

interface SkeletonTextAndIconAnimationProps {
  Icon_className?: string;
  text_className?: string;
}
export default function SkeletonTextAndIconAnimation({
  Icon_className,
  text_className,
}: SkeletonTextAndIconAnimationProps) {
  return (
    <div className="animate-pulse">
      <div className=" w-full flex justify-start items-center pb-3">
        <div
          className={cn(
            "h-5 w-5 bg-border app-radius-lg mx-3",
            Icon_className,
          )}
        ></div>
        <div
          className={cn(
            "h-4 bg-border app-radius-lg mx-2 w-full",
            text_className,
          )}
        ></div>
      </div>
    </div>
  );
}
