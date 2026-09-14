import { useState, useRef, useEffect } from 'react';
import { cn } from '@utils/cn';
import { ChevronDown, Search } from 'lucide-react';

interface CountryCode {
  code: string;
  dial: string;
  flag: string;
}

const COUNTRIES: CountryCode[] = [
  { code: 'RW', dial: '+250', flag: '🇷🇼' },
  { code: 'KE', dial: '+254', flag: '🇰🇪' },
  { code: 'UG', dial: '+256', flag: '🇺🇬' },
  { code: 'TZ', dial: '+255', flag: '🇹🇿' },
  { code: 'NG', dial: '+234', flag: '🇳🇬' },
  { code: 'GH', dial: '+233', flag: '🇬🇭' },
  { code: 'ZA', dial: '+27', flag: '🇿🇦' },
  { code: 'US', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', flag: '🇬🇧' },
  { code: 'FR', dial: '+33', flag: '🇫🇷' },
  { code: 'DE', dial: '+49', flag: '🇩🇪' },
  { code: 'IN', dial: '+91', flag: '🇮🇳' },
  { code: 'AE', dial: '+971', flag: '🇦🇪' },
  { code: 'CD', dial: '+243', flag: '🇨🇩' },
  { code: 'BI', dial: '+257', flag: '🇧🇮' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function PhoneInput({ value, onChange, onBlur, error, placeholder = '7XX XXX XXX', label, required }: PhoneInputProps) {
  const [country, setCountry] = useState<CountryCode>(COUNTRIES[0]!);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = COUNTRIES.filter(
    (c) => c.code.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search),
  );

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-[13px] font-medium text-[#000100]">
          {label}
          {required && <span className="ml-0.5 text-[#b8b8b8]" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="flex">
        {/* Country code selector */}
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
              'flex h-full items-center gap-1.5 rounded-l-lg border border-r-0 px-3 py-2.5 text-[14px]',
              'bg-white transition-all duration-150',
              'hover:border-[#b8b8b8] focus:outline-none',
              error ? 'border-[#dc2626]' : 'border-[#b8b8b8]/50',
            )}
          >
            <span className="text-[15px]">{country.flag}</span>
            <span className="text-[13px] text-[#000100] font-medium">{country.dial}</span>
            <ChevronDown className="h-3 w-3 text-[#b8b8b8]" />
          </button>

          {open && (
            <div className="absolute top-full left-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-[#b8b8b8]/30 bg-white shadow-lg">
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b8b8b8]" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-md border border-[#b8b8b8]/30 bg-[#f5f5f5] py-1.5 pl-8 pr-2 text-[13px] text-[#000100] placeholder:text-[#b8b8b8] focus:outline-none focus:ring-1 focus:ring-[#000100]/20"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {filtered.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { setCountry(c); setOpen(false); setSearch(''); }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                      country.code === c.code ? 'bg-[#f5f5f5] text-[#000100]' : 'text-[#000100] hover:bg-[#f5f5f5]',
                    )}
                  >
                    <span className="text-[15px]">{c.flag}</span>
                    <span className="flex-1">{c.code}</span>
                    <span className="text-[#b8b8b8]">{c.dial}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Phone number input */}
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(country.dial + ' ' + e.target.value.replace(country.dial, '').trim())}
          onBlur={onBlur}
          placeholder={placeholder}
          className={cn(
            'block w-full rounded-r-lg border bg-white px-3 py-2.5 text-[14px] text-[#000100]',
            'placeholder:text-[#b8b8b8]',
            'transition-all duration-150 ease-out',
            'focus:outline-none focus:ring-1 focus:ring-[#000100]/20 focus:border-[#000100]',
            'hover:border-[#b8b8b8]',
            error
              ? 'border-[#dc2626] focus:ring-[#dc2626]/20 focus:border-[#dc2626] hover:border-[#dc2626]'
              : 'border-[#b8b8b8]/50',
          )}
        />
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-[12px] text-[#dc2626]" role="alert">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
