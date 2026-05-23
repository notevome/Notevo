"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export function ReadOnlyWarning() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const hasSeenWarning = localStorage.getItem("ReadOnlySeen");
    if (!hasSeenWarning) {
      setShowWarning(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("ReadOnlySeen", "true");
    setShowWarning(false);
  };

  if (!showWarning) return null;

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ease: "linear", duration: 0.5, delay: 2 }}
      className="fixed top-4 inset-x-0 z-50 flex justify-center px-4"
    >
      <div className="w-full max-w-2xl bg-background/80 backdrop-blur-md pr-2 pl-4 py-2 rounded-tl-lg border border-border shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Read only</h3>
            <p className="text-base text-muted-foreground mt-1">
              You're viewing a live copy of the original note. Your changes
              won't affect the original but you can download your edited copy
              anytime.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDismiss}>
            OK
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
