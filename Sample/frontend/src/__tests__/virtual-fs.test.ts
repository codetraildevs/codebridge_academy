import { describe, it, expect } from 'vitest';
import { createVirtualFileSystem, type FSNode } from '@lib/virtual-fs';

describe('createVirtualFileSystem — nested directory creation', () => {
  it('auto-creates missing intermediate directories when creating a nested file', () => {
    const fs = createVirtualFileSystem([]);

    const result = fs.createFile('/src/utils/helper.js', 'const x = 1;');

    expect(result).toBe(true);

    const src = fs.findNode('/src');
    expect(src?.type).toBe('directory');

    const utils = fs.findNode('/src/utils');
    expect(utils?.type).toBe('directory');

    const file = fs.findNode('/src/utils/helper.js');
    expect(file?.type).toBe('file');
    expect(file?.content).toBe('const x = 1;');
    expect(file?.language).toBe('javascript');
    expect(file?.path).toBe('/src/utils/helper.js');
  });

  it('creates nested directories when creating a nested directory path', () => {
    const fs = createVirtualFileSystem([]);

    const result = fs.createDirectory('/a/b/c');

    expect(result).toBe(true);
    expect(fs.findNode('/a')?.type).toBe('directory');
    expect(fs.findNode('/a/b')?.type).toBe('directory');
    expect(fs.findNode('/a/b/c')?.type).toBe('directory');
  });

  it('reuses existing directories instead of duplicating them', () => {
    const fs = createVirtualFileSystem([]);
    fs.createDirectory('/src/utils');

    const result = fs.createFile('/src/utils/helper.js', '');

    expect(result).toBe(true);
    const src = fs.findNode('/src');
    expect(src?.children?.filter((n) => n.name === 'utils')).toHaveLength(1);
  });

  it('includes nested files in getFlattenedFiles()', () => {
    const fs = createVirtualFileSystem([]);
    fs.createFile('/src/utils/helper.js', 'hi');
    fs.createFile('/src/utils/index.js', 'export {}');

    const files = fs.getFlattenedFiles();
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.path)).toEqual(
      expect.arrayContaining(['/src/utils/helper.js', '/src/utils/index.js']),
    );
  });

  it('returns false when a file blocks the nested path', () => {
    const fs = createVirtualFileSystem([]);
    fs.createFile('/src/file.txt', '');

    // src/file.txt is a file — a directory cannot be created underneath it
    const result = fs.createFile('/src/file.txt/child.js', '');

    expect(result).toBe(false);
    expect(fs.findNode('/src/file.txt/child.js')).toBeNull();
  });

  it('returns false when the target file already exists in a nested dir', () => {
    const fs = createVirtualFileSystem([]);
    fs.createFile('/src/utils/helper.js', 'v1');

    const result = fs.createFile('/src/utils/helper.js', 'v2');

    expect(result).toBe(false);
    expect(fs.findNode('/src/utils/helper.js')?.content).toBe('v1');
  });

  it('returns false when the target directory already exists', () => {
    const fs = createVirtualFileSystem([]);
    fs.createDirectory('/src/utils');

    const result = fs.createDirectory('/src/utils');

    expect(result).toBe(false);
  });

  it('reflects the nested structure in toTree()', () => {
    const fs = createVirtualFileSystem([]);
    fs.createFile('/src/utils/helper.js', '');

    const tree = fs.toTree();
    const src = tree.children?.find((n) => n.name === 'src');
    expect(src?.type).toBe('directory');

    const utils = src?.children?.find((n) => n.name === 'utils');
    expect(utils?.type).toBe('directory');
    expect(utils?.children?.find((n) => n.name === 'helper.js')?.type).toBe('file');
  });

  it('deletes a nested file while keeping its parent directories', () => {
    const fs = createVirtualFileSystem([]);
    fs.createFile('/src/utils/helper.js', '');

    expect(fs.deleteNode('/src/utils/helper.js')).toBe(true);
    expect(fs.findNode('/src/utils/helper.js')).toBeNull();
    expect(fs.findNode('/src/utils')?.type).toBe('directory');
  });

  it('renames a nested file and keeps its path consistent', () => {
    const fs = createVirtualFileSystem([]);
    fs.createFile('/src/utils/helper.js', '');

    expect(fs.renameNode('/src/utils/helper.js', 'main.js')).toBe(true);
    expect(fs.findNode('/src/utils/main.js')).not.toBeNull();
    expect(fs.findNode('/src/utils/main.js')?.path).toBe('/src/utils/main.js');
    expect(fs.findNode('/src/utils/helper.js')).toBeNull();
  });

  it('notifies subscribers when intermediate directories are auto-created', () => {
    const fs = createVirtualFileSystem([]);
    const snapshots: FSNode[][] = [];
    fs.subscribe((nodes) => snapshots.push(nodes));

    fs.createFile('/a/b/c.txt', '');

    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    const last = snapshots[snapshots.length - 1]!;
    expect(last.find((n) => n.name === 'a')?.type).toBe('directory');
  });
});
