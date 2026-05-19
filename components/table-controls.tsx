"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Editor } from "@tiptap/core";
import {
  Plus,
  Trash2,
  ChevronDown,
  Copy,
  ArrowUp,
  ArrowDown,
  Palette,
  X,
} from "lucide-react";
import { Button } from "./ui/button";

interface TableControlsProps {
  editor: Editor;
}

interface ActiveCell {
  element: HTMLElement;
  rowIndex: number;
  colIndex: number;
  table: HTMLTableElement;
}

interface MenuState {
  show: boolean;
  x: number;
  y: number;
}

const highlightColors = [
  { name: "Default", value: "" },
  { name: "Purple", value: "var(--novel-highlight-purple)" },
  { name: "Red", value: "var(--novel-highlight-red)" },
  { name: "Yellow", value: "var(--novel-highlight-yellow)" },
  { name: "Blue", value: "var(--novel-highlight-blue)" },
  { name: "Green", value: "var(--novel-highlight-green)" },
  { name: "Orange", value: "var(--novel-highlight-orange)" },
  { name: "Pink", value: "var(--novel-highlight-pink)" },
  { name: "Gray", value: "var(--novel-highlight-gray)" },
];

export const TableControls = ({ editor }: TableControlsProps) => {
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [menu, setMenu] = useState<MenuState>({ show: false, x: 0, y: 0 });

  const menuRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  const focusCell = useCallback(
    (cell: HTMLElement) => {
      try {
        const pos = editor.view.posAtDOM(cell, 0);
        editor.chain().focus().setTextSelection(pos).run();
      } catch (_) {}
    },
    [editor],
  );

  const focusRow = useCallback(
    (table: HTMLTableElement, rowIndex: number) => {
      const rows = Array.from(table.querySelectorAll("tr"));
      const cell = rows[rowIndex]?.querySelector(
        "th, td",
      ) as HTMLElement | null;
      if (cell) focusCell(cell);
    },
    [focusCell],
  );

  const focusCol = useCallback(
    (table: HTMLTableElement, colIndex: number) => {
      const cell = table.querySelector(
        `tr:first-child > *:nth-child(${colIndex + 1})`,
      ) as HTMLElement | null;
      if (cell) focusCell(cell);
    },
    [focusCell],
  );

  useEffect(() => {
    if (!editor) return;
    const editorEl = editor.view.dom;

    const handleClick = (e: MouseEvent) => {
      if (
        pillRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      )
        return;

      const target = e.target as HTMLElement;
      const cell = target.closest("th, td") as HTMLElement | null;

      if (!cell || !cell.closest(".ProseMirror")) {
        setActiveCell(null);
        setMenu({ show: false, x: 0, y: 0 });
        return;
      }

      const table = cell.closest("table") as HTMLTableElement | null;
      if (!table) return;

      const rows = Array.from(
        table.querySelectorAll("tr"),
      ) as HTMLTableRowElement[];
      let rowIndex = -1;
      let colIndex = -1;
      rows.forEach((row, ri) => {
        const cells = Array.from(row.querySelectorAll("th, td"));
        const ci = cells.indexOf(cell);
        if (ci !== -1) {
          rowIndex = ri;
          colIndex = ci;
        }
      });

      if (rowIndex === -1) return;

      setActiveCell({ element: cell, rowIndex, colIndex, table });
      setMenu({ show: false, x: 0, y: 0 });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveCell(null);
        setMenu({ show: false, x: 0, y: 0 });
      }
    };

    editorEl.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      editorEl.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor]);

  // Hide pill and menu when the user scrolls
  useEffect(() => {
    if (!activeCell) return;
    const handleScroll = () => {
      setActiveCell(null);
      setMenu({ show: false, x: 0, y: 0 });
    };
    window.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });
    return () =>
      window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [activeCell]);

  // Close full menu on outside click
  useEffect(() => {
    if (!menu.show) return;
    const handle = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        pillRef.current?.contains(e.target as Node)
      )
        return;
      setMenu({ show: false, x: 0, y: 0 });
    };
    const id = setTimeout(
      () => document.addEventListener("mousedown", handle),
      0,
    );
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handle);
    };
  }, [menu.show]);

  if (!activeCell) return null;

  const { element: cellEl, rowIndex, colIndex, table } = activeCell;
  const rows = Array.from(
    table.querySelectorAll("tr"),
  ) as HTMLTableRowElement[];
  const cols = rows[0] ? Array.from(rows[0].querySelectorAll("th, td")) : [];

  const cellRect = cellEl.getBoundingClientRect();

  // Pill floats to the right of the cell, vertically centred
  const pillX = cellRect.right + window.scrollX + -65;
  const pillY = cellRect.top + window.scrollY + cellRect.height / 2 - 14;

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let mx = btnRect.left + window.scrollX;
    let my = btnRect.bottom + window.scrollY + 4;
    if (mx + 260 > window.innerWidth + window.scrollX)
      mx -= 260 - btnRect.width;
    setMenu({ show: true, x: mx, y: my });
  };

  const quickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    focusRow(table, rowIndex);
    editor.chain().focus().addRowAfter().run();
  };

  const closeAll = () => {
    setActiveCell(null);
    setMenu({ show: false, x: 0, y: 0 });
  };

  const closeMenu = () => setMenu({ show: false, x: 0, y: 0 });

  const withRow = (fn: () => void) => {
    focusRow(table, rowIndex);
    fn();
    closeMenu();
  };
  const withCol = (fn: () => void) => {
    focusCol(table, colIndex);
    fn();
    closeMenu();
  };
  const withCell = (fn: () => void) => {
    focusCell(cellEl);
    fn();
    closeMenu();
  };

  const pill = (
    <div
      ref={pillRef}
      className="fixed flex items-center gap-0.5 bg-muted border border-border rounded-tl-md shadow-md px-0.5 py-0.5 z-[9998]"
      style={{ left: pillX, top: pillY }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        title="Add row below"
        aria-label="Add row below"
        onClick={quickAdd}
        className=" w-6 h-6 "
        size="icon"
      >
        <Plus className="w-3.5 h-3.5 " />
      </Button>
      <Button
        variant="ghost"
        title="Cell options"
        aria-label="Cell options"
        onClick={openMenu}
        className=" w-6 h-6"
        size="icon"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  const fullMenu = menu.show && (
    <div
      ref={menuRef}
      className="fixed bg-muted border border-border rounded-lg py-2 px-1 w-[320px] z-[9999] shadow-xl animate-in fade-in-0 zoom-in-95 overflow-y-auto max-h-[80vh] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 flex items-center justify-between mb-0.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Cell Actions
        </span>
        <button
          onClick={closeMenu}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className=" w-full flex justify-between items-center">
        <div>
          {/* ROW */}
          <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
            Row
          </p>
          <Button
            onClick={() =>
              withRow(() => editor.chain().focus().addRowBefore().run())
            }
            variant="SidebarMenuButton"
            className="w-full justify-start px-4 py-2 h-auto"
          >
            <ArrowUp className="w-4 h-4 mr-2" /> Insert Above
          </Button>
          <Button
            onClick={() =>
              withRow(() => editor.chain().focus().addRowAfter().run())
            }
            variant="SidebarMenuButton"
            className="w-full justify-start px-4 py-2 h-auto"
          >
            <ArrowDown className="w-4 h-4 mr-2" /> Insert Below
          </Button>
          <Button
            onClick={() =>
              withRow(() => editor.chain().focus().addRowAfter().run())
            }
            variant="SidebarMenuButton"
            className="w-full justify-start px-4 py-2 h-auto"
          >
            <Copy className="w-4 h-4 mr-2" /> Duplicate
          </Button>
          {rows.length > 1 && (
            <Button
              onClick={() =>
                withRow(() => editor.chain().focus().deleteRow().run())
              }
              variant="SidebarMenuButton_destructive"
              className="w-full justify-start px-4 py-2 h-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Row
            </Button>
          )}
        </div>
        <div>
          {/* COLUMN */}
          <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Column
          </p>
          <Button
            onClick={() =>
              withCol(() => editor.chain().focus().addColumnBefore().run())
            }
            variant="SidebarMenuButton"
            className="w-full justify-start px-4 py-2 h-auto"
          >
            <ArrowUp className="w-4 h-4 mr-2 -rotate-90" /> Insert Left
          </Button>
          <Button
            onClick={() =>
              withCol(() => editor.chain().focus().addColumnAfter().run())
            }
            variant="SidebarMenuButton"
            className="w-full justify-start px-4 py-2 h-auto"
          >
            <ArrowDown className="w-4 h-4 mr-2 -rotate-90" /> Insert Right
          </Button>
          <Button
            onClick={() =>
              withCol(() => editor.chain().focus().addColumnAfter().run())
            }
            variant="SidebarMenuButton"
            className="w-full justify-start px-4 py-2 h-auto"
          >
            <Copy className="w-4 h-4 mr-2" /> Duplicate
          </Button>
          {cols.length > 1 && (
            <Button
              onClick={() =>
                withCol(() => editor.chain().focus().deleteColumn().run())
              }
              variant="SidebarMenuButton_destructive"
              className="w-full justify-start px-4 py-2 h-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Column
            </Button>
          )}
        </div>
      </div>

      <div className="h-px bg-border my-1.5 mx-2" />

      {/* CELL COLOR */}
      <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
        <Palette className="w-3 h-3" /> Cell Background
      </p>
      <div className="px-3 py-2">
        <div className="grid grid-cols-9 gap-1">
          {highlightColors.map((color) => (
            <button
              key={color.name}
              title={color.name}
              className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
              style={{
                backgroundColor: color.value || "transparent",
                borderColor: color.value ? "transparent" : "#888",
              }}
              onClick={() =>
                withCell(() =>
                  editor
                    .chain()
                    .focus()
                    .setCellAttribute("backgroundColor", color.value)
                    .run(),
                )
              }
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-border my-1.5 mx-2" />

      {/* TABLE */}
      <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
        Table
      </p>
      <Button
        onClick={() => {
          editor.chain().focus().deleteTable().run();
          closeAll();
        }}
        variant="SidebarMenuButton_destructive"
        className="w-full justify-start px-4 py-2 h-auto"
      >
        <Trash2 className="w-4 h-4 mr-2" /> Delete Table
      </Button>
    </div>
  );

  return createPortal(
    <>
      {pill}
      {fullMenu}
    </>,
    document.body,
  );
};
