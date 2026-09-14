import { useState } from 'react';

interface EssayWorkspaceProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  wordLimit?: number;
}

export function EssayWorkspace({ value, onChange, readOnly = false, wordLimit }: EssayWorkspaceProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;
  const [formatting, setFormatting] = useState(false);

  const handleBold = () => {
    // Simple bold markdown-like wrapping for selected text
    const textarea = document.getElementById('essay-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        const selected = value.substring(start, end);
        const newValue = value.substring(0, start) + `**${selected}**` + value.substring(end);
        onChange(newValue);
      }
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-surface-secondary px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1">
          <button
            onClick={handleBold}
            className="rounded-md px-2 py-1 text-xs font-bold text-text-secondary hover:bg-surface-tertiary transition-colors"
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <span className="text-border">|</span>
          <button
            onClick={() => setFormatting(!formatting)}
            className="rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-surface-tertiary transition-colors"
          >
            {formatting ? 'Hide Tips' : 'Formatting Tips'}
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span>{charCount} chars</span>
          {wordLimit && (
            <span className={wordCount > wordLimit ? 'text-error font-medium' : ''}>
              {wordCount}/{wordLimit} words
            </span>
          )}
        </div>
      </div>

      {formatting && (
        <div className="bg-info-light/30 px-3 py-2 border-b border-border">
          <p className="text-xs text-info-dark">
            <strong>Markdown supported:</strong> **bold** *italic* `code` [links](url) - bullet lists
          </p>
        </div>
      )}

      {/* Editor */}
      <textarea
        id="essay-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="w-full resize-y border-0 bg-white px-4 py-3 text-sm leading-6 text-text-primary placeholder:text-text-tertiary/60 focus:outline-none"
        placeholder="Write your essay response here... You can use Markdown formatting for structure."
        style={{ minHeight: '250px' }}
      />
    </div>
  );
}

export default EssayWorkspace;
