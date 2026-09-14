import { describe, it, expect } from 'vitest';
import {
  toolsForFilePath,
  collectFilesInFolder,
  toolsForSelection,
  describeSelectionTools,
  saveFolderForSelection,
} from '../lib/workspace-context';

interface Node {
  path: string;
  type: 'file' | 'directory';
  children?: Node[];
}

function file(path: string): Node {
  return { path, type: 'file' };
}
function dir(path: string, children: Node[] = []): Node {
  return { path, type: 'directory', children };
}

// A typical project scaffold from the setup wizard. FSNode paths are FULL paths
// (dirs and files share the same prefix), so directory paths include parents.
const PROJECT: Node[] = [
  dir('database', [
    dir('database/designs', [file('database/designs/erd/diagram.json')]),
    dir('database/sql', [file('database/sql/schema.sql')]),
  ]),
  dir('frontend', [file('frontend/index.html'), file('frontend/App.jsx')]),
  dir('backend', [file('backend/server.js')]),
  dir('presentation', [file('presentation/outline.md')]),
  file('README.md'),
];

describe('toolsForFilePath()', () => {
  it('maps SQL files to the Database console', () => {
    expect(toolsForFilePath('database/sql/schema.sql')).toContain('DATABASE');
  });

  it('maps any .sql file to the Database console regardless of location', () => {
    expect(toolsForFilePath('/db/queries.sql')).toContain('DATABASE');
  });

  it('maps diagram.json files to the Diagram editor', () => {
    expect(toolsForFilePath('database/designs/erd/diagram.json')).toContain('DIAGRAM_EDITOR');
    expect(toolsForFilePath('designs/dfd/diagram.json')).toContain('DIAGRAM_EDITOR');
    expect(toolsForFilePath('network/designs/topology/diagram.json')).toContain('DIAGRAM_EDITOR');
  });

  it('maps frontend code to Editor + Browser preview + Terminal', () => {
    const tools = toolsForFilePath('frontend/App.jsx');
    expect(tools).toEqual(expect.arrayContaining(['CODE_EDITOR', 'BROWSER_PREVIEW', 'TERMINAL']));
  });

  it('maps backend code to Editor + Terminal without Browser preview', () => {
    const tools = toolsForFilePath('backend/server.js');
    expect(tools).toEqual(expect.arrayContaining(['CODE_EDITOR', 'TERMINAL']));
    expect(tools).not.toContain('BROWSER_PREVIEW');
  });

  it('maps presentation material to Browser preview + Editor', () => {
    expect(toolsForFilePath('presentation/outline.md')).toEqual(
      expect.arrayContaining(['BROWSER_PREVIEW', 'CODE_EDITOR']),
    );
  });

  it('returns nothing for an unknown binary-ish asset', () => {
    expect(toolsForFilePath('uploads/archive.7z')).toContain('FILE_UPLOAD');
  });

  it('normalizes leading slashes', () => {
    expect(toolsForFilePath('/frontend/index.html')).toContain('BROWSER_PREVIEW');
  });
});

describe('collectFilesInFolder()', () => {
  it('collects every file recursively under a folder', () => {
    const files = collectFilesInFolder(PROJECT, 'database');
    expect(files.sort()).toEqual([
      'database/designs/erd/diagram.json',
      'database/sql/schema.sql',
    ]);
  });

  it('collects the whole tree for the root folder', () => {
    const files = collectFilesInFolder(PROJECT, '/');
    expect(files).toHaveLength(7); // diagram.json + schema.sql + index.html + App.jsx + server.js + outline.md + README.md
    expect(files).toContain('README.md');
  });
});

describe('toolsForSelection()', () => {
  it('returns the single file tools for a file selection', () => {
    expect(
      toolsForSelection({ path: 'database/sql/schema.sql', type: 'file' }, PROJECT),
    ).toContain('DATABASE');
  });

  it('returns the union of all file tools for a folder selection', () => {
    const tools = toolsForSelection({ path: 'database', type: 'directory' }, PROJECT);
    // diagram.json → DIAGRAM_EDITOR, schema.sql → DATABASE
    expect(tools).toEqual(expect.arrayContaining(['DATABASE', 'DIAGRAM_EDITOR']));
  });

  it('frontend folder highlights Editor + Browser + Terminal', () => {
    const tools = toolsForSelection({ path: 'frontend', type: 'directory' }, PROJECT);
    expect(tools).toEqual(expect.arrayContaining(['CODE_EDITOR', 'BROWSER_PREVIEW', 'TERMINAL']));
  });

  it('returns an empty list when nothing is selected', () => {
    expect(toolsForSelection(null, PROJECT)).toEqual([]);
  });

  it('handles a missing/empty folder gracefully', () => {
    expect(toolsForSelection({ path: 'network', type: 'directory' }, PROJECT)).toEqual([]);
  });
});

describe('saveFolderForSelection()', () => {
  it('returns the selected folder for a directory selection', () => {
    expect(
      saveFolderForSelection({ path: '/database', type: 'directory' }, 'db'),
    ).toBe('database');
    expect(
      saveFolderForSelection({ path: '/database/sql', type: 'directory' }, 'db'),
    ).toBe('database/sql');
  });

  it('returns the parent folder for a file selection', () => {
    expect(
      saveFolderForSelection({ path: '/database/sql/schema.sql', type: 'file' }, 'db'),
    ).toBe('database/sql');
  });

  it('returns the default when nothing is selected', () => {
    expect(saveFolderForSelection(null, 'db')).toBe('db');
    expect(saveFolderForSelection(null, 'database/sql')).toBe('database/sql');
  });

  it('handles root-level selections', () => {
    expect(saveFolderForSelection({ path: '/', type: 'directory' }, 'db')).toBe('');
    expect(saveFolderForSelection({ path: '/index.html', type: 'file' }, 'db')).toBe('');
  });
});

describe('describeSelectionTools()', () => {
  it('returns the same tool set as toolsForSelection with a reason per tool', () => {
    const recs = describeSelectionTools(
      { path: 'database/sql/schema.sql', type: 'file' },
      PROJECT,
    );
    const tools = toolsForSelection({ path: 'database/sql/schema.sql', type: 'file' }, PROJECT);
    expect(recs.map((r) => r.tool).sort()).toEqual(tools.sort());
    expect(recs.every((r) => typeof r.reason === 'string' && r.reason.length > 0)).toBe(true);
  });

  it('explains the database tool for an SQL file', () => {
    const recs = describeSelectionTools({ path: 'db/schema.sql', type: 'file' }, PROJECT);
    expect(recs.find((r) => r.tool === 'DATABASE')?.reason).toContain('Run SQL queries');
  });

  it('returns no recommendations when nothing is selected', () => {
    expect(describeSelectionTools(null, PROJECT)).toEqual([]);
  });
});
