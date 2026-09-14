import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FSNode } from '@lib/virtual-fs';

// ── Mocks (hoisted so the vi.mock factories can reference them) ──
const mocks = vi.hoisted(() => {
  const apiMocks = {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  const sockets: Array<{
    on: (...args: unknown[]) => unknown;
    close: (...args: unknown[]) => unknown;
    connected: boolean;
  }> = [];
  const ioMock = vi.fn();
  return { apiMocks, sockets, ioMock };
});

vi.mock('@services/api', () => ({ api: mocks.apiMocks }));
vi.mock('socket.io-client', () => ({ io: mocks.ioMock }));

import { createSandboxFileSystem } from '@lib/sandbox-fs';

// Flush the async init IIFE (init → refreshTreeFromBackend) before assertions
async function flushAsync() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe('createSandboxFileSystem — nested directory creation (mocked api/socket)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sockets.length = 0;
    // Backend returns an empty tree by default; writes succeed
    mocks.apiMocks.get.mockResolvedValue({ data: { data: { children: [] } } });
    mocks.apiMocks.post.mockResolvedValue({});
    mocks.apiMocks.put.mockResolvedValue({});
    mocks.apiMocks.delete.mockResolvedValue({});
    mocks.ioMock.mockImplementation(() => {
      const socket = { on: vi.fn(), close: vi.fn(), connected: true };
      mocks.sockets.push(socket);
      return socket;
    });
  });

  it('auto-creates missing intermediate directories when creating a nested file', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();

    const result = fs.createFile('/src/utils/helper.js', 'const x = 1;');

    expect(result).toBe(true);
    expect(fs.findNode('/src')?.type).toBe('directory');
    expect(fs.findNode('/src/utils')?.type).toBe('directory');
    const file = fs.findNode('/src/utils/helper.js');
    expect(file?.type).toBe('file');
    expect(file?.content).toBe('const x = 1;');
    expect(file?.language).toBe('javascript');
    expect(file?.path).toBe('/src/utils/helper.js');

    // Only the final path is synced — the backend creates intermediates (mkdir -p)
    const filePosts = mocks.apiMocks.post.mock.calls.filter((c) =>
      String(c[0]).includes('/files'),
    );
    expect(filePosts).toHaveLength(1);
    expect(filePosts[0]![1]).toEqual({
      path: '/src/utils/helper.js',
      content: 'const x = 1;',
      type: 'file',
    });

    fs.destroy();
  });

  it('creates nested directories when creating a nested directory path', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();

    const result = fs.createDirectory('/a/b/c');

    expect(result).toBe(true);
    expect(fs.findNode('/a')?.type).toBe('directory');
    expect(fs.findNode('/a/b')?.type).toBe('directory');
    expect(fs.findNode('/a/b/c')?.type).toBe('directory');

    const dirPosts = mocks.apiMocks.post.mock.calls.filter((c) =>
      String(c[0]).includes('/files'),
    );
    expect(dirPosts).toHaveLength(1);
    expect(dirPosts[0]![1]).toEqual({
      path: '/a/b/c',
      content: '',
      type: 'directory',
    });

    fs.destroy();
  });

  it('reuses existing directories instead of duplicating them', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();
    fs.createDirectory('/src/utils');

    const result = fs.createFile('/src/utils/helper.js', '');

    expect(result).toBe(true);
    const src = fs.findNode('/src');
    expect(src?.children?.filter((n) => n.name === 'utils')).toHaveLength(1);

    fs.destroy();
  });

  it('includes nested files in getFlattenedFiles()', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();
    fs.createFile('/src/utils/helper.js', 'hi');
    fs.createFile('/src/utils/index.js', 'export {}');

    const files = fs.getFlattenedFiles();
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.path)).toEqual(
      expect.arrayContaining(['/src/utils/helper.js', '/src/utils/index.js']),
    );

    fs.destroy();
  });

  it('returns false when a file blocks the nested path', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();
    fs.createFile('/src/file.txt', '');

    const result = fs.createFile('/src/file.txt/child.js', '');

    expect(result).toBe(false);
    expect(fs.findNode('/src/file.txt/child.js')).toBeNull();

    fs.destroy();
  });

  it('returns false when the target file already exists in a nested dir', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();
    fs.createFile('/src/utils/helper.js', 'v1');

    const result = fs.createFile('/src/utils/helper.js', 'v2');

    expect(result).toBe(false);
    expect(fs.findNode('/src/utils/helper.js')?.content).toBe('v1');

    fs.destroy();
  });

  it('returns false when the target directory already exists', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();
    fs.createDirectory('/src/utils');

    const result = fs.createDirectory('/src/utils');

    expect(result).toBe(false);

    fs.destroy();
  });

  it('reflects the nested structure in toTree()', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();
    fs.createFile('/src/utils/helper.js', '');

    const tree = fs.toTree();
    const src = tree.children?.find((n) => n.name === 'src');
    expect(src?.type).toBe('directory');

    const utils = src?.children?.find((n) => n.name === 'utils');
    expect(utils?.type).toBe('directory');
    expect(utils?.children?.find((n) => n.name === 'helper.js')?.type).toBe('file');

    fs.destroy();
  });

  it('deletes a nested file while keeping its parent directories', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();
    fs.createFile('/src/utils/helper.js', '');

    expect(fs.deleteNode('/src/utils/helper.js')).toBe(true);
    expect(fs.findNode('/src/utils/helper.js')).toBeNull();
    expect(fs.findNode('/src/utils')?.type).toBe('directory');

    // Syncs the delete with the cleaned (slash-stripped) path
    expect(mocks.apiMocks.delete).toHaveBeenCalledWith(
      '/sandbox/workspace/session-1/files/src/utils/helper.js',
    );

    fs.destroy();
  });

  it('renames a nested file and keeps its path consistent', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();
    fs.createFile('/src/utils/helper.js', '');

    expect(fs.renameNode('/src/utils/helper.js', 'main.js')).toBe(true);
    expect(fs.findNode('/src/utils/main.js')).not.toBeNull();
    expect(fs.findNode('/src/utils/main.js')?.path).toBe('/src/utils/main.js');
    expect(fs.findNode('/src/utils/helper.js')).toBeNull();

    expect(mocks.apiMocks.put).toHaveBeenCalledWith(
      '/sandbox/workspace/session-1/rename/src/utils/helper.js',
      { newName: 'main.js' },
    );

    fs.destroy();
  });

  it('notifies subscribers when intermediate directories are auto-created', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();
    const snapshots: FSNode[][] = [];
    fs.subscribe((nodes) => snapshots.push(nodes));

    fs.createFile('/a/b/c.txt', '');

    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    const last = snapshots[snapshots.length - 1]!;
    expect(last.find((n) => n.name === 'a')?.type).toBe('directory');

    fs.destroy();
  });

  it('connects to the file-events socket and closes it on destroy', async () => {
    const fs = createSandboxFileSystem('session-1');
    await flushAsync();

    expect(mocks.ioMock).toHaveBeenCalledWith(
      '/sandbox/events',
      expect.objectContaining({ query: { sessionId: 'session-1' } }),
    );
    const socket = mocks.sockets[0];
    expect(socket).toBeDefined();
    // The socket must have registered at least the connect + file:changed handlers
    expect(socket!.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(socket!.on).toHaveBeenCalledWith('file:changed', expect.any(Function));

    fs.destroy();
    expect(socket!.close).toHaveBeenCalled();
  });
});
