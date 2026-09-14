import { cn } from '@utils/cn';
import { useTheme, type Theme } from '@hooks/use-theme';
import { Check, Monitor, Moon, Sun } from 'lucide-react';

// ── Mini UI mockup previews (pure SVG) ──────────────────────────────────────

function LightPreview() {
  return (
    <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* window chrome */}
      <rect width="160" height="100" rx="6" fill="#f5f5f4" />
      {/* sidebar */}
      <rect x="0" y="0" width="36" height="100" rx="6" fill="#e7e5e4" />
      <rect x="0" y="0" width="36" height="100" fill="#e7e5e4" />
      {/* sidebar active item */}
      <rect x="6" y="18" width="24" height="6" rx="3" fill="#2965ff" opacity="0.85" />
      {/* sidebar items */}
      <rect x="6" y="32" width="20" height="4" rx="2" fill="#a8a29e" />
      <rect x="6" y="42" width="18" height="4" rx="2" fill="#a8a29e" />
      <rect x="6" y="52" width="22" height="4" rx="2" fill="#a8a29e" />
      {/* traffic lights */}
      <circle cx="10" cy="8" r="2.5" fill="#ff5f57" />
      <circle cx="18" cy="8" r="2.5" fill="#febc2e" />
      <circle cx="26" cy="8" r="2.5" fill="#28c840" />
      {/* main content */}
      <rect x="44" y="14" width="108" height="8" rx="3" fill="#d6d3d1" />
      <rect x="44" y="30" width="108" height="48" rx="4" fill="#fff" />
      <rect x="52" y="38" width="60" height="5" rx="2.5" fill="#d6d3d1" />
      <rect x="52" y="48" width="88" height="4" rx="2" fill="#e7e5e4" />
      <rect x="52" y="57" width="70" height="4" rx="2" fill="#e7e5e4" />
      <rect x="52" y="66" width="44" height="8" rx="4" fill="#2965ff" opacity="0.8" />
    </svg>
  );
}

function SystemPreview() {
  return (
    <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Split: left=dark sidebar, right=light content */}
      <rect width="160" height="100" rx="6" fill="#f5f5f4" />
      {/* sidebar dark */}
      <rect x="0" y="0" width="36" height="100" rx="6" fill="#1a1a1a" />
      <rect x="24" y="0" width="12" height="100" fill="#1a1a1a" />
      {/* traffic lights */}
      <circle cx="10" cy="8" r="2.5" fill="#ff5f57" />
      <circle cx="18" cy="8" r="2.5" fill="#febc2e" />
      <circle cx="26" cy="8" r="2.5" fill="#28c840" />
      {/* sidebar items */}
      <rect x="6" y="18" width="24" height="6" rx="3" fill="#2965ff" opacity="0.9" />
      <rect x="6" y="32" width="20" height="4" rx="2" fill="#444" />
      <rect x="6" y="42" width="18" height="4" rx="2" fill="#444" />
      <rect x="6" y="52" width="22" height="4" rx="2" fill="#444" />
      {/* main content light */}
      <rect x="44" y="14" width="108" height="8" rx="3" fill="#d6d3d1" />
      <rect x="44" y="30" width="108" height="48" rx="4" fill="#fff" />
      <rect x="52" y="38" width="60" height="5" rx="2.5" fill="#d6d3d1" />
      <rect x="52" y="48" width="88" height="4" rx="2" fill="#e7e5e4" />
      <rect x="52" y="57" width="70" height="4" rx="2" fill="#e7e5e4" />
      <rect x="52" y="66" width="44" height="8" rx="4" fill="#2965ff" opacity="0.8" />
    </svg>
  );
}

