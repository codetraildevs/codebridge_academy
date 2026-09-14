// TinyMCE ships its core types, but the runtime chunks (DOM model, silver
// theme, icons, plugins) are plain JS files. These declarations let the
// side-effect-only dynamic imports in rich-text-editor.tsx typecheck.
declare module 'tinymce/models/dom/model';
declare module 'tinymce/themes/silver/theme';
declare module 'tinymce/icons/default/icons';
declare module 'tinymce/plugins/lists';
declare module 'tinymce/plugins/link';
declare module 'tinymce/plugins/code';
declare module 'tinymce/plugins/autolink';
