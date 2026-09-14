export function RefetchIndicator({ isFetching }: { isFetching: boolean }) {
  if (!isFetching) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
      Syncing...
    </div>
  );
}
