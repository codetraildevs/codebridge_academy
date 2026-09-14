import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@utils/cn';
import 'ckeditor5/ckeditor5-content.css';

/**
 * Sanitized rich-text renderer for exam Scenario / Tasks content.
 *
 * Exam content is stored as rich-text HTML (produced by the TinyMCE editor
 * or AI-parsed documents). This component sanitizes it with DOMPurify before
 * rendering (defense in depth — content can also come from AI-parsed
 * documents) and wraps the output in the `.ck-content` class so the CKEditor
 * content stylesheet styles the standard HTML tags consistently.
 */

export interface RichTextViewProps {
  html?: string | null;
  className?: string;
}

export function RichTextView({ html, className }: RichTextViewProps) {
  const sanitized = useMemo(() => {
    if (!html) return '';
    return DOMPurify.sanitize(html);
  }, [html]);

  if (!sanitized.trim()) return null;

  return (
    <div
      className={cn('ck-content text-sm leading-relaxed text-text-primary', className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

export default RichTextView;
