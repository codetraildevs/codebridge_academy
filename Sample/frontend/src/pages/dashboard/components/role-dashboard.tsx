import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import type { RoleDashboardData } from '@services/dashboard-service';
import {
  Activity,
  TrendingUp,
  ExternalLink,
  FileEdit,
  FileCheck,
  ListChecks,
  ClipboardList,
  Clock,
  CheckCircle2,
  Shield,
  AlertTriangle,
  GraduationCap,
  Award,
  Play,
  Search,
  BarChart3,
  Plus,
} from 'lucide-react';
import { StatCard } from './shared/stat-card';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileEdit, FileCheck, ListChecks, ClipboardList, Clock, CheckCircle2, Shield,
  AlertTriangle, GraduationCap, Award, Play, Search, BarChart3, Plus,
};

export function RoleDashboard({ data }: { data: RoleDashboardData }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">{data.welcomeMessage}</p>
      </div>

      {data.stats.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.stats.map((stat, idx) => {
            const IconComp = iconMap[stat.icon] || TrendingUp;
            const colors: Array<{ color: string; bg: string }> = [
              { color: 'text-primary-600', bg: 'bg-primary-50' },
              { color: 'text-secondary-600', bg: 'bg-secondary-50' },
              { color: 'text-accent-600', bg: 'bg-accent-50' },
              { color: 'text-info', bg: 'bg-info-light' },
            ];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const ci = colors[idx % colors.length]!;
            return (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={IconComp}
                color={ci.color}
                bgColor={ci.bg}
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardBody>
            {data.recentItems.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Activity className="h-10 w-10 text-text-tertiary mb-2" />
                <p className="text-sm text-text-secondary">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-tertiary transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">{item.title}</p>
                      <p className="text-xs text-text-tertiary">{item.subtitle}</p>
                    </div>
                    {item.status && <Badge variant="info" size="sm">{item.status}</Badge>}
                    {item.timestamp && <span className="text-xs text-text-tertiary shrink-0">{item.timestamp}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {data.quickActions.map((action) => {
              const IconComp = iconMap[action.icon] || ExternalLink;
              return (
                <Button
                  key={action.label}
                  fullWidth
                  variant="secondary"
                  icon={<IconComp className="h-4 w-4" />}
                  onClick={() => navigate(action.path)}
                >
                  {action.label}
                </Button>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
