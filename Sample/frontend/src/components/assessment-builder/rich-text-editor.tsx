import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { useEffect, useCallback } from 'react';
import { cn } from '@utils/cn';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  RemoveFormatting,
  ImagePlus,
  Image as ImageIcon,
} from 'lucide-react';

/** Cap for images embedded as base64 data URLs (keeps DB rows reasonable). */
const MAX_IMAGE_BYTES = 2_500_000; // ~2.4 MB
const MAX_IMAGE_MB = Math.round(MAX_IMAGE_BYTES / 1_000_000);

/** Reads an image file into a base64 data URL (for screenshots/diagrams). */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}

/** Returns the first image file in a FileList, if any. */
function findImageFile(files: FileList | null | undefined): File | null {
  if (!files) return null;
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) return file;
  }
  return null;
}

// ── Toolbar button ──────────────────────────────

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
        active
          ? 'bg-primary-100 text-primary-700'
          : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  );
}

// ── MenuBar ─────────────────────────────────────

function MenuBar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter link URL', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const pickImageFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > MAX_IMAGE_BYTES) {
        window.alert(`Image is too large. Max size is ${MAX_IMAGE_MB} MB.`);
        return;
      }
      void fileToDataUrl(file).then((src) => {
        editor.chain().focus().setImage({ src, alt: 'Embedded image' }).run();
      });
    };
    input.click();
  }, [editor]);

  const insertImageUrl = useCallback(() => {
    const url = window.prompt('Enter image URL', 'https://');
    if (!url || url === 'https://') return;
    editor.chain().focus().setImage({ src: url, alt: 'Embedded image' }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border border-b-0 border-border bg-surface-secondary px-2 py-1.5">
      {/* Formatting */}
      <ToolbarButton title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Headings */}
      <ToolbarButton title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Lists */}
      <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Alignment */}
      <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Link + images */}
      <ToolbarButton title="Insert link" active={editor.isActive('link')} onClick={setLink}>
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Insert image from your device" onClick={pickImageFile}>
        <ImagePlus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Insert image from URL" onClick={insertImageUrl}>
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* History */}
      <ToolbarButton title="Undo" disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton title="Redo" disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────

/**
 * TipTap emits `<p></p>` (or `<p>&nbsp;</p>`) for visually empty content.
 * Returns true only when the HTML contains actual visible text, so callers can
 * avoid storing empty paragraphs as "real" content.
 */
export function hasRichTextContent(html: string | null | undefined): boolean {
  if (!html) return false;
  // Content that is only media/structural nodes (e.g. a screenshot embedded as
  // an <img>) has no extractable text but is still real content — don't drop it.
  if (/<(img|table|video|audio)\b/i.test(html)) return true;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
  return text.length > 0;
}

// ── Main component ──────────────────────────────

export interface RichTextEditorProps {
  value?: string | null;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  /** Focus the editor on mount (e.g. click-to-edit cells). */
  autoFocus?: boolean;
}

/**
 * Professional rich-text editor (TipTap, MIT) with a CKEditor-style toolbar.
 * Used for Scenario, Task, Checklist, Expected Output and Description content
 * in the assessment builder. Images (screenshots / diagrams) can be embedded
 * via the toolbar, pasted from the clipboard, or dragged & dropped — local
 * files are stored inline as base64 data URLs.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = 160,
  className,
  autoFocus = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    autofocus: autoFocus ? 'end' : false,
    extensions: [
      // StarterKit v3 bundles link/underline itself — disable them there and
      // register the explicitly-configured extensions below (otherwise TipTap
      // warns about duplicate extension names).
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Image.configure({ allowBase64: true, HTMLAttributes: { class: 'rich-text-image' } }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rich-text-content focus:outline-none',
      },
      handlePaste: (view, event) => {
        const imageFile = findImageFile(event.clipboardData?.files);
        if (!imageFile) return false;
        if (imageFile.size > MAX_IMAGE_BYTES) {
          window.alert(`Image is too large. Max size is ${MAX_IMAGE_MB} MB.`);
          return true;
        }
        void fileToDataUrl(imageFile).then((src) => {
          const imageType = view.state.schema.nodes.image;
          if (!imageType) return;
          const node = imageType.create({ src, alt: 'Embedded image' });
          view.dispatch(view.state.tr.replaceSelectionWith(node));
        });
        return true;
      },
      handleDrop: (view, event) => {
        const imageFile = findImageFile(event.dataTransfer?.files);
        if (!imageFile) return false;
        if (imageFile.size > MAX_IMAGE_BYTES) {
          window.alert(`Image is too large. Max size is ${MAX_IMAGE_MB} MB.`);
          return true;
        }
        event.preventDefault();
        void fileToDataUrl(imageFile).then((src) => {
          const imageType = view.state.schema.nodes.image;
          if (!imageType) return;
          const node = imageType.create({ src, alt: 'Embedded image' });
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
          const pos = coords?.pos ?? view.state.selection.from;
          view.dispatch(view.state.tr.insert(pos, node));
        });
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange?.(current.getHTML());
    },
  });

  // Sync external value changes (e.g. loading a different assessment draft)
  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value || '');
    }
  }, [editor, value]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-white transition-all duration-200',
        'focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20',
        className,
      )}
    >
      {editor && <MenuBar editor={editor} />}
      <EditorContent
        editor={editor}
        className="rich-text-editor px-4 py-3"
        style={{ minHeight }}
      />
    </div>
  );
}

export default RichTextEditor;
