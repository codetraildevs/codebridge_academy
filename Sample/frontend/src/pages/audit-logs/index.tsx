import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Shield, Search, Filter, Download, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const mockLogs = [
  { id: '1', action: 'Organization created: RwandaTech Solutions', user: 'Platform Owner', severity: 'INFO', timestamp: '2 hours ago' },
  { id: '2', action: 'Subscription plan updated: Professional', user: 'Platform Owner', severity: 'INFO', timestamp: '5 hours ago' },
  { id: '3', action: 'Failed login attempt: admin@test.com', user: null, severity: 'WARNING', timestamp: '1 day ago' },
  { id: '4', action: 'User account deactivated: candidate@example.com', user: 'Organization Admin', severity: 'INFO', timestamp: '2 days ago' },
  { id: '5', action: 'Exam published: SWD Final Assessment', user: 'Exam Designer', severity: 'INFO', timestamp: '3 days ago' },
];

function severityIcon(severity: string) {
  switch (severity) {
    case 'ERROR':
    case 'CRITICAL':
      return AlertTriangle;
    case 'WARNING':
      return AlertTriangle;
    default:
      return CheckCircle2;
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case 'ERROR':
    case 'CRITICAL':
      return 'text-error';
    case 'WARNING':
      return 'text-warning';
    default:
      return 'text-info';
  }
}

function severityBg(severity: string) {
  switch (severity) {
    case 'ERROR':
    case 'CRITICAL':
      return 'bg-error-light';
    case 'WARNING':
      return 'bg-warning-light';
    default:
      return 'bg-info-light';
  }
}

export function AuditLogsPage() {
  const [search, setSearch] = useState('');

  const filtered = mockLogs.filter((log) =>
    log.action.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Audit Logs</h1>
          <p className="mt-1 text-sm text-text-secondary">
            View system activity, security events, and access logs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={<Filter className="h-4 w-4" />}>
            Filters
          </Button>
          <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />}>
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit logs..."
              className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </CardBody>
      </Card>

      <Card className="!p-0">
        <div className="divide-y divide-border">
          {filtered.map((log) => {
            const SevIcon = severityIcon(log.severity);
            return (
              <div
                key={log.id}
                className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-secondary"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${severityBg(log.severity)}`}>
                  <SevIcon className={`h-4 w-4 ${severityColor(log.severity)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">{log.action}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {log.user && (
                      <span className="text-xs font-medium text-text-tertiary">{log.user}</span>
                    )}
                    <span className="text-xs text-text-tertiary">{log.timestamp}</span>
                  </div>
                </div>
                <Badge variant={log.severity === 'WARNING' ? 'warning' : 'info'} size="sm">
                  {log.severity}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default AuditLogsPage;
