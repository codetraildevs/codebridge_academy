import { useState } from 'react';
import type { ModuleComponentProps } from './workspace-engine';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { FileText, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Save } from 'lucide-react';

export function TextEditorModule({ moduleKey, config, readOnly, onSave }: ModuleComponentProps) {
  const maxLength = (config?.maxLength as number) || 10000;
  const wordLimit = (config?.wordLimit as number) || 2000;
  const [content, setContent] = useState('');

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const handleSave = () => {
    onSave?.({ content, wordCount, charCount, type: 'text' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-text-primary">Text Editor</span>
          <Badge size="sm" variant={wordCount > wordLimit * 0.9 ? 'warning' : 'neutral'}>
            {wordCount}/{wordLimit} words
          </Badge>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={handleSave} icon={<Save className="h-4 w-4" />}>Save</Button>
        )}
      </div>

      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 px-3 py-2 bg-surface-secondary border border-border rounded-t-xl">
          {[
            { icon: Bold, label: 'Bold' },
            { icon: Italic, label: 'Italic' },
            { icon: Underline, label: 'Underline' },
            { icon: null, separator: true },
            { icon: List, label: 'Bullet List' },
            { icon: ListOrdered, label: 'Numbered List' },
            { icon: null, separator: true },
            { icon: AlignLeft, label: 'Align Left' },
            { icon: AlignCenter, label: 'Center' },
            { icon: AlignRight, label: 'Align Right' },
          ].map((item, idx) =>
            item.separator ? (
              <div key={`sep-${idx}`} className="w-px h-5 bg-border mx-1" />
            ) : (
              <button
                key={idx}
                className="p-1.5 rounded-md text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                title={item.label}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
              </button>
            ),
          )}
        </div>
      )}

      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
        disabled={readOnly}
        placeholder="Write your response here... Double-click to start typing."
        rows={14}
        className="w-full px-4 py-3 text-sm bg-white text-text-primary border border-border rounded-b-xl resize-y focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed"
      />

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <span>{charCount} / {maxLength} characters</span>
        <span>{wordCount} words · ~{Math.ceil(wordCount / 200)} min read</span>
      </div>
    </div>
  );
}

export default TextEditorModule;
