import { useState } from 'react';
import type { ModuleComponentProps } from './workspace-engine';
import { Button } from '@components/ui/button';
import { Play, Copy, Trash2, Check, Code2 } from 'lucide-react';

const LANGUAGES: Record<string, { label: string; placeholder: string }> = {
  javascript: { label: 'JavaScript', placeholder: '// Write your JavaScript code here\nconsole.log("Hello, World!");' },
  typescript: { label: 'TypeScript', placeholder: '// Write your TypeScript code here\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);' },
  python: { label: 'Python', placeholder: '# Write your Python code here\nprint("Hello, World!")' },
  java: { label: 'Java', placeholder: '// Write your Java code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
  sql: { label: 'SQL', placeholder: '-- Write your SQL query here\nSELECT * FROM users\nWHERE status = \'active\'\nORDER BY created_at DESC;' },
  html: { label: 'HTML', placeholder: '<!-- Write your HTML here -->\n<!DOCTYPE html>\n<html>\n<head><title>Page</title></head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>' },
  css: { label: 'CSS', placeholder: '/* Write your CSS here */\nbody {\n    font-family: sans-serif;\n    margin: 0;\n    padding: 20px;\n}' },
};

export function CodeEditorModule({ moduleKey, config, readOnly, onSave }: ModuleComponentProps) {
  const rawLanguages = config['languages'];
  const languages: string[] = Array.isArray(rawLanguages) ? (rawLanguages as string[]) : ['javascript', 'typescript', 'python'];
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState(languages[0] || 'javascript');
  const [copied, setCopied] = useState(false);

  const lang = (LANGUAGES[language] || LANGUAGES.javascript)!;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setCode('');
  };

  const handleSave = () => {
    onSave?.({ code, language });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Code2 className="h-5 w-5 text-primary-600" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {languages.map((l) => (
              <option key={l} value={l}>{LANGUAGES[l]?.label || l}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" iconOnly onClick={handleCopy} aria-label="Copy code">
            {copied ? <Check className="h-4 w-4 text-accent-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" iconOnly onClick={handleClear} aria-label="Clear code">
            <Trash2 className="h-4 w-4" />
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={handleSave} icon={<Play className="h-4 w-4" />}>
              Save
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-surface-tertiary/50 rounded-l-xl border-r border-border flex flex-col items-center pt-4 text-xs text-text-tertiary font-mono">
          {Array.from({ length: Math.max(code.split('\n').length, 10) }, (_, i) => (
            <span key={i} className="leading-6">{i + 1}</span>
          ))}
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={readOnly}
          placeholder={lang.placeholder}
          rows={15}
          className="w-full pl-14 pr-4 py-3 font-mono text-sm bg-surface-secondary text-text-primary border border-border rounded-xl resize-y focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
          spellCheck={false}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <span>Language: {lang.label}</span>
        <span>{code.length} characters | {code.split('\n').length} lines</span>
      </div>
    </div>
  );
}

export default CodeEditorModule;
