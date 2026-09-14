export function DashboardSkeleton({ role }: { role: string }) {
  const isPlatformOwner = role === 'PLATFORM_OWNER';
  const colCount = isPlatformOwner ? 6 : 5;

  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-surface-tertiary" />
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isPlatformOwner ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
        {Array.from({ length: colCount }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-tertiary" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-surface-tertiary" />
        <div className="h-64 rounded-xl bg-surface-tertiary" />
      </div>
    </div>
  );
}
