import { describe, it, expect } from 'vitest';
import {
  PROJECT_PARTS,
  PROJECT_PART_BY_ID,
  foldersForParts,
  deliverableFoldersForSection,
  filterFilesForSection,
  sectionOverlapsParts,
  countFilesPerPart,
  partsForSections,
} from '@lib/project-structure';

describe('project-structure (practical exam workspace)', () => {
  describe('PROJECT_PARTS', () => {
    it('defines the database, frontend and backend parts with their folders', () => {
      expect(PROJECT_PARTS.some((p) => p.id === 'DATABASE')).toBe(true);
      expect(PROJECT_PARTS.some((p) => p.id === 'FRONTEND')).toBe(true);
      expect(PROJECT_PARTS.some((p) => p.id === 'BACKEND')).toBe(true);
      expect(PROJECT_PART_BY_ID.DATABASE.folders).toEqual(['database/designs', 'database/sql']);
      expect(PROJECT_PART_BY_ID.FRONTEND.folders).toEqual(['frontend']);
      expect(PROJECT_PART_BY_ID.BACKEND.folders).toEqual(['backend']);
    });
  });

  describe('foldersForParts()', () => {
    it('returns the union of folders for the chosen parts', () => {
      expect(foldersForParts(['DATABASE', 'FRONTEND', 'BACKEND'])).toEqual([
        'database/designs',
        'database/sql',
        'frontend',
        'backend',
      ]);
    });

    it('deduplicates folders when parts overlap', () => {
      // NETWORK and DATABASE both live under their own trees — no overlap in
      // this catalog, but dedup should still work if a part ever shares.
      const folders = foldersForParts(['DATABASE', 'DATABASE', 'NETWORK']);
      expect(new Set(folders).size).toBe(folders.length);
    });
  });

  describe('deliverableFoldersForSection()', () => {
    it('maps design and database sections to database folders', () => {
      expect(deliverableFoldersForSection('ERD_DESIGN')).toEqual(['database/designs']);
      expect(deliverableFoldersForSection('DATABASE_DESIGN')).toEqual(['database/sql']);
    });

    it('maps the code section to frontend and backend', () => {
      expect(deliverableFoldersForSection('CODE_WRITING')).toEqual(['frontend', 'backend']);
    });

    it('returns an empty array (whole project) for MIXED/unknown sections', () => {
      expect(deliverableFoldersForSection('MIXED')).toEqual([]);
      expect(deliverableFoldersForSection('TOTALLY_UNKNOWN')).toEqual([]);
      expect(deliverableFoldersForSection(undefined)).toEqual([]);
    });
  });

  describe('filterFilesForSection()', () => {
    const allFiles = [
      { path: 'database/designs/erd/diagram.json', content: '{"x":1}' },
      { path: 'database/sql/schema.sql', content: 'CREATE TABLE...' },
      { path: 'frontend/src/App.js', content: 'console.log' },
      { path: 'backend/server.js', content: 'const x=1' },
      { path: 'README.md', content: '# Project' },
    ];

    it('keeps only the section’s own files (per-section deliverables)', () => {
      const sqlFiles = filterFilesForSection(allFiles, 'DATABASE_DESIGN');
      expect(sqlFiles.map((f) => f.path)).toEqual(['database/sql/schema.sql']);

      const erdFiles = filterFilesForSection(allFiles, 'ERD_DESIGN');
      expect(erdFiles.map((f) => f.path)).toEqual(['database/designs/erd/diagram.json']);
    });

    it('always keeps manual saved-designs drafts with the section answer', () => {
      const withSaved = [
        ...allFiles,
        // Saved designs sit in the kind folders next to the section diagrams.
        { path: 'database/designs/erd/payroll-erd.json', content: '{"name":"Payroll ERD","elements":[]}' },
        // Legacy location still travels with the answer.
        { path: 'saved-designs/legacy-erd.json', content: '{"name":"Legacy ERD","elements":[]}' },
      ];

      const sqlFiles = filterFilesForSection(withSaved, 'DATABASE_DESIGN');
      expect(sqlFiles.map((f) => f.path).sort()).toEqual(
        ['database/sql/schema.sql', 'database/designs/erd/payroll-erd.json', 'saved-designs/legacy-erd.json'].sort(),
      );

      const erdFiles = filterFilesForSection(withSaved, 'ERD_DESIGN');
      expect(erdFiles.map((f) => f.path).sort()).toEqual(
        ['database/designs/erd/diagram.json', 'database/designs/erd/payroll-erd.json', 'saved-designs/legacy-erd.json'].sort(),
      );

      // Saved drafts travel with every section's answer, even one that does
      // not own the design folders (the section's own canvas is a regular
      // deliverable file, not a saved draft).
      expect(filterFilesForSection(withSaved, 'CODE_WRITING').map((f) => f.path).sort()).toEqual(
        [
          'frontend/src/App.js',
          'backend/server.js',
          'database/designs/erd/payroll-erd.json',
          'saved-designs/legacy-erd.json',
        ].sort(),
      );
    });

    it('keeps frontend and backend files for the code section', () => {
      const codeFiles = filterFilesForSection(allFiles, 'CODE_WRITING');
      expect(codeFiles.map((f) => f.path).sort()).toEqual(
        ['frontend/src/App.js', 'backend/server.js'].sort(),
      );
    });

    it('returns everything when the section owns the whole project (MIXED)', () => {
      expect(filterFilesForSection(allFiles, 'MIXED')).toEqual(allFiles);
      expect(filterFilesForSection(allFiles, undefined)).toEqual(allFiles);
    });
  });

  describe('partsForSections()', () => {
    it('pre-selects parts based on the exam sections', () => {
      const parts = partsForSections([
        { sectionType: 'ERD_DESIGN' },
        { sectionType: 'CODE_WRITING' },
        { sectionType: 'DATABASE_DESIGN' },
      ]);
      expect(parts).toContain('DATABASE');
      expect(parts).toContain('FRONTEND');
      expect(parts).toContain('BACKEND');
    });

    it('falls back to the full-stack default when nothing matches', () => {
      expect(partsForSections([{ sectionType: 'MULTIPLE_CHOICE' }])).toEqual([
        'DATABASE',
        'FRONTEND',
        'BACKEND',
      ]);
    });

    it('includes the database part for flat MIXED exams (full EPMS-style stack)', () => {
      const parts = partsForSections([{ sectionType: 'MIXED' }]);
      expect(parts).toEqual(['DATABASE', 'FRONTEND', 'BACKEND']);
    });
  });

  describe('countFilesPerPart()', () => {
    it('counts files under each part’s folders', () => {
      const files = [
        { path: 'database/designs/erd/diagram.json' },
        { path: 'database/sql/schema.sql' },
        { path: 'frontend/src/App.js' },
        { path: 'backend/server.js' },
        { path: 'frontend/src/App.css' },
      ];
      expect(
        countFilesPerPart(files, ['DATABASE', 'FRONTEND', 'BACKEND']),
      ).toEqual({ DATABASE: 2, FRONTEND: 2, BACKEND: 1 });
    });

    it('counts a file for exactly one part (first matching)', () => {
      // database/designs is under DATABASE only, not also under a general part.
      expect(countFilesPerPart([{ path: 'database/designs/x.json' }], ['DATABASE'])).toEqual({
        DATABASE: 1,
      });
    });

    it('returns zero for parts with no files and ignores root-level files', () => {
      expect(
        countFilesPerPart([{ path: 'README.md' }], ['DATABASE', 'FRONTEND']),
      ).toEqual({ DATABASE: 0, FRONTEND: 0 });
    });

    it('handles leading slashes on file paths', () => {
      expect(
        countFilesPerPart([{ path: '/backend/app.js' }], ['BACKEND']),
      ).toEqual({ BACKEND: 1 });
    });
  });

  describe('sectionOverlapsParts()', () => {
    it('is true when the section’s folders are covered by the chosen parts', () => {
      expect(sectionOverlapsParts('ERD_DESIGN', ['DATABASE'])).toBe(true);
      expect(sectionOverlapsParts('CODE_WRITING', ['FRONTEND', 'BACKEND'])).toBe(true);
    });

    it('is false when the candidate deselected the part a section maps to', () => {
      // CODE_WRITING needs frontend/ + backend/, but the candidate only chose
      // the database part — filtering would silently empty the answer.
      expect(sectionOverlapsParts('CODE_WRITING', ['DATABASE'])).toBe(false);
    });

    it('is always true for whole-project sections (MIXED)', () => {
      expect(sectionOverlapsParts('MIXED', ['DATABASE'])).toBe(true);
      expect(sectionOverlapsParts(undefined, [])).toBe(true);
    });
  });
});
