"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ItemSettingsMenu, {
  type ItemSettingsMenuProps,
} from "./ItemSettingsMenu";
import { useSidebarPopupGuard } from "@/components/ui/sidebar";

type ItemContextMenuProps = Omit<
  ItemSettingsMenuProps,
  "contextMenuPosition" | "onContextMenuClose" | "hideTrigger"
> & {
  children: React.ReactNode;
  className?: string;
};

export default function ItemContextMenu({
  children,
  className,
  ...itemSettings
}: ItemContextMenuProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const popupOpenRef = useRef(false);
  const popupGuard = useSidebarPopupGuard();

  const setPopupOpen = useCallback(
    (nextOpen: boolean) => {
      if (popupOpenRef.current === nextOpen) return;
      popupOpenRef.current = nextOpen;
      popupGuard(nextOpen);
    },
    [popupGuard],
  );

  useEffect(() => () => setPopupOpen(false), [setPopupOpen]);

  const closeContextMenu = () => {
    setPosition(null);
    setPopupOpen(false);
  };

  return (
    <>
      <div
        className={className ?? "contents"}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPosition({ x: event.clientX, y: event.clientY });
          setPopupOpen(true);
        }}
      >
        {children}
      </div>
      <ItemSettingsMenu
        {...itemSettings}
        hideTrigger
        contextMenuPosition={position}
        onContextMenuClose={closeContextMenu}
      />
    </>
  );
}
