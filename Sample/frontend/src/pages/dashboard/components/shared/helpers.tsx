import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`;
}

export function severityColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'ERROR': case 'HIGH': case 'CRITICAL': return 'bg-error';
    case 'WARNING': case 'MEDIUM': return 'bg-warning';
    default: return 'bg-info';
  }
}

export function SeverityIcon({ severity }: { severity: string }) {
  switch (severity.toUpperCase()) {
    case 'ERROR': case 'CRITICAL': return <AlertTriangle className="h-3.5 w-3.5" />;
    case 'WARNING': return <AlertTriangle className="h-3.5 w-3.5" />;
    default: return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
}
