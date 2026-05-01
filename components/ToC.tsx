"use client";

import { useState, useEffect, useCallback } from "react";
import { TextSelection } from "@tiptap/pm/state";
import { type Editor } from "@tiptap/core";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ToCItemData {
  id: string;
  textContent: string;
  level: number;
  isActive: boolean;
  isScrolledOver: boolean;
  itemIndex: number;
  pos: number;
  dom?: HTMLElement;
}

interface ToCItemProps {
  item: ToCItemData;
  onItemClick: (e: React.MouseEvent, item: ToCItemData) => void;
  isExpanded: boolean;
}

export const ToCItem = ({ item, onItemClick, isExpanded }: ToCItemProps) => {
  // Calculate line width based on hierarchy level when collapsed
  const getLineWidth = () => {
    if (isExpanded) return undefined;
    const widthPercentage = 100 - (item.level - 1) * 18;
    // Result: H1=100%, H2=82%, H3=64%, H4=46%, H5=40%, H6=40%
    return `${Math.max(widthPercentage, 40)}%`; // Minimum 40%
  };

  return (
    <div
      className={`
         cursor-pointer group
        ${item.isActive && !item.isScrolledOver ? "is-active" : ""}
        ${item.isScrolledOver ? "is-scrolled" : ""}
      `}
      style={{
        paddingLeft: isExpanded
          ? `${0.25 + (item.level - 1) * 0.75}rem`
          : "0.25rem",
      }}
    >
      <Link
        href={`#${item.id}`}
        onClick={(e) => onItemClick(e, item)}
        className={`
        flex items-center justify-end gap-2 py-1.5 px-2 rounded-tl-lg no-underline
        
          ${
            item.isActive && !item.isScrolledOver
              ? "text-foreground "
              : "text-muted-foreground hover:text-foreground hover:bg-border"
          }
          ${item.isScrolledOver ? "opacity-40" : ""}
        `}
      >
        {/* Horizontal line indicator */}
        <div
          className={`
            h-0.5 flex-shrink-0
            ${
              item.isActive && !item.isScrolledOver
                ? "bg-muted-foreground h-[3px] w-6"
                : "bg-muted-foreground/60 w-4 group-hover:w-6"
            }
          `}
          style={{
            width: isExpanded ? undefined : getLineWidth(),
          }}
        />

        {/* Text content - only show when expanded */}
        {isExpanded && (
          <span className="text-xs truncate flex-1">{item.textContent}</span>
        )}
      </Link>
    </div>
  );
};

export const ToCEmptyState = ({ isExpanded }: { isExpanded: boolean }) => {
  if (!isExpanded) return null;

  return (
    <div className="text-muted-foreground text-xs py-4 text-center px-2">
      <p>No headings yet</p>
    </div>
  );
};

interface ToCProps {
  items?: ToCItemData[];
  editor: Editor | null;
  onActiveIdChange?: (id: string | null) => void;
}

