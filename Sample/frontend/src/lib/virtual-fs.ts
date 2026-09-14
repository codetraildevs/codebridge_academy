// ── Virtual File System ──────────────────────────────
// In-memory file system for the dynamic workspace
// Supports: directories, files, CRUD operations, tree view

export interface FSNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FSNode[];
  size?: number;
  language?: string;
  lastModified: number;
}

export type FileChangeCallback = (nodes: FSNode[]) => void;

const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  php: 'php',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  txt: 'plaintext',
  env: 'plaintext',
  gitignore: 'plaintext',
  dockerfile: 'dockerfile',
  conf: 'plaintext',
  cfg: 'plaintext',
  ini: 'plaintext',
  toml: 'plaintext',
};

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const name = filename.toLowerCase();
  if (name === 'dockerfile') return 'dockerfile';
  if (name === 'makefile') return 'makefile';
  if (name.startsWith('.')) {
    const dotExt = name.slice(1);
    if (LANGUAGE_MAP[dotExt]) return LANGUAGE_MAP[dotExt]!;
  }
  return LANGUAGE_MAP[ext] || 'plaintext';
}

function getFileSize(content: string): number {
  return content.length;
}

export function createVirtualFileSystem(initialFiles?: FSNode[]) {
  let nodes: FSNode[] = initialFiles || getDefaultProject();
  const listeners = new Set<FileChangeCallback>();

  function notify() {
    const snapshot = structuredClone(nodes);
    listeners.forEach((fn) => fn(snapshot));
  }

  function subscribe(callback: FileChangeCallback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  function getNodes(): FSNode[] {
    return structuredClone(nodes);
  }

  function findNode(path: string): FSNode | null {
    if (path === '/' || path === '') return { name: 'root', path: '/', type: 'directory', children: nodes, lastModified: Date.now() };

    const parts = path.split('/').filter(Boolean);
    let current: FSNode[] = nodes;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const found = current.find((n) => n.name === part);
      if (!found) return null;
      if (i === parts.length - 1) return found;
      if (found.type === 'directory' && found.children) {
        current = found.children;
      } else {
        return null;
      }
    }
    return null;
  }

  function getParentDir(path: string): FSNode[] {
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return nodes;

    let current: FSNode[] = nodes;
    for (let i = 0; i < parts.length - 1; i++) {
      const found = current.find((n) => n.name === parts[i]);
      if (found?.type === 'directory' && found.children) {
        current = found.children;
      } else {
        return nodes;
      }
    }
    return current;
  }

  // Ensure every intermediate directory in the path exists (mkdir -p behavior).
  // Returns the parent array to insert into, or null if a file blocks the way.
  // When it creates missing directories it notifies listeners so the tree stays
  // in sync even if the final create then fails (e.g. name collision).
  function ensureParentDirs(filePath: string): FSNode[] | null {
    const parts = filePath.split('/').filter(Boolean);
    if (parts.length <= 1) return nodes;

    let current: FSNode[] = nodes;
    let built = '';
    let created = false;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      built += '/' + part;
      let found = current.find((n) => n.name === part);
      if (!found) {
        const dir: FSNode = { name: part, path: built, type: 'directory', children: [], lastModified: Date.now() };
        current.push(dir);
        current.sort(sortNodes);
        found = dir;
        created = true;
      }
      if (found.type !== 'directory' || !found.children) return null;
      current = found.children;
    }
    if (created) notify();
    return current;
  }

  function createFile(filePath: string, content = ''): boolean {
    const parts = filePath.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return false;

    const parent = ensureParentDirs(filePath);
    if (!parent || parent.some((n) => n.name === fileName)) return false;

    const now = Date.now();
    parent.push({
      name: fileName,
      path: filePath,
      type: 'file',
      content,
      size: getFileSize(content),
      language: detectLanguage(fileName),
      lastModified: now,
    });

    parent.sort(sortNodes);
    notify();
    return true;
  }

  function createDirectory(dirPath: string): boolean {
    const parts = dirPath.split('/').filter(Boolean);
    const dirName = parts.pop();
    if (!dirName) return false;

    const parent = ensureParentDirs(dirPath);
    if (!parent || parent.some((n) => n.name === dirName)) return false;

    const now = Date.now();
    parent.push({
      name: dirName,
      path: dirPath,
      type: 'directory',
      children: [],
      lastModified: now,
    });

    parent.sort(sortNodes);
    notify();
    return true;
  }

  function updateFile(filePath: string, content: string): boolean {
    const node = findNode(filePath);
    if (!node || node.type !== 'file') return false;

    node.content = content;
    node.size = getFileSize(content);
    node.lastModified = Date.now();
    notify();
    return true;
  }

  function deleteNode(nodePath: string): boolean {
    const parts = nodePath.split('/').filter(Boolean);
    const name = parts.pop();
    if (!name) return false;

    const parent = getParentDir(nodePath);
    const index = parent.findIndex((n) => n.name === name);
    if (index === -1) return false;

    parent.splice(index, 1);
    notify();
    return true;
  }

  function renameNode(oldPath: string, newName: string): boolean {
    const node = findNode(oldPath);
    if (!node) return false;

    const parent = getParentDir(oldPath);
    const parts = oldPath.split('/').filter(Boolean);
    parts[parts.length - 1] = newName;
    const newPath = '/' + parts.join('/');

    if (parent.some((n) => n.name === newName && n.path !== oldPath)) return false;

    node.name = newName;
    node.path = newPath;
    node.lastModified = Date.now();

    // Update children paths if directory
    if (node.type === 'directory' && node.children) {
      updateChildPaths(node, oldPath, newPath);
    }

    notify();
    return true;
  }

  function updateChildPaths(node: FSNode, oldParentPath: string, newParentPath: string) {
    if (!node.children) return;
    for (const child of node.children) {
      const oldChildPath = child.path;
      child.path = child.path.replace(oldParentPath, newParentPath);
      child.lastModified = Date.now();
      if (child.type === 'directory' && child.children) {
        updateChildPaths(child, oldChildPath, child.path);
      }
    }
  }

  function toTree(): FSNode {
    return {
      name: 'project',
      path: '/',
      type: 'directory',
      children: nodes,
      lastModified: Date.now(),
    };
  }

  function readFile(filePath: string): string | null {
    const node = findNode(filePath);
    if (!node || node.type !== 'file') return null;
    return node.content ?? '';
  }

  function getFlattenedFiles(): Array<{ path: string; content: string }> {
    const result: Array<{ path: string; content: string }> = [];
    function walk(children: FSNode[]) {
      for (const node of children) {
        if (node.type === 'file' && node.content !== undefined) {
          result.push({ path: node.path, content: node.content });
        }
        if (node.type === 'directory' && node.children) {
          walk(node.children);
        }
      }
    }
    walk(nodes);
    return result;
  }

  function exportToJson(): string {
    return JSON.stringify(nodes, null, 2);
  }

  function importFromJson(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        nodes = data;
        notify();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function reset() {
    nodes = getDefaultProject();
    notify();
  }

  return {
    getNodes,
    findNode,
    createFile,
    createDirectory,
    updateFile,
    deleteNode,
    renameNode,
    toTree,
    readFile,
    getFlattenedFiles,
    exportToJson,
    importFromJson,
    reset,
    subscribe,
  };
}

