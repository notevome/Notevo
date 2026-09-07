import { Button } from "@/components/ui/button";
import { PopoverContent } from "@/components/ui/popover";
import { Popover, PopoverTrigger } from "@radix-ui/react-popover";
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Table,
  Columns,
  Rows,
} from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";
import React from "react";

interface TableSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Table Grid Selector Component
const TableGridSelector = ({
  onSelect,
}: {
  onSelect: (rows: number, cols: number) => void;
}) => {
  const [hoveredCell, setHoveredCell] = React.useState({ row: 3, col: 3 });
  const maxRows = 10;
  const maxCols = 10;

  return (
    <div className="p-4">
      <div className="text-sm text-muted-foreground mb-2 text-center font-medium">
        {hoveredCell.row} × {hoveredCell.col}
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}
      >
        {Array.from({ length: maxRows }).map((_, rowIndex) =>
          Array.from({ length: maxCols }).map((_, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`w-6 h-6 border-2 app-radius-lg cursor-pointer transition-colors ${
                rowIndex < hoveredCell.row && colIndex < hoveredCell.col
                  ? "bg-primary border-primary"
                  : "bg-background border-border hover:border-primary/50"
              }`}
              onMouseEnter={() =>
                setHoveredCell({ row: rowIndex + 1, col: colIndex + 1 })
              }
              onClick={() => onSelect(hoveredCell.row, hoveredCell.col)}
            />
          )),
        )}
      </div>
      <div className="mt-3 text-xs text-muted-foreground text-center">
        Click to insert table
      </div>
    </div>
  );
};

export const TableSelector = ({ open, onOpenChange }: TableSelectorProps) => {
  const { editor } = useEditor();
  const [showGrid, setShowGrid] = React.useState(false);

  if (!editor) return null;

  const isInTable = editor.isActive("table");

  const handleTableInsert = (rows: number, cols: number) => {
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
    setShowGrid(false);
    onOpenChange(false);
  };

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="SidebarMenuButton"
          className="gap-2 border-none"
        >
          <Table className="h-4 w-4" />
          <span className="text-sm">Table Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0 bg-accent border-border"
        sideOffset={10}
      >
        {!isInTable ? (
          <div>
            {!showGrid ? (
              <div className="p-2">
                <Button
                  onClick={() => setShowGrid(true)}
                  className="w-full justify-start"
                  variant="ghost"
                >
                  <Table className="h-4 w-4 mr-2" />
                  Insert Table
                </Button>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setShowGrid(false)}
                  className="text-xs text-muted-foreground hover:text-foreground px-4 py-2"
                >
                  ← Back
                </button>
                <TableGridSelector onSelect={handleTableInsert} />
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-0.5 min-w-[200px]">
            <div className="text-sm font-semibold text-foreground mb-1 px-2">
              Table Commands :
            </div>

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().addRowBefore().run();
              }}
            >
              <Button
                size="sm"
                className="w-full justify-start"
                variant="SidebarMenuButton"
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                Add Row Above
              </Button>
            </EditorBubbleItem>

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().addRowAfter().run();
              }}
            >
              <Button
                size="sm"
                className="w-full justify-start"
                variant="SidebarMenuButton"
              >
                <ArrowDown className="w-4 h-4 mr-2" />
                Add Row Below
              </Button>
            </EditorBubbleItem>

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().addColumnBefore().run();
              }}
            >
              <Button
                size="sm"
                className="w-full justify-start"
                variant="SidebarMenuButton"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Add Column Left
              </Button>
            </EditorBubbleItem>

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().addColumnAfter().run();
              }}
            >
              <Button
                size="sm"
                className="w-full justify-start"
                variant="SidebarMenuButton"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Add Column Right
              </Button>
            </EditorBubbleItem>

            <div className="my-1 border-t border-border" />

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().deleteRow().run();
              }}
            >
              <Button
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                variant="SidebarMenuButton"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Row
              </Button>
            </EditorBubbleItem>

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().deleteColumn().run();
              }}
            >
              <Button
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                variant="SidebarMenuButton"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Column
              </Button>
            </EditorBubbleItem>

            <div className="my-1 border-t border-border" />

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().mergeCells().run();
              }}
            >
              <Button
                size="sm"
                className="w-full justify-start"
                variant="SidebarMenuButton"
              >
                <Columns className="w-4 h-4 mr-2" />
                Merge Cells
              </Button>
            </EditorBubbleItem>

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().splitCell().run();
              }}
            >
              <Button
                size="sm"
                className="w-full justify-start"
                variant="SidebarMenuButton"
              >
                <Rows className="w-4 h-4 mr-2" />
                Split Cell
              </Button>
            </EditorBubbleItem>

            <div className="my-1 border-t border-border" />

            <EditorBubbleItem
              onSelect={(editor) => {
                editor.chain().focus().deleteTable().run();
                onOpenChange(false);
              }}
            >
              <Button
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                variant="SidebarMenuButton"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Table
              </Button>
            </EditorBubbleItem>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
