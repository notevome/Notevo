import { useState, useCallback, useRef, useEffect } from "react";

export function useHoverTooltip(delayDuration = 0) {
  const [open, setOpen] = useState(false);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearShowTimeout = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearShowTimeout();
    if (delayDuration <= 0) {
      setOpen(true);
      return;
    }
    showTimeoutRef.current = setTimeout(() => {
      setOpen(true);
      showTimeoutRef.current = null;
    }, delayDuration);
  }, [clearShowTimeout, delayDuration]);

  const hide = useCallback(() => {
    clearShowTimeout();
    setOpen(false);
  }, [clearShowTimeout]);

  useEffect(() => clearShowTimeout, [clearShowTimeout]);

  return {
    open,
    delayDuration,
    setOpen,
    show,
    hide,
    triggerProps: {
      onMouseEnter: show,
      onMouseLeave: hide,
    },
  };
}
