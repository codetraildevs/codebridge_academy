import { useState } from 'react';
import type { ModuleComponentProps } from './workspace-engine';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Shapes, Plus, Trash2 } from 'lucide-react';

const DIAGRAM_TYPES = ['class', 'sequence', 'use_case', 'activity'];

export function UmlDesignerModule({ moduleKey, config, readOnly }: ModuleComponentProps) {
  const rawDiagramTypes = config?.diagramTypes;
  const diagramTypes: string[] = Array.isArray(rawDiagramTypes) ? (rawDiagramTypes as string[]) : DIAGRAM_TYPES;
  const [diagramType, setDiagramType] = useState(diagramTypes[0] || 'class');
  const [code, setCode] = useState(`@startuml\nclass User {\n  + name: String\n  + email: String\n  + login(): void\n}\n@enduml`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shapes className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-text-primary">UML Designer</span>
          <Badge size="sm" variant="info">PlantUML</Badge>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {diagramTypes.map((type) => (
          <button
            key={type}
            onClick={() => {
              setDiagramType(type);
              const examples: Record<string, string> = {
                class: '@startuml\nclass User {\n  + name: String\n  + email: String\n  + login(): void\n}\nclass Admin extends User {\n  + manageUsers(): void\n}\n@enduml',
                sequence: '@startuml\nactor User\nparticipant "Web App" as Web\nparticipant "API Server" as API\ndatabase "Database" as DB\n\nUser -> Web: Login\nWeb -> API: authenticate()\nAPI -> DB: query user\nDB --> API: user data\nAPI --> Web: token\nWeb --> User: dashboard\n@enduml',
                use_case: '@startuml\nleft to right direction\nactor "Customer" as C\nrectangle "Online Store" {\n  C --> (Browse Products)\n  C --> (Place Order)\n  C --> (Track Delivery)\n  (Place Order) .> (Login) : includes\n  (Place Order) .> (Make Payment) : extends\n}\n@enduml',
                activity: '@startuml\nstart\n:User logs in;\nif (Valid credentials?) then (yes)\n  :Show dashboard;\n  :Display user data;\nelse (no)\n  :Show error;\n  :Retry login;\nendif\nstop\n@enduml',
              };
              setCode(examples[type] || code);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              diagramType === type
                ? 'bg-primary-50 text-primary-700 border border-primary-200'
                : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary border border-border'
            }`}
          >
            {type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">PlantUML Code</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={18}
            className="w-full px-3 py-2 font-mono text-xs bg-surface-secondary text-text-primary border border-border rounded-xl resize-y focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            spellCheck={false}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-text-tertiary mb-1">Preview</label>
          <div className="w-full min-h-[380px] px-4 py-4 bg-white border border-border rounded-xl flex items-center justify-center">
            <div className="text-center">
              <Shapes className="h-8 w-8 text-primary-400 mx-auto mb-2" />
              <p className="text-xs text-text-tertiary">PlantUML diagram rendering</p>
              <p className="text-xs text-text-tertiary mt-1">(Install PlantUML for live preview)</p>
              <pre className="mt-4 text-left text-[10px] text-text-secondary max-h-40 overflow-y-auto bg-surface-secondary p-2 rounded-lg">
                {code.slice(0, 200)}
                {code.length > 200 ? '...' : ''}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UmlDesignerModule;
