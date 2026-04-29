export const ShortcutBadge = ({ keys }: { keys: string }) => (
  <span className="ml-2 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-semibold text-secondary-foreground">
    {keys}
  </span>
);
