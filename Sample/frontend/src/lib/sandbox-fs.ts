// ── Sandbox-backed File System ──────────────────────
// Mirrors the VirtualFileSystem interface exactly but syncs with the backend.
// Uses optimistic local cache for synchronous UI updates, then syncs to backend.
// This ensures the file explorer, editor, and real terminal share the same files.

import { io, type Socket } from 'socket.io-client';
import { api } from '@services/api';
import type { FSNode, FileChangeCallback } from './virtual-fs';

// ── API helpers ─────────────────────────────────────

function cleanPath(p: string): string {
  return p.replace(/^\//, '');
}

async function refreshTreeFromBackend(sessionId: string, cache: FSNode[], notify: () => void) {
  try {
    const res = await api.get(`/sandbox/workspace/${sessionId}/tree`);
    const data = res.data?.data;
    if (data?.children) {
      cache.length = 0;
      cache.push(...data.children.map(apiNodeToFsNode));
      notify();
    }
  } catch {
    // Keep cache on error
  }
}

interface ApiNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: ApiNode[];
  lastModified?: string;
  content?: string;
}

function apiNodeToFsNode(n: ApiNode): FSNode {
  return {
    name: n.name,
    path: n.path,
    type: n.type,
    size: n.size,
    content: n.content,
    lastModified: n.lastModified ? new Date(n.lastModified).getTime() : Date.now(),
    ...(n.type === 'directory'
      ? { children: (n.children || []).map(apiNodeToFsNode).sort(sortNodes) }
      : {}),
  };
}

function sortNodes(a: FSNode, b: FSNode) {
  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
  return a.name.localeCompare(b.name);
}

const LANG_MAP: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', rb: 'ruby', java: 'java', cpp: 'cpp', cs: 'csharp',
  go: 'go', rs: 'rust', php: 'php', html: 'html', css: 'css',
  json: 'json', xml: 'xml', md: 'markdown', sql: 'sql', sh: 'bash',
  yaml: 'yaml', yml: 'yaml', txt: 'plaintext',
};

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return LANG_MAP[ext] || 'plaintext';
}

// ── Types ─────────────────────────────────────────────
interface FileChangeEvent {
  event: string;
  path: string;
  sessionId: string;
  timestamp: string;
}

// ── Debug logger (disabled in production) ─────────────
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
function logger(...args: unknown[]) {
  if (isDev) console.debug('[SandboxFS]', ...args);
}

function getParentDir(cache: FSNode[], path: string): FSNode[] {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return cache;
  let current = cache;
  for (let i = 0; i < parts.length - 1; i++) {
    const found = current.find((n) => n.name === parts[i]);
    if (found?.type === 'directory' && found.children) {
      current = found.children;
    } else {
      return cache;
    }
  }
  return current;
}

// Ensure every intermediate directory in the path exists (mkdir -p behavior).
// Returns the parent array to insert into, or null if a file blocks the way.
// When it creates missing directories it calls onCreated so listeners stay in
// sync even if the final create then fails (e.g. name collision).
function ensureParentDirs(
  cache: FSNode[],
  path: string,
  onCreated?: () => void,
): FSNode[] | null {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return cache;
  let current = cache;
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
  if (created) onCreated?.();
  return current;
}

// ── Factory ─────────────────────────────────────────

