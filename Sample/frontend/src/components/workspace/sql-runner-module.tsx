import { useState } from 'react';
import type { ModuleComponentProps } from './workspace-engine';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Terminal, Play, RotateCcw, Table2 } from 'lucide-react';

const SAMPLE_RESULTS: Record<string, unknown>[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', created_at: '2026-01-15' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', created_at: '2026-02-20' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', created_at: '2026-03-10' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', created_at: '2026-04-05' },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'Viewer', created_at: '2026-05-18' },
];

export function SqlRunnerModule({ moduleKey, config, readOnly }: ModuleComponentProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = () => {
    if (!query.trim()) return;
    setRunning(true);
    setError(null);

    // Simulate query execution
    setTimeout(() => {
      try {
        if (query.toLowerCase().includes('select')) {
          setResults(SAMPLE_RESULTS);
        } else if (query.toLowerCase().includes('insert') || query.toLowerCase().includes('update') || query.toLowerCase().includes('delete')) {
          setResults([{ affected_rows: '1', status: 'Query executed successfully' }] as Record<string, unknown>[]);
        } else {
          setResults([{ message: 'Query executed', rows_affected: '0' }] as Record<string, unknown>[]);
        }
      } catch {
        setError('Query execution failed. Check your syntax.');
        setResults(null);
      }
      setRunning(false);
    }, 800);
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setError(null);
  };

  const columns = results && results.length > 0 ? Object.keys(results[0]!) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-text-primary">SQL Query Runner</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClear} icon={<RotateCcw className="h-4 w-4" />}>Clear</Button>
          <Button size="sm" onClick={handleRun} loading={running} icon={<Play className="h-4 w-4" />}>Run Query</Button>
        </div>
      </div>

      {/* Query Editor */}
      <div className="relative">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your SQL query here...&#10;Example: SELECT * FROM users WHERE status = 'active';"
          rows={6}
          className="w-full px-4 py-3 font-mono text-sm bg-surface-secondary text-text-primary border border-border rounded-xl resize-y focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          spellCheck={false}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 rounded-lg bg-error-light/10 border border-error/20 text-sm text-error">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-text-tertiary" />
            <span className="text-xs text-text-tertiary">Results: {results.length} row(s)</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-tertiary/50">
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider border-b border-border">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  <tr key={idx} className="border-b border-border last:border-b-0 hover:bg-surface-tertiary/30">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-2 text-sm text-text-primary whitespace-nowrap">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!results && !error && (
        <div className="flex items-center justify-center py-6 text-sm text-text-tertiary">
          Write a query and click Run to see results
        </div>
      )}
    </div>
  );
}

export default SqlRunnerModule;
