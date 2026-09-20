export const ShortcutBadge = ({ keys }: { keys: string }) => (
  <span className="app-radius-sm bg-secondary px-1.5 py-px mt-px text-[10px] font-mono font-semibold text-secondary-foreground">
    {keys}
  </span>
);