function sortNodes(a: FSNode, b: FSNode) {
  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function getDefaultProject(): FSNode[] {
  const now = Date.now();
  return [
    {
      name: 'src',
      path: '/src',
      type: 'directory',
      lastModified: now,
      children: [
        {
          name: 'index.js',
          path: '/src/index.js',
          type: 'file',
          content: '// Welcome to your workspace!\n// Start coding here\n\nconsole.log("Hello, World!");\n',
          size: 68,
          language: 'javascript',
          lastModified: now,
        },
        {
          name: 'style.css',
          path: '/src/style.css',
          type: 'file',
          content: '/* Add your styles here */\nbody {\n  font-family: sans-serif;\n  margin: 0;\n  padding: 20px;\n  background: #f5f5f5;\n}\n',
          size: 121,
          language: 'css',
          lastModified: now,
        },
      ],
    },
    {
      name: 'index.html',
      path: '/index.html',
      type: 'file',
      content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>My Project</title>\n  <link rel="stylesheet" href="src/style.css" />\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <script src="src/index.js"></script>\n</body>\n</html>\n',
      size: 298,
      language: 'html',
      lastModified: now,
    },
    {
      name: 'README.md',
      path: '/README.md',
      type: 'file',
      content: '# My Project\n\nCreated in the assessment workspace.\n',
      size: 52,
      language: 'markdown',
      lastModified: now,
    },
  ];
}

export type VirtualFileSystem = ReturnType<typeof createVirtualFileSystem>;
export default createVirtualFileSystem;
