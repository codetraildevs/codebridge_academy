import type { ComponentType } from 'react';
import { useState } from 'react';
import { CodeEditorModule } from './code-editor-module';
import { ErdDesignerModule } from './erd-designer-module';
import { SqlRunnerModule } from './sql-runner-module';
import { DiagramViewerModule } from './diagram-viewer-module';
import { FileUploaderModule } from './file-uploader-module';
import { TextEditorModule } from './text-editor-module';
import { NetworkTopologyModule } from './network-topology-module';
import { FlowchartBuilderModule } from './flowchart-builder-module';
import { PresentationModule } from './presentation-module';
import { UmlDesignerModule } from './uml-designer-module';
import { Card } from '@components/ui/card';
import { Puzzle, Code2, Database, Terminal, ImageIcon, Upload, FileText, Network, GitBranch, Presentation, Shapes, Loader2 } from 'lucide-react';

// ── Types ──────────────────────────────────────

export interface ModuleComponentProps {
  moduleKey: string;
  config: Record<string, unknown>;
  assessmentId?: string;
  taskId?: string;
  onSave?: (data: unknown) => void;
  readOnly?: boolean;
}

export interface AssignedModule {
  assessmentId: string;
  workspaceModuleId: string;
  orderIndex: number;
  config: Record<string, unknown> | null;
  workspaceModule: {
    id: string;
    moduleKey: string;
    name: string;
    description: string | null;
    iconUrl: string | null;
    configSchema: Record<string, unknown> | null;
    isActive: boolean;
  };
}

export interface WorkspaceModuleConfig {
  moduleKey: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
}

// ── Module Registry ────────────────────────────

interface ModuleEntry {
  component: ComponentType<ModuleComponentProps>;
  icon: ComponentType<{ className?: string }>;
}

const MODULE_REGISTRY: Record<string, ModuleEntry> = {
  CODE_EDITOR: { component: CodeEditorModule, icon: Code2 },
  ERD_DESIGNER: { component: ErdDesignerModule, icon: Database },
  SQL_RUNNER: { component: SqlRunnerModule, icon: Terminal },
  DIAGRAM_VIEWER: { component: DiagramViewerModule, icon: ImageIcon },
  FILE_UPLOADER: { component: FileUploaderModule, icon: Upload },
  TEXT_EDITOR: { component: TextEditorModule, icon: FileText },
  NETWORK_TOPOLOGY: { component: NetworkTopologyModule, icon: Network },
  FLOWCHART_BUILDER: { component: FlowchartBuilderModule, icon: GitBranch },
  PRESENTATION: { component: PresentationModule, icon: Presentation },
  UML_DESIGNER: { component: UmlDesignerModule, icon: Shapes },
};

// ── Fallback Component ─────────────────────────

function ModuleFallback({ moduleKey, name, description }: { moduleKey: string; name?: string; description?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Puzzle className="h-12 w-12 text-text-tertiary" />
      <h3 className="mt-4 text-base font-medium text-text-primary">
        {name || moduleKey.replace(/_/g, ' ')}
      </h3>
      {description && <p className="mt-1 max-w-md text-sm text-text-secondary">{description}</p>}
      <p className="mt-2 text-xs text-text-tertiary">Workspace module &quot;{moduleKey}&quot; is not yet implemented</p>
    </div>
  );
}

// ── Workspace Engine ───────────────────────────

interface WorkspaceEngineProps {
  modules: AssignedModule[];
  assessmentId?: string;
  taskId?: string;
  onModuleSave?: (moduleKey: string, data: unknown) => void;
  readOnly?: boolean;
  activeModuleIndex?: number;
  onModuleChange?: (index: number) => void;
  loading?: boolean;
}

export function WorkspaceEngine({
  modules,
  assessmentId,
  taskId,
  onModuleSave,
  readOnly = false,
  activeModuleIndex: controlledIndex,
  onModuleChange,
  loading = false,
}: WorkspaceEngineProps) {
  const sortedModules = [...modules].sort((a, b) => a.orderIndex - b.orderIndex);
  const hasControlledIndex = controlledIndex !== undefined;
  const [localIndex, setLocalIndex] = useState(0);
  const currentIndex = hasControlledIndex ? controlledIndex : localIndex;
  const currentModule = sortedModules[currentIndex];
  const entry = currentModule ? MODULE_REGISTRY[currentModule.workspaceModule.moduleKey] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (sortedModules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Puzzle className="h-16 w-16 text-text-tertiary" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">No workspace modules assigned</h3>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          This assessment does not have any workspace modules configured. Add modules in the assessment builder.
        </p>
      </div>
    );
  }

  const handleModuleChange = (index: number) => {
    if (hasControlledIndex && onModuleChange) {
      onModuleChange(index);
    } else {
      setLocalIndex(index);
    }
  };

  return (
    <div className="space-y-4">
      {/* Module Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sortedModules.map((mod, idx) => {
          const modEntry = MODULE_REGISTRY[mod.workspaceModule.moduleKey];
          const Icon = modEntry?.icon || Puzzle;
          return (
            <button
              key={mod.workspaceModuleId}
              onClick={() => handleModuleChange(idx)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                idx === currentIndex
                  ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                  : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary border border-transparent'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{mod.workspaceModule.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active Module */}
      {currentModule && (
        <Card variant="outlined" className="!p-0 overflow-hidden">
          {/* Module Header */}
          <div className="border-b border-border px-5 py-3 bg-surface-secondary/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {entry && <entry.icon className="h-5 w-5 text-primary-600" />}
                <h3 className="text-sm font-semibold text-text-primary">{currentModule.workspaceModule.name}</h3>
                {currentModule.workspaceModule.description && (
                  <span className="text-xs text-text-tertiary hidden sm:inline">— {currentModule.workspaceModule.description}</span>
                )}
              </div>
              <span className="text-xs text-text-tertiary">
                Module {currentIndex + 1} of {sortedModules.length}
              </span>
            </div>
          </div>

          {/* Module Content */}
          <div className="p-5">
            {entry ? (
              <entry.component
                moduleKey={currentModule.workspaceModule.moduleKey}
                config={(currentModule.config || currentModule.workspaceModule.configSchema || {}) as Record<string, unknown>}
                assessmentId={assessmentId}
                taskId={taskId}
                onSave={(data) => onModuleSave?.(currentModule.workspaceModule.moduleKey, data)}
                readOnly={readOnly}
              />
            ) : (
              <ModuleFallback
                moduleKey={currentModule.workspaceModule.moduleKey}
                name={currentModule.workspaceModule.name}
                description={currentModule.workspaceModule.description}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default WorkspaceEngine;
