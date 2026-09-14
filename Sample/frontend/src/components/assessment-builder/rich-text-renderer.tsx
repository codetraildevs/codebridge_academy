import { cn } from '@utils/cn';

/**
 * Matches content that is real TipTap/ProseMirror HTML output — i.e. it starts
 * with a block-level element. Anything else (plain text, inline fragments, or
 * content typed into a plain-text field) is escaped so it can never inject
 * markup.
 */
const BLOCK_HTML_RE = /^\s*<(p|div|h[1-6]|ul|ol|blockquote|pre|table)\b/i;
const HAS_ENTITIES_RE = /&(?:#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos);/i;
const HAS_RAW_TAGS_RE = /<[a-z][\s\S]*>/i;

/**
 * Renders rich-text HTML (produced by the TipTap RichTextEditor) safely.
 *
 * - TipTap output (starts with a block-level tag) is rendered as-is — the
 *   editor only emits known ProseMirror markup.
 * - Already entity-escaped content with no raw tags (e.g. text escaped by the
 *   backend import parser) is rendered as-is — entities can never re-form
 *   elements during HTML parsing.
 * - Anything else (plain text, user-typed descriptions) is HTML-escaped before
 *   rendering so it can never inject markup.
 */
export function RichTextRenderer({
  html,
  className,
}: {
  html?: string | null;
  className?: string;
}) {
  if (!html) return null;

  // Trusted HTML: TipTap output or backend-escaped text.
  if (BLOCK_HTML_RE.test(html)) {
    return <div className={cn('rich-text-render', className)} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (HAS_ENTITIES_RE.test(html) && !HAS_RAW_TAGS_RE.test(html)) {
    return <div className={cn('rich-text-render', className)} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // Untrusted plain text → escape everything before rendering.
  const safe = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return (
    <div
      className={cn('rich-text-render', className)}
      // The text was escaped above, so this is safe
      dangerouslySetInnerHTML={{ __html: `<p>${safe.replace(/\n/g, '<br/>')}</p>` }}
    />
  );
}

export default RichTextRenderer;
