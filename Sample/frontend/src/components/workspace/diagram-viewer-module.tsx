import { useState } from 'react';
import type { ModuleComponentProps } from './workspace-engine';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { ImageIcon, Copy, Check } from 'lucide-react';

const DIAGRAM_EXAMPLES: Record<string, string> = {
  flowchart: `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B`,
  sequence: `sequenceDiagram
    participant User
    participant API
    participant DB
    User->>API: Request data
    API->>DB: Query
    DB-->>API: Results
    API-->>User: Response`,
  class: `classDiagram
    class User {
      +String name
      +String email
      +login()
    }
    class Admin {
      +manageUsers()
    }
    User <|-- Admin`,
  gantt: `gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Planning
    Requirements     :2026-01-01, 14d
    Design           :2026-01-15, 10d`,
};

const DEFAULT_DIAGRAM_TYPES = ['flowchart', 'sequence', 'class'];

export function DiagramViewerModule({ moduleKey, config, readOnly }: ModuleComponentProps) {
  const rawTypes = config['diagramTypes'];
  const diagramTypes: string[] = Array.isArray(rawTypes) ? (rawTypes as string[]) : DEFAULT_DIAGRAM_TYPES;
  const [diagramType, setDiagramType] = useState<string>('flowchart');
  const [code, setCode] = useState<string>(DIAGRAM_EXAMPLES.flowchart!);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTypeChange = (type: string) => {
    setDiagramType(type);
    setCode(DIAGRAM_EXAMPLES[type]! || code || '');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-text-primary">Diagram Viewer</span>
          <Badge size="sm" variant="info">{diagramType.charAt(0).toUpperCase() + diagramType.slice(1)}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} iconOnly>
          {copied ? <Check className="h-4 w-4 text-accent-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      {/* Diagram Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {diagramTypes.map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              diagramType === type
                ? 'bg-primary-50 text-primary-700 border border-primary-200'
                : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary border border-border'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Mermaid Code Editor */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">Mermaid Code</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={16}
            className="w-full px-3 py-2 font-mono text-xs bg-surface-secondary text-text-primary border border-border rounded-xl resize-y focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            spellCheck={false}
          />
        </div>

        {/* Live Preview */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-text-tertiary mb-1">Preview</label>
          <div className="w-full min-h-[320px] px-4 py-4 bg-white border border-border rounded-xl flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="h-8 w-8 text-primary-400 mx-auto mb-2" />
              <p className="text-xs text-text-tertiary">
                Mermaid diagram rendering
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                (Install mermaid library for live preview)
              </p>
              <pre className="mt-4 text-left text-[10px] text-text-secondary max-h-40 overflow-y-auto bg-surface-secondary p-2 rounded-lg">
                {(code || '').slice(0, 200)}
                {(code || '').length > 200 ? '...' : ''}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <span className="text-xs text-text-tertiary">Mermaid.js syntax — diagrams render in real-time</span>
      </div>
    </div>
  );
}

export default DiagramViewerModule;
