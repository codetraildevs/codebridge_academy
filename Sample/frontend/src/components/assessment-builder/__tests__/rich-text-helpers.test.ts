import { describe, it, expect } from 'vitest';
import { hasRichTextContent } from '@components/assessment-builder/rich-text-editor';

describe('hasRichTextContent', () => {
  it('returns false for null, undefined and empty strings', () => {
    expect(hasRichTextContent(null)).toBe(false);
    expect(hasRichTextContent(undefined)).toBe(false);
    expect(hasRichTextContent('')).toBe(false);
  });

  it('returns false for visually-empty TipTap paragraphs', () => {
    expect(hasRichTextContent('<p></p>')).toBe(false);
    expect(hasRichTextContent('<p>&nbsp;</p>')).toBe(false);
    expect(hasRichTextContent('<p></p><p></p>')).toBe(false);
  });

  it('returns true for plain text content', () => {
    expect(hasRichTextContent('Describe the assessment')).toBe(true);
    expect(hasRichTextContent('<p>Describe the assessment</p>')).toBe(true);
  });

  it('returns true for rich-formatted text', () => {
    expect(hasRichTextContent('<p><strong>Bold</strong> text</p>')).toBe(true);
    expect(hasRichTextContent('<ul><li><p>Item</p></li></ul>')).toBe(true);
  });

  it('returns true for image-only content (embedded screenshots/diagrams)', () => {
    const dataUrl =
      '<p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" alt="Embedded image"></p>';
    expect(hasRichTextContent(dataUrl)).toBe(true);
    expect(hasRichTextContent('<p><img src="https://example.com/diagram.png"></p>')).toBe(true);
  });

  it('returns true for tables', () => {
    expect(hasRichTextContent('<table><tbody><tr><td>1</td></tr></tbody></table>')).toBe(true);
  });
});
