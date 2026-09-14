import { useState, type SVGProps, type ComponentType } from 'react';

// ─── Partner logo file slugs ──────────────────
// Drop logo files into /public/logos/{slug}.svg (or .png) and they'll auto-load.
export const partnerSlugs: Record<string, string> = {
  'Rwanda Polytechnic': 'rwanda-polytechnic',
  'Rwanda TVET Board': 'rwanda-tvet-board',
  'MTN Rwanda': 'mtn-rwanda',
  'CodeBridge Academy': 'codebridge-academy',
  'NESA': 'nesa',
  'IPRC Kigali': 'iprc-kigali',
};

// ─── Hybrid logo component ───────────────────
// Tries real image first, falls back to inline SVG
interface PartnerLogoProps {
  slug: string;
  fallback: ComponentType<{ className?: string }>;
  className?: string;
}

export function PartnerLogoImage({ slug, fallback: FallbackSvg, className }: PartnerLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <FallbackSvg className={className} />;
  }

  return (
    <img
      src={`/logos/${slug}.svg`}
      alt=""
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

// ─── Fallback inline SVGs ────────────────────
// These display when the real logo file hasn't been added yet

interface LogoProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

export function RwandaPolytechnicLogo({ className, ...props }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M24 4L8 12v10c0 10.5 6.5 20.3 16 22 9.5-1.7 16-11.5 16-22V12L24 4z" fill="#2563EB" opacity="0.12" />
      <path d="M24 6L10 13v9c0 9.5 5.8 18.3 14 20 8.2-1.7 14-10.5 14-20V13L24 6z" fill="none" stroke="#2563EB" strokeWidth="1.5" />
      <path d="M18 20h12v4c0 3-2 6-6 6s-6-3-6-6v-4z" fill="#2563EB" opacity="0.2" />
      <path d="M18 20h3v4c0 2 1.3 4 3 4s3-2 3-4v-4h3" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="24" y="16" textAnchor="middle" fill="#2563EB" fontSize="10" fontWeight="bold" fontFamily="Arial">RP</text>
      <path d="M16 30l8-4 8 4" stroke="#2563EB" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M16 30v3" stroke="#2563EB" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function RwandaTVETBoardLogo({ className, ...props }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M24 6l3.5 7.5 8.5 1-6 5.5L32 28l-8-4-8 4 2-8-6-5.5 8.5-1L24 6z" fill="#059669" opacity="0.12" />
      <path d="M24 6l3.5 7.5 8.5 1-6 5.5L32 28l-8-4-8 4 2-8-6-5.5 8.5-1L24 6z" stroke="#059669" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
      <circle cx="24" cy="16" r="3" fill="#059669" opacity="0.2" />
      <path d="M19 26c0-3 1.8-5 5-5s5 2 5 5" stroke="#059669" strokeWidth="1" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="22" r="2" fill="#059669" opacity="0.3" />
      <text x="24" y="38" textAnchor="middle" fill="#059669" fontSize="6" fontWeight="bold" fontFamily="Arial">RTB</text>
    </svg>
  );
}

export function MTNRwandaLogo({ className, ...props }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Yellow oval background — MTN's signature shape */}
      <rect x="8" y="12" width="32" height="24" rx="12" fill="#FFC107" opacity="0.2" />
      <rect x="8" y="12" width="32" height="24" rx="12" stroke="#FFC107" strokeWidth="1.5" opacity="0.5" />
      {/* MTN bold text */}
      <text x="24" y="30" textAnchor="middle" fill="#7C3AED" fontSize="16" fontWeight="900" fontFamily="Arial, sans-serif">MTN</text>
    </svg>
  );
}

export function CodeBridgeLogo({ className, ...props }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M8 34c0-8 3-14 16-14s16 6 16 14" stroke="#2563EB" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <line x1="16" y1="34" x2="16" y2="28" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="32" y1="34" x2="32" y2="28" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" />
      <text x="18" y="20" fill="#2563EB" fontSize="11" fontWeight="bold" fontFamily="monospace" opacity="0.4">&lt;/&gt;</text>
      <line x1="20" y1="16" x2="28" y2="16" stroke="#2563EB" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="12" y1="34" x2="36" y2="34" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      <circle cx="24" cy="12" r="2" fill="#2563EB" opacity="0.4" />
    </svg>
  );
}

export function NESALogo({ className, ...props }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="24" cy="24" r="16" fill="#059669" opacity="0.08" />
      <circle cx="24" cy="24" r="16" stroke="#059669" strokeWidth="1.2" opacity="0.3" />
      <circle cx="24" cy="24" r="13" stroke="#059669" strokeWidth="0.5" opacity="0.2" />
      <rect x="18" y="18" width="12" height="12" rx="1" stroke="#059669" strokeWidth="1" fill="none" transform="rotate(45 24 24)" opacity="0.3" />
      <path d="M20 14h8v6c0 4-2 8-4 9-2-1-4-5-4-9v-6z" stroke="#059669" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      <path d="M20 22l3 3 5-5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="24" cy="6" r="1" fill="#059669" opacity="0.3" />
      <circle cx="24" cy="42" r="1" fill="#059669" opacity="0.3" />
    </svg>
  );
}

export function IPRCKigaliLogo({ className, ...props }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="24" cy="24" r="12" stroke="#7C3AED" strokeWidth="1.2" opacity="0.25" fill="none" />
      <circle cx="24" cy="24" r="6" stroke="#7C3AED" strokeWidth="1" opacity="0.3" fill="none" />
      <line x1="24" y1="10" x2="24" y2="14" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="34" x2="24" y2="38" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="24" x2="14" y2="24" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="34" y1="24" x2="38" y2="24" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="14" x2="17" y2="17" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="31" y1="31" x2="34" y2="34" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="34" x2="17" y2="31" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="31" y1="17" x2="34" y2="14" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill="#7C3AED" opacity="0.4" />
      <text x="18" y="44" fill="#7C3AED" fontSize="6" fontWeight="bold" fontFamily="Arial" opacity="0.3">IPRC</text>
    </svg>
  );
}

// ─── Fallback map (used when real image files don't exist yet) ──
export const fallbackLogos: Record<string, ComponentType<{ className?: string }>> = {
  'Rwanda Polytechnic': RwandaPolytechnicLogo,
  'Rwanda TVET Board': RwandaTVETBoardLogo,
  'MTN Rwanda': MTNRwandaLogo,
  'CodeBridge Academy': CodeBridgeLogo,
  'NESA': NESALogo,
  'IPRC Kigali': IPRCKigaliLogo,
};
