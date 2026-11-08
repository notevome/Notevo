"use client";

import { useState, useEffect } from "react";

export function useNoteWidth() {
  const [noteWidth, setNoteWidth] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("oraizive-note-width");
      return stored === "true" || stored === "false" ? stored : "false";
    }
    return "false";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("oraizive-note-width", noteWidth);
    }
  }, [noteWidth]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "oraizive-note-width" && e.newValue) {
        setNoteWidth(e.newValue);
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail) {
        setNoteWidth(e.detail);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener(
        "noteWidthChanged",
        handleCustomEvent as EventListener,
      );
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener(
          "noteWidthChanged",
          handleCustomEvent as EventListener,
        );
      };
    }
  }, []);

  const toggleWidth = () => {
    const newValue = noteWidth === "false" ? "true" : "false";
    setNoteWidth(newValue);
    if (typeof window !== "undefined") {
      localStorage.setItem("oraizive-note-width", newValue);
      // Dispatch a custom event for same-tab updates
      window.dispatchEvent(
        new CustomEvent("noteWidthChanged", { detail: newValue }),
      );
    }
  };

  const getMaxWidthClass = () => {
    return noteWidth === "true" ? "w-full" : "max-w-7xl";
  };

  return { noteWidth, setNoteWidth, toggleWidth, getMaxWidthClass };
}
