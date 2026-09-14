/**
 * Rich-text helpers used by the exam builder (CKEditor 5 scenario / tasks)
 * and everywhere exam content is displayed.
 */

/**
 * Convert HTML to readable plain text. Block elements and list items become
 * line breaks, so multi-paragraph scenarios and numbered tasks stay readable
 * in plain-text contexts (list previews, auto-generated instructions).
 *
 * Falls back to a regex strip when no DOM is available (SSR/build tools).
 */
export function htmlToPlainText(html?: string | null): string {
  if (!html) return '';
  const source = html.trim();
  if (!source) return '';

  // Already plain text — nothing to strip.
  if (!/<[a-z][\s\S]*>/i.test(source)) return source;

  const stripEntities = (s: string) =>
    s
      .replace(/\u00a0/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'");

  if (typeof document === 'undefined') {
    return stripEntities(
      source
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, ''),
    )
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const div = document.createElement('div');
  div.innerHTML = source;
  // <br> becomes a newline, block elements get a trailing newline.
  div.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  div
    .querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, blockquote, tr')
    .forEach((el) => el.append('\n'));

  return stripEntities(div.textContent || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Truncate rich text (HTML or plain) to a short plain-text preview.
 * Used for compact list previews (question sidebars, review summaries).
 */
export function richTextPreview(html?: string | null, maxLength = 60): string {
  const plain = htmlToPlainText(html);
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, Math.max(0, maxLength - 1)).trimEnd() + '…';
}
