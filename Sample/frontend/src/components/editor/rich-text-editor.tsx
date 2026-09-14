import { useEffect, useRef, useState } from 'react';
import { cn } from '@utils/cn';

/**
 * TinyMCE rich text editor wrapper used for the exam Scenario and Tasks.
 *
 * TinyMCE is self-hosted from the `tinymce` npm package and loaded lazily
 * (dynamic import) so it is split out of the main bundle. The DOM model,
 * silver theme, icons and the plugins we use are registered alongside the
 * core; the skin/content CSS is bundled too (`skin: false`,
 * `content_css: false`), so nothing is fetched from Tiny Cloud at runtime.
 *
 * If TinyMCE cannot start (e.g. jsdom-based tests or restricted browsers),
 * the component degrades gracefully to a styled <textarea> so flows never
 * break. The fallback carries `aria-label={placeholder}`, which the tests use
 * to type into the editors.
 *
 * NOTE: `licenseKey: 'gpl'` — the npm build is distributed under the GPL-2.0
 * license; TinyMCE 7+ shows a dialog unless a license key is provided.
 */

type TinyModule = {
  // The @tinymce/tinymce-react Editor class — typed loosely so the wrapper's
  // strict propTypes don't leak into every editor usage.
  Editor: any;
};

let tinyModulePromise: Promise<TinyModule> | null = null;

function loadTinyModule(): Promise<TinyModule> {
  if (!tinyModulePromise) {
    tinyModulePromise = (async () => {
      // Importing the core first registers `window.tinymce`, which the React
      // wrapper detects (so it never falls back to the Tiny Cloud script).
      const core = await import('tinymce/tinymce');
      (window as any).tinymce = core.default;

      const [reactMod] = await Promise.all([
        import('@tinymce/tinymce-react'),
        // Register the DOM model, silver theme, icons and plugins. Every
        // plugin listed in the init config must be registered here.
        import('tinymce/models/dom/model'),
        import('tinymce/themes/silver/theme'),
        import('tinymce/icons/default/icons'),
        import('tinymce/plugins/lists'),
        import('tinymce/plugins/link'),
        import('tinymce/plugins/code'),
        import('tinymce/plugins/autolink'),
        // Self-hosted skin + content styles — bundled with the app.
        import('tinymce/skins/ui/oxide/skin.css'),
        import('tinymce/skins/content/default/content.css'),
      ]);

      return { Editor: reactMod.Editor };
    })();
  }
  return tinyModulePromise;
}

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum editor height in px (used by both TinyMCE and the fallback). */
  minHeight?: number;
  /** Compact variant for inline/task editing (smaller padding + min-height). */
  compact?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 180,
  compact = false,
}: RichTextEditorProps) {
  const [mod, setMod] = useState<TinyModule | null>(null);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  const editorRef = useRef<any>(null);
  // Latest value, readable from onInit (which fires after mount) so a value
  // that changed before the editor finished initialising is still applied.
  const latestValue = useRef(value);
  latestValue.current = value;

  // TinyMCE cannot initialise in jsdom — render the textarea fallback there
  // deterministically (the component tests rely on the fallback).
  const isTestEnv = import.meta.env.MODE === 'test';

  useEffect(() => {
    mounted.current = true;
    // TinyMCE cannot initialise in jsdom — skip loading entirely in tests.
    if (isTestEnv) {
      return () => {
        mounted.current = false;
      };
    }
    loadTinyModule()
      .then((m) => {
        if (mounted.current) setMod(m);
      })
      .catch(() => {
        if (mounted.current) setFailed(true);
      });
    return () => {
      mounted.current = false;
    };
  }, [isTestEnv]);

  // Keep the editor in sync when `value` changes externally (e.g. after a
  // document parse) without fighting the user's own typing.
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value !== editor.getContent()) {
      editor.setContent(value || '');
    }
  }, [value]);

  const fallback = (
    <textarea
      aria-label={placeholder}
      className={cn(
        'block w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary/70 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 hover:border-border-hover',
        compact && 'rounded-lg px-3 py-2 text-xs',
      )}
      style={{ minHeight }}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  if (!mod || failed || isTestEnv) return fallback;

  const { Editor } = mod;

  return (
    <div
      className={cn('rich-text-editor', compact && 'rich-text-editor--compact')}
      style={{ '--rich-text-min-height': `${minHeight}px` } as React.CSSProperties}
      aria-label={placeholder}
    >
      <Editor
        licenseKey="gpl"
        onInit={(_evt: unknown, editor: any) => {
          editorRef.current = editor;
          if (editor.getContent() !== latestValue.current) {
            editor.setContent(latestValue.current || '');
          }
        }}
        initialValue={value}
        onEditorChange={(html: string) => onChange(html)}
        init={{
          menubar: false,
          branding: false,
          promotion: false,
          statusbar: false,
          plugins: 'lists link code autolink',
          toolbar:
            'undo redo | blocks | bold italic underline strikethrough code | bullist numlist | blockquote link',
          skin: false,
          content_css: false,
          min_height: minHeight,
          placeholder,
          content_style:
            'body { font-family: inherit; font-size: 14px; line-height: 1.7; margin: 0; }',
        }}
      />
    </div>
  );
}

export default RichTextEditor;
