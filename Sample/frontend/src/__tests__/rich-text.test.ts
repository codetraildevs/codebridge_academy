import { describe, it, expect } from 'vitest';
import { htmlToPlainText, richTextPreview } from '@utils/rich-text';

describe('htmlToPlainText', () => {
  it('passes plain text through unchanged', () => {
    expect(htmlToPlainText('SmartPark is a company located in Rubavu District.')).toBe(
      'SmartPark is a company located in Rubavu District.',
    );
  });

  it('strips tags and preserves paragraph breaks', () => {
    const html = '<p>First paragraph.</p><p>Second <strong>paragraph</strong>.</p>';
    expect(htmlToPlainText(html)).toBe('First paragraph.\nSecond paragraph.');
  });

  it('converts list items to separate lines', () => {
    const html = '<ol><li>One</li><li>Two</li></ol>';
    expect(htmlToPlainText(html)).toBe('One\nTwo');
  });

  it('handles empty and null input', () => {
    expect(htmlToPlainText(null)).toBe('');
    expect(htmlToPlainText('')).toBe('');
    expect(htmlToPlainText('   ')).toBe('');
  });

  it('decodes common entities', () => {
    expect(htmlToPlainText('<p>A &amp; B &lt; C &gt; D</p>')).toBe('A & B < C > D');
  });
});

describe('richTextPreview', () => {
  it('truncates long text with an ellipsis', () => {
    expect(richTextPreview('<p>This is a very long scenario text that should be truncated.</p>', 20)).toBe(
      'This is a very long…',
    );
  });

  it('returns short text untouched', () => {
    expect(richTextPreview('<p>Short.</p>', 20)).toBe('Short.');
  });
});
