import { EditorBubble, removeAIHighlight, useEditor } from "novel";
import { Fragment, type ReactNode, useEffect } from "react";
import { Button } from "../ui/button";
import Magic from "../ui/icons/magic";
import { AISelector } from "./ai-selector";

interface GenerativeMenuSwitchProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editorBubblePlacement?: Boolean;
}
const GenerativeMenuSwitch = ({
  children,
  open,
  onOpenChange,
  editorBubblePlacement,
}: GenerativeMenuSwitchProps) => {
  const { editor } = useEditor();
  useEffect(() => {
    if (!open && editor) removeAIHighlight(editor);
  }, [open, editor]);
  return (
    <EditorBubble
      tippyOptions={{
        placement: editorBubblePlacement
          ? "bottom-start"
          : open
            ? "bottom-start"
            : "top",
        onHidden: () => {
          onOpenChange(false);
          editor?.chain().unsetHighlight().run();
        },
      }}
      className="flex w-fit max-w-[80vw] h-fit p-0.5 overflow-hidden rounded-tl-lg bg-muted border border-border shadow-xl"
    >
      {open && <AISelector open={open} onOpenChange={onOpenChange} />}
      {!open && (
        <Fragment>
          {/* <Button
            className="gap-1 rounded-none border-none"
            variant="SidebarMenuButton"
            onClick={() => onOpenChange(true)}
            size="sm"
            disabled={true}
          >
          </Button> */}
          {children}
        </Fragment>
      )}
    </EditorBubble>
  );
};

export default GenerativeMenuSwitch;
