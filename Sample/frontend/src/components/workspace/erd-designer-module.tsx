import { useState } from 'react';
import type { ModuleComponentProps } from './workspace-engine';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Card } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Database, Plus, Trash2, Download, GripHorizontal } from 'lucide-react';

interface Entity {
  id: string;
  name: string;
  attributes: Attribute[];
}

interface Attribute {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

const DATA_TYPES = ['UUID', 'VARCHAR', 'INT', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'TEXT', 'FLOAT', 'BIGINT'];

let attrCounter = 0;
let entityCounter = 0;

function newId(prefix: string) {
  if (prefix === 'attr') {
    attrCounter += 1;
    return `attr-${attrCounter}-${Date.now()}`;
  }
  entityCounter += 1;
  return `entity-${entityCounter}-${Date.now()}`;
}

export function ErdDesignerModule({ moduleKey, config, readOnly, onSave }: ModuleComponentProps) {
  const maxEntities = (config?.maxEntities as number) || 20;
  const [entities, setEntities] = useState<Entity[]>([]);
  const [newEntityName, setNewEntityName] = useState('');

  const addEntity = () => {
    if (!newEntityName.trim() || entities.length >= maxEntities) return;
    setEntities([...entities, {
      id: newId('entity'),
      name: newEntityName.trim(),
      attributes: [{ id: newId('attr'), name: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false }],
    }]);
    setNewEntityName('');
  };

  const removeEntity = (entityId: string) => {
    setEntities(entities.filter((e) => e.id !== entityId));
  };

  const addAttribute = (entityId: string) => {
    setEntities(entities.map((e) =>
      e.id === entityId
        ? { ...e, attributes: [...e.attributes, { id: newId('attr'), name: '', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false }] }
        : e,
    ));
  };

  const updateAttribute = (entityId: string, attrId: string, updates: Partial<Attribute>) => {
    setEntities(entities.map((e) =>
      e.id === entityId
        ? { ...e, attributes: e.attributes.map((a) => (a.id === attrId ? { ...a, ...updates } : a)) }
        : e,
    ));
  };

  const removeAttribute = (entityId: string, attrId: string) => {
    setEntities(entities.map((e) =>
      e.id === entityId
        ? { ...e, attributes: e.attributes.filter((a) => a.id !== attrId) }
        : e,
    ));
  };

  const handleSave = () => {
    onSave?.({ entities, type: 'ERD' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-text-primary">Entity-Relationship Diagram</span>
          <Badge size="sm" variant="info">{entities.length}/{maxEntities} entities</Badge>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={handleSave} icon={<Download className="h-4 w-4" />}>Save Diagram</Button>
        )}
      </div>

      {/* Add Entity */}
      {!readOnly && entities.length < maxEntities && (
        <div className="flex gap-2">
          <Input
            value={newEntityName}
            onChange={(e) => setNewEntityName(e.target.value)}
            placeholder="Entity name (e.g., User, Product, Order)"
            onKeyDown={(e) => e.key === 'Enter' && addEntity()}
            fullWidth
          />
          <Button onClick={addEntity} disabled={!newEntityName.trim()} icon={<Plus className="h-4 w-4" />}>Add Entity</Button>
        </div>
      )}

      {/* Entities Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {entities.map((entity) => (
          <Card key={entity.id} variant="outlined" padding="sm" className="border-t-4 border-t-primary-500">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <GripHorizontal className="h-4 w-4 text-text-tertiary" />
                <span className="font-mono font-semibold text-sm text-text-primary">{entity.name}</span>
              </div>
              {!readOnly && (
                <Button variant="ghost" size="xs" iconOnly onClick={() => removeEntity(entity.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-error" />
                </Button>
              )}
            </div>

            <div className="space-y-1 border-t border-border pt-2">
              {entity.attributes.map((attr) => (
                <div key={attr.id} className="flex items-center gap-1.5 text-xs">
                  {!readOnly ? (
                    <>
                      <input
                        type="text"
                        value={attr.name}
                        onChange={(e) => updateAttribute(entity.id, attr.id, { name: e.target.value })}
                        className="flex-1 px-1.5 py-0.5 border border-border rounded text-xs font-mono focus:border-primary-500 focus:outline-none"
                        placeholder="attr_name"
                      />
                      <select
                        value={attr.type}
                        onChange={(e) => updateAttribute(entity.id, attr.id, { type: e.target.value })}
                        className="w-20 px-1 py-0.5 border border-border rounded text-xs"
                      >
                        {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <label className="flex items-center gap-0.5 cursor-pointer">
                        <input type="checkbox" checked={attr.isPrimaryKey} onChange={(e) => updateAttribute(entity.id, attr.id, { isPrimaryKey: e.target.checked })} className="h-3 w-3" />
                        <span className="text-[10px]">PK</span>
                      </label>
                      <label className="flex items-center gap-0.5 cursor-pointer">
                        <input type="checkbox" checked={attr.isForeignKey} onChange={(e) => updateAttribute(entity.id, attr.id, { isForeignKey: e.target.checked })} className="h-3 w-3" />
                        <span className="text-[10px]">FK</span>
                      </label>
                      <Button variant="ghost" size="xs" iconOnly onClick={() => removeAttribute(entity.id, attr.id)}>
                        <Trash2 className="h-3 w-3 text-error" />
                      </Button>
                    </>
                  ) : (
                    <span className="font-mono text-text-primary">
                      {attr.isPrimaryKey && <span className="text-yellow-600 font-bold">PK </span>}
                      {attr.isForeignKey && <span className="text-blue-600 font-bold">FK </span>}
                      {attr.name || 'unnamed'} <span className="text-text-tertiary">{attr.type}</span>
                    </span>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button
                  onClick={() => addAttribute(entity.id)}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 mt-1"
                >
                  <Plus className="h-3 w-3" /> Add attribute
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {entities.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <Database className="h-12 w-12 text-text-tertiary" />
          <p className="mt-2 text-sm text-text-secondary">Add entities to start building your ER diagram</p>
        </div>
      )}
    </div>
  );
}

export default ErdDesignerModule;