export function createSandboxFileSystem(
  sessionId: string,
  sectionType?: string,
  options?: { projectMode?: boolean },
) {
  const cache: FSNode[] = [];
  const listeners = new Set<FileChangeCallback>();
  let eventsSocket: Socket | null = null;
  let initDone = false;
  const projectMode = options?.projectMode ?? false;

  function notify() {
    const snapshot = structuredClone(cache);
    listeners.forEach((fn) => fn(snapshot));
  }

  function subscribe(cb: FileChangeCallback) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  // ── Initialize ──────────────────────────────────
  (async function init() {
    if (initDone) return;
    initDone = true;
    try {
      if (projectMode) {
        // Project workspaces are scaffolded by the setup wizard (POST
        // /project). Just load the tree — don't create per-stage starter
        // folders on top of the project structure.
        await refreshTreeFromBackend(sessionId, cache, notify);
        return;
      }
      // First ensure workspace exists (pass the current stage so the backend
      // creates the stage-appropriate starter folders)
      await api.post(`/sandbox/workspace/${sessionId}/init`, { sectionType });
      // Then load the tree
      await refreshTreeFromBackend(sessionId, cache, notify);
    } catch {
      // Backend unavailable — cache stays empty
    }
  })();  // ── WebSocket event listener for real-time file changes ──
  // Replaces polling with instant push events from the backend
  let fallbackPollTimer: ReturnType<typeof setInterval> | null = null;
  
  function startFallbackPoll() {
    if (fallbackPollTimer) return;
    logger('Started fallback polling (5s interval)');
    fallbackPollTimer = setInterval(() => {
      refreshTreeFromBackend(sessionId, cache, notify);
    }, 5000);
  }
  
  function stopFallbackPoll() {
    if (fallbackPollTimer) {
      clearInterval(fallbackPollTimer);
      fallbackPollTimer = null;
      logger('Stopped fallback polling');
    }
  }
  
  function connectEvents() {
    try {
      eventsSocket = io('/sandbox/events', {
        query: { sessionId },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
      
      eventsSocket.on('connect', () => {
        logger('Connected to file events server');
        stopFallbackPoll();
      });
      
      eventsSocket.on('file:changed', (event: FileChangeEvent) => {
        logger(`File changed: ${event.event} ${event.path}`);
        // Refresh the tree from backend to get the latest state
        refreshTreeFromBackend(sessionId, cache, notify);
      });
      
      eventsSocket.on('disconnect', (reason) => {
        logger(`File events disconnected: ${reason}`);
        // Start polling fallback while disconnected
        startFallbackPoll();
      });
      
      eventsSocket.on('connect_error', (err) => {
        logger(`File events connection error: ${err.message}`);
        startFallbackPoll();
      });
      
      // Initial timeout: if no connect within 3s, start poll fallback
      setTimeout(() => {
        if (!eventsSocket?.connected) {
          startFallbackPoll();
        }
      }, 3000);
    } catch {
      // WebSocket unavailable — fall back to polling
      startFallbackPoll();
    }
  }
  
  connectEvents();

  // ── SYNCHRONOUS Public API ──────────────────────
  // All mutations update cache immediately (optimistic), then sync to backend

  function getNodes(): FSNode[] {
    return structuredClone(cache);
  }

  function findNode(path: string): FSNode | null {
    if (path === '/' || path === '') {
      return { name: 'root', path: '/', type: 'directory', children: cache, lastModified: Date.now() };
    }
    const parts = path.split('/').filter(Boolean);
    let current = cache;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const found = current.find((n) => n.name === part);
      if (!found) return null;
      if (i === parts.length - 1) return found;
      if (found.type === 'directory' && found.children) current = found.children;
      else return null;
    }
    return null;
  }

  function createFile(filePath: string, content = ''): boolean {
    const parts = filePath.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return false;

    const parent = ensureParentDirs(cache, filePath, notify);
    if (!parent || parent.some((n) => n.name === fileName)) return false;

    const now = Date.now();
    parent.push({
      name: fileName,
      path: filePath,
      type: 'file',
      content,
      size: content.length,
      language: detectLanguage(fileName),
      lastModified: now,
    });

    parent.sort(sortNodes);
    notify();

    // Background sync to backend
    api.post(`/sandbox/workspace/${sessionId}/files`, { path: filePath, content, type: 'file' })
      .catch(() => {});

    return true;
  }

  function createDirectory(dirPath: string): boolean {
    const parts = dirPath.split('/').filter(Boolean);
    const dirName = parts.pop();
    if (!dirName) return false;

    const parent = ensureParentDirs(cache, dirPath, notify);
    if (!parent || parent.some((n) => n.name === dirName)) return false;

    const now = Date.now();
    parent.push({ name: dirName, path: dirPath, type: 'directory', children: [], lastModified: now });
    parent.sort(sortNodes);
    notify();

    api.post(`/sandbox/workspace/${sessionId}/files`, { path: dirPath, content: '', type: 'directory' })
      .catch(() => {});

    return true;
  }

  function updateFile(filePath: string, content: string): boolean {
    const node = findNode(filePath);
    if (!node || node.type !== 'file') return false;

    node.content = content;
    node.size = content.length;
    node.lastModified = Date.now();
    notify();

    api.put(`/sandbox/workspace/${sessionId}/files/${cleanPath(filePath)}`, { content })
      .catch(() => {});

    return true;
  }

  function deleteNode(nodePath: string): boolean {
    const parts = nodePath.split('/').filter(Boolean);
    const name = parts.pop();
    if (!name) return false;

    const parent = getParentDir(cache, nodePath);
    const index = parent.findIndex((n) => n.name === name);
    if (index === -1) return false;

    parent.splice(index, 1);
    notify();

    api.delete(`/sandbox/workspace/${sessionId}/files/${cleanPath(nodePath)}`)
      .catch(() => {});

    return true;
  }

  function renameNode(oldPath: string, newName: string): boolean {
    const node = findNode(oldPath);
    if (!node) return false;

    const parent = getParentDir(cache, oldPath);
    const parts = oldPath.split('/').filter(Boolean);
    parts[parts.length - 1] = newName;
    const newPath = '/' + parts.join('/');

    if (parent.some((n) => n.name === newName && n.path !== oldPath)) return false;

    node.name = newName;
    node.path = newPath;
    node.lastModified = Date.now();

    // Update children paths if directory
    if (node.type === 'directory' && node.children) {
      (function updateChildPaths(n: FSNode, oldParentPath: string, newParentPath: string) {
        for (const child of n.children || []) {
          child.path = child.path.replace(oldParentPath, newParentPath);
          child.lastModified = Date.now();
          if (child.type === 'directory' && child.children) {
            updateChildPaths(child, oldParentPath, newParentPath);
          }
        }
      })(node, oldPath, newPath);
    }

    notify();

    api.put(`/sandbox/workspace/${sessionId}/rename/${cleanPath(oldPath)}`, { newName })
      .catch(() => {});

    return true;
  }

  function toTree(): FSNode {
    return { name: 'workspace', path: '/', type: 'directory', children: cache, lastModified: Date.now() };
  }

  function readFile(filePath: string): string | null {
    const node = findNode(filePath);
    if (node?.type === 'file') return node.content ?? '';
    // File not in cache — it might have been created by the real terminal
    // Trigger a background refresh to pick up any terminal-created files
    refreshTreeFromBackend(sessionId, cache, notify);
    return null;
  }

  function getFlattenedFiles(): Array<{ path: string; content: string }> {
    const result: Array<{ path: string; content: string }> = [];
    function walk(children: FSNode[]) {
      for (const node of children) {
        if (node.type === 'file') result.push({ path: node.path, content: node.content ?? '' });
        if (node.type === 'directory' && node.children) walk(node.children);
      }
    }
    walk(cache);
    return result;
  }

  function exportToJson(): string {
    return JSON.stringify(cache, null, 2);
  }

  function importFromJson(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        cache.length = 0;
        cache.push(...data);
        notify();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function reset() {
    try {
      await api.delete(`/sandbox/workspace/${sessionId}`);
      if (!projectMode) {
        await api.post(`/sandbox/workspace/${sessionId}/init`, { sectionType });
      }
      await refreshTreeFromBackend(sessionId, cache, notify);
    } catch {
      cache.length = 0;
      notify();
    }
  }

  function destroy() {
    stopFallbackPoll();
    if (eventsSocket) {
      eventsSocket.close();
      eventsSocket = null;
    }
    listeners.clear();
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
    destroy,
  };
}

export type SandboxFileSystem = ReturnType<typeof createSandboxFileSystem>;
export default createSandboxFileSystem;
