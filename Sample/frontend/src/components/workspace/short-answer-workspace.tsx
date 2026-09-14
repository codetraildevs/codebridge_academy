interface ShortAnswerWorkspaceProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function ShortAnswerWorkspace({
  value,
  onChange,
  readOnly = false,
  placeholder = 'Type your short answer here...',
}: ShortAnswerWorkspaceProps) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className="w-full border-0 bg-white px-4 py-3.5 text-sm text-text-primary placeholder:text-text-tertiary/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/20"
      />
    </div>
  );
}

export default ShortAnswerWorkspace;