export const ToC = ({ items = [], editor, onActiveIdChange }: ToCProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Scroll tracking with Intersection Observer
  useEffect(() => {
    if (!items || items.length === 0) return;

    const headingElements = new Map<string, HTMLElement>();
    const observerOptions = {
      rootMargin: "-100px 0px -66% 0px",
      threshold: 0,
    };

    // Find all heading elements
    items.forEach((item) => {
      let element: HTMLElement | null = null;

      if (item.dom && item.dom instanceof HTMLElement) {
        element = item.dom;
      } else {
        element = document.getElementById(item.id);
      }

      if (!element && editor) {
        const foundElement = editor.view.dom.querySelector(
          `[data-toc-id="${item.id}"]`,
        );
        if (foundElement instanceof HTMLElement) {
          element = foundElement;
        }
      }

      if (!element && editor) {
        const headings = editor.view.dom.querySelectorAll(
          "h1, h2, h3, h4, h5, h6",
        );
        for (const heading of headings) {
          if (heading.textContent?.trim() === item.textContent.trim()) {
            element = heading as HTMLElement;
            break;
          }
        }
      }

      if (element) {
        headingElements.set(item.id, element);
      }
    });

    if (headingElements.size === 0) return;

    const visibleHeadings = new Set<string>();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = Array.from(headingElements.entries()).find(
          ([, element]) => element === entry.target,
        )?.[0];

        if (!id) return;

        if (entry.isIntersecting) {
          visibleHeadings.add(id);
        } else {
          visibleHeadings.delete(id);
        }
      });

      if (visibleHeadings.size > 0) {
        const firstVisibleId = items.find((item) =>
          visibleHeadings.has(item.id),
        )?.id;

        if (firstVisibleId) {
          setActiveId(firstVisibleId);
          onActiveIdChange?.(firstVisibleId);
        }
      } else {
        const scrollY = window.scrollY;
        let closestId: string | null = null;
        let closestDistance = Infinity;

        headingElements.forEach((element, id) => {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + scrollY;
          const distance = scrollY - elementTop;

          if (distance >= 0 && distance < closestDistance) {
            closestDistance = distance;
            closestId = id;
          }
        });

        setActiveId(closestId);
        onActiveIdChange?.(closestId);
      }
    }, observerOptions);

    headingElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [items, editor, onActiveIdChange]);

  useEffect(() => {
    if (!editor) return;

    const syncOnReady = () => {
      // Force a no-op transaction to initialize state
      editor.view.dispatch(editor.state.tr);
    };

    // Listen to all relevant events
    editor.on("create", syncOnReady);
    editor.on("focus", syncOnReady);
    editor.on("selectionUpdate", syncOnReady);

    // Run initial sync
    syncOnReady();

    return () => {
      editor.off("create", syncOnReady);
      editor.off("focus", syncOnReady);
      editor.off("selectionUpdate", syncOnReady);
    };
  }, [editor]);

  if (items.length === 0) {
    return <ToCEmptyState isExpanded={isExpanded} />;
  }

  const router = useRouter();

  const onItemClick = (e: React.MouseEvent, item: ToCItemData) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editor) {
      console.warn("Editor not available");
      return;
    }

    try {
      let targetElement: HTMLElement | null = null;
      let editorPos: number | null = null;

      // Method 1: Try using the DOM element if available
      if (item.dom && item.dom instanceof HTMLElement) {
        targetElement = item.dom;
        try {
          editorPos = editor.view.posAtDOM(item.dom, 0);
        } catch (e) {
          console.warn("Could not get position from dom", e);
        }
      }

      // Method 2: Try finding by ID
      if (!targetElement) {
        const byId = document.getElementById(item.id);
        if (byId instanceof HTMLElement) {
          targetElement = byId;
          try {
            editorPos = editor.view.posAtDOM(byId, 0);
          } catch (e) {
            console.warn("Could not get position from id element", e);
          }
        }
      }

      // Method 3: Try finding by data-toc-id attribute
      if (!targetElement) {
        const element = editor.view.dom.querySelector(
          `[data-toc-id="${item.id}"]`,
        );

        if (element && element instanceof HTMLElement) {
          targetElement = element;
          try {
            editorPos = editor.view.posAtDOM(element, 0);
          } catch (e) {
            console.warn("Could not get position from data-toc-id element", e);
          }
        }
      }

      // Method 4: Try finding heading by text content
      if (!targetElement) {
        const headings = editor.view.dom.querySelectorAll(
          "h1, h2, h3, h4, h5, h6",
        );
        for (const heading of headings) {
          if (heading.textContent?.trim() === item.textContent.trim()) {
            targetElement = heading as HTMLElement;
            try {
              editorPos = editor.view.posAtDOM(heading, 0);
            } catch (e) {
              console.warn("Could not get position from heading", e);
            }
            break;
          }
        }
      }

      // Method 5: Fallback to using position directly
      if (
        !targetElement &&
        item.pos !== undefined &&
        item.pos >= 0 &&
        item.pos <= editor.state.doc.content.size
      ) {
        editorPos = item.pos;
        try {
          const domAtPos = editor.view.domAtPos(item.pos);
          if (domAtPos && domAtPos.node instanceof HTMLElement) {
            targetElement = domAtPos.node;
          }
        } catch (e) {
          console.warn("Could not get dom at position", e);
        }
      }

      if (editorPos !== null && editorPos >= 0) {
        try {
          const tr = editor.view.state.tr;
          const resolvedPos = tr.doc.resolve(editorPos);
          tr.setSelection(new TextSelection(resolvedPos));

          // Dispatch transaction
          editor.view.dispatch(tr);

          // Force focus with a slight delay to ensure transaction completes
          setTimeout(() => {
            editor.commands.focus();
          }, 10);
        } catch (e) {
          console.warn("Could not update editor selection", e);
        }
      }

      // Scroll to the target element
      if (targetElement) {
        // Set active immediately for instant feedback
        setActiveId(item.id);

        try {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });

          // Adjust for fixed headers
          setTimeout(() => {
            window.scrollBy({ top: -100, behavior: "smooth" });
          }, 300);
        } catch (e) {
          console.warn("scrollIntoView failed, trying alternative", e);

          try {
            const rect = targetElement.getBoundingClientRect();
            const scrollTop =
              window.pageYOffset || document.documentElement.scrollTop;
            const targetY = rect.top + scrollTop - 100;

            window.scrollTo({
              top: targetY,
              behavior: "smooth",
            });
          } catch (e2) {
            console.error("All scroll methods failed", e2);
          }
        }

        // Update URL hash
        setTimeout(() => {
          window.history.replaceState(null, "", `#${item.id}`);
        }, 100);
      } else {
        console.warn("No target element found for item:", item.id);
        window.history.replaceState(null, "", `#${item.id}`);
      }
    } catch (error) {
      console.error("Error in onItemClick:", error);
    }
  };

  // Update items with active state
  const updatedItems = items.map((item) => ({
    ...item,
    isActive: item.id === activeId,
  }));

  return (
    <div
      className={`max-h-[40rem] ${
        isExpanded
          ? "overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          : "overflow-hidden"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="space-y-0.5 py-2">
        {updatedItems.map((item: ToCItemData) => (
          <ToCItem
            onItemClick={onItemClick}
            key={item.id}
            item={item}
            isExpanded={isExpanded}
          />
        ))}
      </div>
    </div>
  );
};

// Compact Floating ToC - Notion Style
interface CompactToCProps {
  items?: ToCItemData[];
  editor: Editor | null;
  onActiveIdChange?: (id: string | null) => void;
}

export const CompactFloatingToC = ({
  items = [],
  editor,
  onActiveIdChange,
}: CompactToCProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-3 top-32 z-50">
      <div
        className={`
          transition-all duration-300 ease-in-out px-0.5 border border-solid rounded-tl-lg bg-background/60 backdrop-blur-xl
          ${isExpanded ? "w-52 border-border " : "w-10 border-transparent"}
        `}
      >
        <div
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
          className="max-h-[40rem] overflow-hidden"
        >
          <ToC
            items={items}
            editor={editor}
            onActiveIdChange={onActiveIdChange}
          />
        </div>
      </div>
    </div>
  );
};
