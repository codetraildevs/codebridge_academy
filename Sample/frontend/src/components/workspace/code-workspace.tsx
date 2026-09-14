import { useState } from 'react';

interface CodeWorkspaceProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  language?: string;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'plaintext', label: 'Plain Text' },
];

export function CodeWorkspace({ value, onChange, readOnly = false, language: initialLang }: CodeWorkspaceProps) {
  const [language, setLanguage] = useState(initialLang || 'plaintext');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const lineCount = value.split('\n').length;

  return (
    <div className="flex flex-col rounded-xl border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-surface-secondary px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-error" />
            <div className="h-3 w-3 rounded-full bg-warning" />
            <div className="h-3 w-3 rounded-full bg-accent-500" />
          </div>
          <span className="ml-3 text-xs font-medium text-text-tertiary">code-editor</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-md border border-border bg-white px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
            disabled={readOnly}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          {!readOnly && (
            <button
              onClick={handleCopy}
              className="rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-surface-tertiary transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex bg-white">
        {/* Line numbers */}
        <div className="select-none border-r border-border bg-surface-secondary px-2 py-3 text-right text-xs leading-5 text-text-tertiary font-mono min-w-[3rem]">
          {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code area */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className="flex-1 resize-none border-0 bg-white px-4 py-3 font-mono text-sm leading-5 text-text-primary placeholder:text-text-tertiary/60 focus:outline-none"
          placeholder="Write your code here..."
          spellCheck={false}
          style={{ minHeight: '200px', tabSize: 2 }}
        />
      </div>
    </div>
  );
}

export default CodeWorkspace;
