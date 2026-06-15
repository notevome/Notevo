import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./button";
import { AlertTriangle } from "lucide-react";

export function MobileWarning() {
  const isMobile = useIsMobile();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (isMobile) {
      const hasSeenWarning = localStorage.getItem("mobileWarningSeen");
      if (!hasSeenWarning) {
        setShowWarning(true);
      }
    }
  }, [isMobile]);

  const handleDismiss = () => {
    localStorage.setItem("mobileWarningSeen", "true");
    setShowWarning(false);
  };

  if (!showWarning) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100001] bg-background/80 backdrop-blur-md pr-2 pl-4 py-2 rounded-tl-lg border border-border shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Mobile View Warning</h3>
          <p className="text-base text-muted-foreground mt-1">
            We do NOT support mobile yet. Use with caution.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDismiss}>
          OK
        </Button>
      </div>
    </div>
  );
}
