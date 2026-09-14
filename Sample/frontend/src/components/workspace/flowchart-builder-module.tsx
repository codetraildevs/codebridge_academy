import { useState } from 'react';
import type { ModuleComponentProps } from './workspace-engine';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { GitBranch, Plus, Trash2, Circle, Square, Diamond, ArrowRight, FileInput, FileOutput } from 'lucide-react';

const NODE_TYPES = [
  { key: 'start_end', label: 'Start/End', icon: Circle },
  { key: 'process', label: 'Process', icon: Square },
  { key: 'decision', label: 'Decision', icon: Diamond },
  { key: 'input_output', label: 'Input/Output', icon: FileInput },
  { key: 'connector', label: 'Connector', icon: ArrowRight },
];

interface FlowNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
}

export function FlowchartBuilderModule({ moduleKey, config, readOnly }: ModuleComponentProps) {
  const maxNodes = (config?.maxNodes as number) || 50;
  const [nodes, setNodes] = useState<FlowNode[]>([]);

  const addNode = (type: string) => {
    if (nodes.length >= maxNodes) return;
    setNodes([...nodes, {
      id: `node-${Date.now()}`,
      type,
      label: `${type.replace(/_/g, ' ')} ${nodes.length + 1}`,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
    }]);
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
  };

  const getNodeShape = (type: string) => {
    switch (type) {
      case 'start_end': return 'rounded-full';
      case 'process': return 'rounded-lg';
      case 'decision': return 'rotate-45';
      case 'input_output': return 'rounded-none border-l-0 border-r-0';
      default: return 'rounded-lg';
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'start_end': return 'border-green-400 bg-green-50';
      case 'process': return 'border-blue-400 bg-blue-50';
      case 'decision': return 'border-yellow-400 bg-yellow-50';
      case 'input_output': return 'border-purple-400 bg-purple-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-text-primary">Flowchart Builder</span>
          <Badge size="sm" variant="info">{nodes.length}/{maxNodes} nodes</Badge>
        </div>
      </div>

      {/* Node Palette */}
      {!readOnly && (
        <div className="flex gap-2 flex-wrap">
          {NODE_TYPES.map((nt) => (
            <Button
              key={nt.key}
              variant="secondary"
              size="sm"
              onClick={() => addNode(nt.key)}
              disabled={nodes.length >= maxNodes}
              icon={<nt.icon className="h-4 w-4" />}
            >
              {nt.label}
            </Button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="relative min-h-[300px] bg-surface-secondary border-2 border-border rounded-xl overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" className="text-border/50" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid2)" />
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute group cursor-move"
            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className={`px-4 py-2 border-2 ${getNodeColor(node.type)} shadow-sm whitespace-nowrap text-xs font-medium text-text-primary ${getNodeShape(node.type)}`}>
              {node.label}
            </div>
            {!readOnly && (
              <button
                onClick={() => removeNode(node.id)}
                className="absolute -top-2 -right-2 p-0.5 bg-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-text-tertiary">Add flowchart nodes from the palette above</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlowchartBuilderModule;
