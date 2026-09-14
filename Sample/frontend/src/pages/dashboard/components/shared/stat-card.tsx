import { Card } from '@components/ui/card';

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  trend,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  trend?: { value: string; positive: boolean };
  onClick?: () => void;
}) {
  return (
    <Card padding="md" interactive={!!onClick} className="card-hover" onClick={onClick}>
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-secondary truncate">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            {trend && (
              <span className={`text-xs font-medium ${trend.positive ? 'text-success' : 'text-error'}`}>
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