function DarkPreview() {
  return (
    <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* window chrome */}
      <rect width="160" height="100" rx="6" fill="#0a0a0a" />
      {/* sidebar */}
      <rect x="0" y="0" width="36" height="100" rx="6" fill="#141414" />
      <rect x="24" y="0" width="12" height="100" fill="#141414" />
      {/* traffic lights */}
      <circle cx="10" cy="8" r="2.5" fill="#ff5f57" />
      <circle cx="18" cy="8" r="2.5" fill="#febc2e" />
      <circle cx="26" cy="8" r="2.5" fill="#28c840" />
      {/* sidebar active item */}
      <rect x="6" y="18" width="24" height="6" rx="3" fill="#2965ff" opacity="0.9" />
      <rect x="6" y="32" width="20" height="4" rx="2" fill="#333" />
      <rect x="6" y="42" width="18" height="4" rx="2" fill="#333" />
      <rect x="6" y="52" width="22" height="4" rx="2" fill="#333" />
      {/* main content dark */}
      <rect x="44" y="14" width="108" height="8" rx="3" fill="#222" />
      <rect x="44" y="30" width="108" height="48" rx="4" fill="#1a1a1a" />
      <rect x="52" y="38" width="60" height="5" rx="2.5" fill="#333" />
      <rect x="52" y="48" width="88" height="4" rx="2" fill="#2a2a2a" />
      <rect x="52" y="57" width="70" height="4" rx="2" fill="#2a2a2a" />
      <rect x="52" y="66" width="44" height="8" rx="4" fill="#2965ff" opacity="0.85" />
    </svg>
  );
}

// ── Theme options ─────────────────────────────────────────────────────────────

const THEME_OPTIONS: {
  value: Theme;
  label: string;
  description: string;
  icon: typeof Sun;
  Preview: () => JSX.Element;
}[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Classic light interface',
    icon: Sun,
    Preview: LightPreview,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follows your OS preference',
    icon: Monitor,
    Preview: SystemPreview,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes at night',
    icon: Moon,
    Preview: DarkPreview,
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Section header */}
      <div>
        <h2 className="text-base font-semibold text-text-primary">Interface Theme</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Select or customise your UI theme
        </p>
      </div>

      {/* Theme cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {THEME_OPTIONS.map(({ value, label, description, icon: Icon, Preview }) => {
          const selected = theme === value;
          return (
            <button
              key={value}
              id={`theme-option-${value}`}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all duration-200',
                'hover:shadow-elevation-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                selected
                  ? 'border-primary-500 shadow-elevation-medium'
                  : 'border-border hover:border-border-hover',
              )}
              aria-pressed={selected}
            >
              {/* Preview area */}
              <div
                className={cn(
                  'relative aspect-[8/5] w-full overflow-hidden',
                  'bg-surface-secondary transition-all duration-200',
                  'group-hover:brightness-[1.02]',
                )}
              >
                <div className="absolute inset-0 p-3">
                  <Preview />
                </div>

                {/* Selected check badge */}
                {selected && (
                  <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 shadow-sm animate-scale-in">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                )}
              </div>

              {/* Label row */}
              <div className="flex items-center gap-2.5 border-t border-border bg-white px-4 py-3">
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    selected ? 'text-primary-500' : 'text-text-tertiary',
                  )}
                />
                <div>
                  <p
                    className={cn(
                      'text-sm font-semibold transition-colors',
                      selected ? 'text-primary-600' : 'text-text-primary',
                    )}
                  >
                    {label}
                  </p>
                  <p className="text-[11px] text-text-tertiary leading-tight">{description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Font size / density (coming soon — visual only) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Display Density</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Adjust the spacing of the interface elements
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(['Compact', 'Default', 'Comfortable'] as const).map((density, i) => (
            <button
              key={density}
              id={`density-option-${density.toLowerCase()}`}
              type="button"
              disabled
              className={cn(
                'relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left opacity-50 cursor-not-allowed',
                i === 1 ? 'border-border-hover' : 'border-border',
              )}
            >
              {i === 1 && (
                <span className="absolute right-2 top-2 rounded-full bg-surface-tertiary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Soon
                </span>
              )}
              <div className="flex flex-col gap-0.5">
                {Array.from({ length: i === 0 ? 4 : i === 1 ? 3 : 2 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-1 rounded-full bg-text-tertiary"
                    style={{ width: `${32 - j * 4}px` }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-text-secondary">{density}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AppearanceSettingsPage;
