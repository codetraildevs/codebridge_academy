import { render, screen, fireEvent, waitFor, within, configure } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamicWorkspace } from '@components/workspace/dynamic-workspace';
import { api } from '@services/api';
import type { Mock } from 'vitest';
import type { FSNode } from '@lib/virtual-fs';
import type { DiagramElement } from '@components/workspace/diagram-workspace';

// The workspace mounts monaco, the sandbox FS and several async effects; under
// whole-suite parallel CPU load the default 1s findBy/waitFor window is too
// short. Give the finds in this file a generous poll window.
configure({ asyncUtilTimeout: 10000 });

// The terminal tab is never opened in these tests — stub the component to avoid
// pulling in xterm / socket.io-client in the jsdom environment.
vi.mock('@components/workspace/workspace-terminal', () => ({
  WorkspaceTerminal: () => <div data-testid="mock-terminal" />,
}));

// Non-sandbox mode never calls the API; stub it so the real axios instance
// (and its auth-store interceptors) aren't loaded by the workspace modules.
vi.mock('@services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// ── Helpers ─────────────────────────────────────────

function makeFile(name: string, path: string): FSNode {
  return {
    name,
    path,
    type: 'file',
    content: '',
    size: 0,
    language: 'plaintext',
    lastModified: Date.now(),
  };
}

function makeDir(name: string, path: string, children: FSNode[] = []): FSNode {
  return { name, path, type: 'directory', children, lastModified: Date.now() };
}

function renderWorkspace(onFilesChange: ReturnType<typeof vi.fn> = vi.fn()) {
  const initialFiles = [
    makeDir('src', '/src', [makeFile('index.js', '/src/index.js')]),
  ];
  render(
    <DynamicWorkspace
      initialFiles={initialFiles}
      onFilesChange={onFilesChange}
    />,
  );
  return onFilesChange;
}

function lastFlattened(onFilesChange: ReturnType<typeof vi.fn>) {
  const calls = onFilesChange.mock.calls as Array<[Array<{ path: string; content: string }>]>;
  return calls[calls.length - 1]?.[0] ?? [];
}

// ── Multi-diagram canvases (design sections) ───────
// Design sections can require two or more diagrams (e.g. an ERD and a DFD).
// Each diagram is a tabbed canvas persisted to its own file: the primary one
// to designs/<stage>/diagram.json and extras to diagram-2.json / diagram-3.json.

describe('DynamicWorkspace — multi-diagram canvases', () => {
  const erdElements: DiagramElement[] = [
    { id: 'ent-1', type: 'box', x: 40, y: 60, width: 160, height: 70, text: 'Patient' },
  ];
  const dfdElements: DiagramElement[] = [
    { id: 'proc-1', type: 'circle', x: 40, y: 60, width: 140, height: 140, text: 'Process' },
  ];

  function diagramFile(name: string, path: string, content: string): FSNode {
    return { ...makeFile(name, path), content, language: 'json' };
  }

  function renderDesignWorkspace(initialFiles: FSNode[], onFilesChange = vi.fn()) {
    render(
      <DynamicWorkspace
        sectionType="ERD_DESIGN"
        initialFiles={initialFiles}
        onFilesChange={onFilesChange}
      />,
    );
    return onFilesChange;
  }

  function erdTree(): FSNode[] {
    return [
      makeDir('database', '/database', [
        makeDir('designs', '/database/designs', [
          makeDir('erd', '/database/designs/erd', [
            diagramFile('diagram.json', '/database/designs/erd/diagram.json', JSON.stringify(erdElements)),
          ]),
        ]),
      ]),
    ];
  }

  it('opens a design section on the Diagram tab and restores the primary canvas', async () => {
    renderDesignWorkspace(erdTree());

    // The primary ERD canvas loads its saved entity.
    expect(await screen.findByTestId('shape-ent-1')).toBeInTheDocument();
    // A control for adding extra diagrams is available.
    expect(screen.getByText('Add diagram')).toBeInTheDocument();
  });

  it('adds a second diagram canvas and persists it to diagram-2.json', async () => {
    const onFilesChange = renderDesignWorkspace(erdTree());
    await screen.findByTestId('shape-ent-1');

    // Open the add-diagram menu and pick DFD.
    fireEvent.click(screen.getByText('Add diagram'));
    fireEvent.click(screen.getByRole('button', { name: 'DFD' }));

    // A DFD tab appears and is selected.
    const dfdTab = await screen.findByRole('tab', { name: /DFD/ });
    expect(dfdTab).toHaveAttribute('aria-selected', 'true');
    // The empty DFD file was created in the stage folder.
    expect(lastFlattened(onFilesChange).some((f) => f.path === '/database/designs/erd/diagram-2.json')).toBe(
      true,
    );
  });

  it('removes an extra diagram and deletes its file', async () => {
    const onFilesChange = renderDesignWorkspace([
      makeDir('database', '/database', [
        makeDir('designs', '/database/designs', [
          makeDir('erd', '/database/designs/erd', [
            diagramFile('diagram.json', '/database/designs/erd/diagram.json', JSON.stringify(erdElements)),
            diagramFile(
              'diagram-2.json',
              '/database/designs/erd/diagram-2.json',
              JSON.stringify({ diagramType: 'DFD', elements: [] }),
            ),
          ]),
        ]),
      ]),
    ]);
    await screen.findByTestId('shape-ent-1');
    await screen.findByRole('tab', { name: /DFD/ });

    // Remove the extra diagram via its tab's close button.
    fireEvent.click(screen.getByTitle('Remove this diagram'));

    expect(screen.queryByRole('tab', { name: /DFD/ })).not.toBeInTheDocument();
    expect(
      lastFlattened(onFilesChange).some((f) => f.path === '/database/designs/erd/diagram-2.json'),
    ).toBe(false);
  });

  it('restores multiple saved diagrams as separate canvases with their own types', async () => {
    renderDesignWorkspace([
      makeDir('database', '/database', [
        makeDir('designs', '/database/designs', [
          makeDir('erd', '/database/designs/erd', [
            diagramFile('diagram.json', '/database/designs/erd/diagram.json', JSON.stringify(erdElements)),
            diagramFile(
              'diagram-2.json',
              '/database/designs/erd/diagram-2.json',
              JSON.stringify({ diagramType: 'DFD', elements: dfdElements }),
            ),
          ]),
        ]),
      ]),
    ]);

    // Both tabs are restored; the primary ERD canvas is active. (Canvases stay
    // mounted so each keeps its undo history; the active one is selected here.)
    await screen.findByTestId('shape-ent-1');
    const erdTab = await screen.findByRole('tab', { name: /^ERD/ });
    const dfdTab = await screen.findByRole('tab', { name: /DFD/ });
    expect(erdTab).toHaveAttribute('aria-selected', 'true');
    expect(dfdTab).toHaveAttribute('aria-selected', 'false');

    // Switching tabs activates the DFD canvas; its restored elements render.
    fireEvent.click(dfdTab);
    expect(dfdTab).toHaveAttribute('aria-selected', 'true');
    expect(erdTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('shape-proc-1')).toBeInTheDocument();
  });

  it('filters the add-diagram picker by the candidate\'s trade', async () => {
    render(
      <DynamicWorkspace
        sectionType="ERD_DESIGN"
        tradeCode="NET"
        tradeName="Networking"
        initialFiles={erdTree()}
        onFilesChange={vi.fn()}
      />,
    );
    await screen.findByTestId('shape-ent-1');

    fireEvent.click(screen.getByText('Add diagram'));

    // The picker is labelled with the trade. A Networking candidate plans
    // topologies and subnets: Flowchart + Topology + Subnetting, no ERD/DFD/UML.
    expect(screen.getByText('Networking diagrams')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Flowchart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Topology' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subnetting' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ERD' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'DFD' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'UML' })).not.toBeInTheDocument();
  });

  it('offers every diagram type for software-development candidates', async () => {
    render(
      <DynamicWorkspace
        sectionType="ERD_DESIGN"
        tradeCode="SWD"
        initialFiles={erdTree()}
        onFilesChange={vi.fn()}
      />,
    );
    await screen.findByTestId('shape-ent-1');

    fireEvent.click(screen.getByText('Add diagram'));
    for (const label of ['ERD', 'DFD', 'Flowchart', 'UML']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('offers storyboard and UI-mockup canvases to multimedia candidates', async () => {
    render(
      <DynamicWorkspace
        sectionType="ERD_DESIGN"
        tradeCode="MMD"
        tradeName="Multimedia"
        initialFiles={erdTree()}
        onFilesChange={vi.fn()}
      />,
    );
    await screen.findByTestId('shape-ent-1');

    fireEvent.click(screen.getByText('Add diagram'));

    // A Multimedia candidate storyboards and mocks up screens, plus flowcharts
    // for process planning — but no ERD / DFD / UML / topology / subnetting.
    expect(screen.getByText('Multimedia diagrams')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Storyboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UI Mockup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Flowchart' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ERD' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Topology' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subnetting' })).not.toBeInTheDocument();
  });

  it('restores a topology primary canvas for TOPOLOGY_BUILDER sections', async () => {
    const topologyElements: DiagramElement[] = [
      { id: 'rtr-1', type: 'circle', x: 40, y: 60, width: 120, height: 120, text: 'Router' },
    ];
    render(
      <DynamicWorkspace
        sectionType="TOPOLOGY_BUILDER"
        initialFiles={[
          makeDir('network', '/network', [
            makeDir('designs', '/network/designs', [
              makeDir('topology', '/network/designs/topology', [
                diagramFile('diagram.json', '/network/designs/topology/diagram.json', JSON.stringify(topologyElements)),
              ]),
            ]),
          ]),
        ]}
        onFilesChange={vi.fn()}
      />,
    );

    // The primary topology canvas loads its saved router from network/designs/topology/.
    expect(await screen.findByTestId('shape-rtr-1')).toBeInTheDocument();
    const tab = screen.getByRole('tab', { name: /Topology/ });
    expect(tab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('DynamicWorkspace — context menu nested creation', () => {
  it("right-clicking a folder and choosing 'New File' creates the file inside that folder", () => {
    const onFilesChange = renderWorkspace();

    // Open the context menu on the src folder row
    fireEvent.contextMenu(screen.getByText('src'));

    // Choose New File — the input should target the /src folder
    fireEvent.click(screen.getByText('New File'));
    expect(screen.getByText(/creating in \/src/)).toBeInTheDocument();

    // Type a name and confirm with Enter
    const input = screen.getByPlaceholderText('name or nested/path');
    fireEvent.change(input, { target: { value: 'helper.js' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // The file lands inside /src — never at the root
    const flattened = lastFlattened(onFilesChange);
    expect(flattened.some((f) => f.path === '/src/helper.js')).toBe(true);
    expect(flattened.some((f) => f.path === '/helper.js')).toBe(false);

    // The tree shows helper.js nested under src (and the editor opened it)
    expect(screen.getAllByText('helper.js').length).toBeGreaterThan(0);
  });

  it("right-clicking a folder and choosing 'New Folder' creates the folder inside that folder", () => {
    renderWorkspace();

    fireEvent.contextMenu(screen.getByText('src'));
    fireEvent.click(screen.getByText('New Folder'));
    expect(screen.getByText(/creating in \/src/)).toBeInTheDocument();

    const input = screen.getByPlaceholderText('name or nested/path');
    fireEvent.change(input, { target: { value: 'components' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // The new folder is visible in the (expanded) tree under /src
    expect(screen.getByText('components')).toBeInTheDocument();
  });

  it("right-clicking a file creates the new file in that file's parent folder", () => {
    const onFilesChange = renderWorkspace();

    // Right-click the index.js file inside /src
    const fileRow = screen.getAllByText('index.js')[0]!;
    fireEvent.contextMenu(fileRow);
    fireEvent.click(screen.getByText('New File'));

    const input = screen.getByPlaceholderText('name or nested/path');
    fireEvent.change(input, { target: { value: 'config.js' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Parent of /src/index.js is /src, so the file is created there
    const flattened = lastFlattened(onFilesChange);
    expect(flattened.some((f) => f.path === '/src/config.js')).toBe(true);
    expect(flattened.some((f) => f.path === '/config.js')).toBe(false);
  });
});

// ── Database tab: MySQL status surfacing ──────────
// When the status endpoint reports the backend's real error (e.g. access
// denied because the wrong server/credentials are configured), the tab must
// show the reason and the endpoint it probed instead of a generic "offline".

describe('DynamicWorkspace — Database tab MySQL status surfacing', () => {
  // The component mounts with a sessionId, so the sandbox FS and status
  // effects all hit the (mocked) API. Answer every URL so those side effects
  // resolve cleanly, and override the mysql/status payload per scenario.
  function mockStatusApi(mysqlPayload: Record<string, unknown>) {
    (api.get as Mock).mockImplementation((url: string) => {
      if (url.endsWith('/mysql/status')) {
        return Promise.resolve({ data: { data: mysqlPayload } });
      }
      if (url.endsWith('/server/status')) {
        return Promise.resolve({ data: { data: { running: false, port: null } } });
      }
      if (url.endsWith('/tree')) {
        return Promise.resolve({ data: { data: { children: [] } } });
      }
      return Promise.resolve({ data: { data: {} } });
    });
  }

  beforeEach(() => {
    (api.get as Mock).mockReset();
    (api.post as Mock).mockReset();
    (api.get as Mock).mockResolvedValue({ data: { data: {} } });
    (api.post as Mock).mockResolvedValue({ data: { data: {} } });
  });

  function renderSandboxWorkspace() {
    render(
      <DynamicWorkspace sessionId="test-session" initialFiles={[]} onFilesChange={vi.fn()} />,
    );
    // The Database tab content only mounts after switching tabs.
    fireEvent.click(screen.getByRole('button', { name: 'Database' }));
  }

  it("shows the endpoint and the 'Access denied' reason when MySQL rejects the connection", async () => {
    mockStatusApi({
      connected: false,
      host: '127.0.0.1',
      port: 3307,
      error: "Access denied for user 'root'@'localhost' (using password: NO)",
    });
    renderSandboxWorkspace();

    // Status bar: offline with the probed endpoint.
    expect(
      await screen.findByText(/MySQL offline \(127\.0\.0\.1:3307\)/),
    ).toBeInTheDocument();
    // The backend-reported reason is surfaced verbatim.
    expect(screen.getByText(/Access denied for user 'root'@'localhost'/)).toBeInTheDocument();
    // The recovery hint is part of the reason banner.
    expect(screen.getByText(/npm run db:mysql:start/)).toBeInTheDocument();
    // The SQL console footer carries the endpoint too.
    expect(
      screen.getByText(/Connections use the host XAMPP MariaDB at 127\.0\.0\.1:3307/),
    ).toBeInTheDocument();
    // Not connected, so the console stays disabled.
    expect(screen.getByRole('button', { name: /Run SQL/ })).toBeDisabled();
  });

  it('shows a connected status with the version and enables the SQL console', async () => {
    mockStatusApi({ connected: true, host: '127.0.0.1', port: 3307, version: '10.4.32-MariaDB' });
    renderSandboxWorkspace();

    expect(
      await screen.findByText(/MySQL connected · 10\.4\.32-MariaDB/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/MySQL reason:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/MySQL offline/)).not.toBeInTheDocument();
    // With SQL typed in, the console is ready to run.
    fireEvent.change(screen.getByPlaceholderText(/Type SQL here/), {
      target: { value: 'SELECT 1;' },
    });
    expect(screen.getByRole('button', { name: /Run SQL/ })).toBeEnabled();
  });

  it('falls back to a generic banner when the status request itself fails', async () => {
    (api.get as Mock).mockImplementation((url: string) => {
      if (url.endsWith('/mysql/status')) return Promise.reject(new Error('network down'));
      if (url.endsWith('/server/status')) {
        return Promise.resolve({ data: { data: { running: false, port: null } } });
      }
      if (url.endsWith('/tree')) return Promise.resolve({ data: { data: { children: [] } } });
      return Promise.resolve({ data: { data: {} } });
    });
    renderSandboxWorkspace();

    expect(await screen.findByText('Cannot check MySQL')).toBeInTheDocument();
    expect(screen.queryByText(/MySQL reason:/)).not.toBeInTheDocument();
  });

  it('re-fetches the status when the refresh button is clicked and updates the banner', async () => {
    // First fetch reports offline (wrong port), the refresh click returns connected.
    let statusCalls = 0;
    (api.get as Mock).mockImplementation((url: string) => {
      if (url.endsWith('/mysql/status')) {
        statusCalls += 1;
        if (statusCalls === 1) {
          return Promise.resolve({
            data: {
              data: {
                connected: false,
                host: '127.0.0.1',
                port: 3306,
                error: "Access denied for user 'root'@'localhost'",
              },
            },
          });
        }
        return Promise.resolve({
          data: {
            data: { connected: true, host: '127.0.0.1', port: 3307, version: '10.4.32-MariaDB' },
          },
        });
      }
      if (url.endsWith('/server/status')) {
        return Promise.resolve({ data: { data: { running: false, port: null } } });
      }
      if (url.endsWith('/tree')) {
        return Promise.resolve({ data: { data: { children: [] } } });
      }
      return Promise.resolve({ data: { data: {} } });
    });
    (api.post as Mock).mockResolvedValue({ data: { data: {} } });
    renderSandboxWorkspace();

    // Mount fetch: offline on the wrong endpoint with the reason banner.
    expect(await screen.findByText(/MySQL offline \(127\.0\.0\.1:3306\)/)).toBeInTheDocument();
    expect(screen.getByText(/Access denied for user 'root'@'localhost'/)).toBeInTheDocument();

    // Click the refresh button in the status bar.
    fireEvent.click(screen.getByTitle('Refresh MySQL status'));

    // Re-fetched: banner flips to connected with the version, reason clears,
    // and the console footer points at the corrected endpoint.
    expect(
      await screen.findByText(/MySQL connected · 10\.4\.32-MariaDB/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/MySQL reason:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/MySQL offline/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Connections use the host XAMPP MariaDB at 127\.0\.0\.1:3307/),
    ).toBeInTheDocument();

    // The status endpoint was hit exactly twice: mount + refresh click.
    const mysqlStatusCalls = (api.get as Mock).mock.calls.filter(([url]) =>
      (url as string).endsWith('/mysql/status'),
    );
    expect(mysqlStatusCalls).toHaveLength(2);
  });
});

// ── Database tab: SQL console execution ──────────
// runSql posts the typed SQL to /mysql/query and renders the backend result:
// a table for SELECT-style results, a Query OK badge for DDL/DML, or the
// raw error when the query fails.

describe('DynamicWorkspace — Database tab SQL console', () => {
  function mockMysqlApi(
    status: Record<string, unknown>,
    query: Record<string, unknown>,
    queryError?: string,
  ) {
    (api.get as Mock).mockImplementation((url: string) => {
      if (url.endsWith('/mysql/status')) {
        return Promise.resolve({ data: { data: status } });
      }
      if (url.endsWith('/server/status')) {
        return Promise.resolve({ data: { data: { running: false, port: null } } });
      }
      if (url.endsWith('/tree')) {
        return Promise.resolve({ data: { data: { children: [] } } });
      }
      return Promise.resolve({ data: { data: {} } });
    });
    (api.post as Mock).mockImplementation((url: string) => {
      if (url.endsWith('/mysql/query')) {
        if (queryError) {
          return Promise.reject({ response: { data: { message: queryError } } });
        }
        return Promise.resolve({ data: { data: query } });
      }
      return Promise.resolve({ data: { data: {} } });
    });
  }

  function openDatabaseTab() {
    render(
      <DynamicWorkspace sessionId="test-session" initialFiles={[]} onFilesChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Database' }));
  }

  async function typeAndRun(sql: string) {
    fireEvent.change(screen.getByPlaceholderText(/Type SQL here/), { target: { value: sql } });
    fireEvent.click(screen.getByRole('button', { name: /Run SQL/ }));
  }

  it('runs a SELECT query and renders the result table', async () => {
    mockMysqlApi(
      { connected: true, host: '127.0.0.1', port: 3307, version: '10.4.32-MariaDB' },
      {
        type: 'SELECT',
        columns: ['id', 'name', 'role'],
        rows: [
          { id: 1, name: 'alice', role: 'admin' },
          { id: 2, name: 'bob', role: 'candidate' },
        ],
        rowCount: 2,
      },
    );
    openDatabaseTab();
    await screen.findByText(/MySQL connected/);

    await typeAndRun('SELECT * FROM users;');

    // The exact SQL reached the backend.
    expect(api.post).toHaveBeenCalledWith('/sandbox/workspace/test-session/mysql/query', {
      sql: 'SELECT * FROM users;',
    });
    // Result metadata, column headers, and cells render.
    expect(await screen.findByText('2 row(s)')).toBeInTheDocument();
    expect(screen.getByText('3 column(s)')).toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('role')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('renders a Query OK badge for DDL/DML results', async () => {
    mockMysqlApi(
      { connected: true, host: '127.0.0.1', port: 3307 },
      { type: 'OK', affectedRows: 2, insertId: 0 },
    );
    openDatabaseTab();
    await screen.findByText(/MySQL connected/);

    await typeAndRun("UPDATE users SET role = 'candidate' WHERE id = 1;");

    expect(await screen.findByText(/Query OK/)).toBeInTheDocument();
    expect(screen.getByText(/2 row\(s\) affected/)).toBeInTheDocument();
  });

  it('surfaces the backend SQL error in the result panel', async () => {
    mockMysqlApi(
      { connected: true, host: '127.0.0.1', port: 3307 },
      {},
      "Unknown database 'missing_db'",
    );
    openDatabaseTab();
    await screen.findByText(/MySQL connected/);

    await typeAndRun('USE missing_db;');

    expect(await screen.findByText(/Unknown database 'missing_db'/)).toBeInTheDocument();
  });
});

describe('DynamicWorkspace — context-aware tool highlighting', () => {
  function projectTree(): FSNode[] {
    return [
      makeDir('database', '/database', [
        makeDir('sql', '/database/sql', [makeFile('schema.sql', '/database/sql/schema.sql')]),
      ]),
      makeDir('frontend', '/frontend', [makeFile('App.jsx', '/frontend/App.jsx')]),
      makeDir('backend', '/backend', [makeFile('server.js', '/backend/server.js')]),
    ];
  }

  function renderProjectWorkspace() {
    render(
      <DynamicWorkspace
        initialFiles={projectTree()}
        onFilesChange={vi.fn()}
      />,
    );
  }

  it('highlights the Database tab when a .sql file is selected', async () => {
    renderProjectWorkspace();

    // Nested folders are collapsed by default — expand down to the SQL file
    fireEvent.click(screen.getByText('database'));
    fireEvent.click(screen.getByText('sql'));
    fireEvent.click(screen.getByText('schema.sql'));

    const databaseTab = screen.getByRole('button', { name: /^Database$/ });
    expect(databaseTab).toHaveAttribute('title', expect.stringContaining('recommended'));
    // The Database tab is highlighted (pulsing dot present)
    expect(databaseTab.querySelector('span.bg-accent-500')).toBeTruthy();
  });

  it('highlights Editor + Browser + Terminal when a frontend file is selected', () => {
    renderProjectWorkspace();

    fireEvent.click(screen.getByText('frontend'));
    fireEvent.click(screen.getByText('App.jsx'));

    // Clicking the file opens it in the Editor (that tab is now active, so its
    // own highlight is dropped) — the other relevant tools light up instead.
    const editorTab = screen.getByRole('button', { name: /^Editor$/ });
    expect(editorTab.className).toContain('border-primary-500'); // active
    expect(editorTab).not.toHaveAttribute('title', expect.stringContaining('recommended'));
    expect(
      screen.getByRole('button', { name: /^Browser/ }).getAttribute('title'),
    ).toContain('recommended');
    expect(
      screen.getByRole('button', { name: /^Terminal/ }).getAttribute('title'),
    ).toContain('recommended');
  });

  it('dims the Database tab when a backend file is selected', () => {
    renderProjectWorkspace();

    fireEvent.click(screen.getByText('backend'));
    fireEvent.click(screen.getByText('server.js'));

    const databaseTab = screen.getByRole('button', { name: /^Database$/ });
    expect(databaseTab).not.toHaveAttribute('title', expect.stringContaining('recommended'));
    expect(databaseTab.className).toContain('opacity-45');
  });

  it('highlights the union of file tools when a folder is selected', () => {
    renderProjectWorkspace();

    // Expand + select the database folder
    fireEvent.click(screen.getByText('database'));

    const databaseTab = screen.getByRole('button', { name: /^Database$/ });
    expect(databaseTab).toHaveAttribute('title', expect.stringContaining('recommended'));
  });

  it('shows the selected node and recommended tools in the context panel', () => {
    renderProjectWorkspace();

    fireEvent.click(screen.getByText('database'));
    fireEvent.click(screen.getByText('sql'));
    fireEvent.click(screen.getByText('schema.sql'));

    // The persistent sidebar shows the selected file's full path…
    expect(screen.getByText('/database/sql/schema.sql')).toBeInTheDocument();
    // …and the recommended tool with a reason (Database Console).
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Database Console')).toBeInTheDocument();
    expect(screen.getByText('Run SQL queries against the exam database')).toBeInTheDocument();
  });

  it('never recommends a tool the exam disabled', () => {
    render(
      <DynamicWorkspace
        initialFiles={projectTree()}
        onFilesChange={vi.fn()}
        workspaceTools={['FILE_EXPLORER', 'CODE_EDITOR']}
      />,
    );

    // Select the .sql file explicitly — the panel must NOT recommend the
    // disabled DATABASE tool for it (only enabled tools can be suggested).
    fireEvent.click(screen.getByText('database'));
    fireEvent.click(screen.getByText('sql'));
    fireEvent.click(screen.getByText('schema.sql'));

    expect(screen.queryByRole('button', { name: /^Database$/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Database Console')).not.toBeInTheDocument();
    expect(screen.queryByText('Run SQL queries against the exam database')).not.toBeInTheDocument();
    // The enabled tools are still listed (Code Editor is recommended for the file).
    expect(screen.getByText('Code Editor')).toBeInTheDocument();
  });

  it('shows an empty state in the context panel when nothing is selected', () => {
    render(
      <DynamicWorkspace
        initialFiles={[]}
        onFilesChange={vi.fn()}
      />,
    );

    expect(screen.getByText('No selection')).toBeInTheDocument();
    expect(
      screen.getByText(/Select a file or folder in the Explorer to see which tools fit it/),
    ).toBeInTheDocument();
  });

  it('toggles the context panel from the toolbar', async () => {
    render(<DynamicWorkspace initialFiles={[]} onFilesChange={vi.fn()} />);

    expect(screen.getByText('No selection')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Toggle context panel'));
    // AnimatePresence runs an exit animation, so wait for the panel to unmount.
    await waitFor(() => {
      expect(screen.queryByText('No selection')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Toggle context panel'));
    expect(await screen.findByText('No selection')).toBeInTheDocument();
  });

  it('leaves tabs neutral on a design section (no auto-select, no context)', () => {
    render(
      <DynamicWorkspace
        sectionType="ERD_DESIGN"
        initialFiles={projectTree()}
        onFilesChange={vi.fn()}
      />,
    );

    // Design sections skip the auto-select, so no tab is dimmed or highlighted.
    const editorTab = screen.getByRole('button', { name: /^Editor$/ });
    expect(editorTab.className).not.toContain('opacity-45');
    expect(editorTab.querySelector('span.bg-accent-500')).toBeFalsy();
  });
});

// ── Folder-scoped tools ────────────────────────────
// Selecting a folder makes the tools save INTO it: new diagram canvases,
// SQL scripts and new files all land inside the folder the candidate is
// working in, instead of a fixed location.

describe('DynamicWorkspace — folder-scoped tools', () => {
  const erdElements: DiagramElement[] = [
    { id: 'ent-1', type: 'box', x: 40, y: 60, width: 160, height: 70, text: 'Patient' },
  ];

  function diagramFile(name: string, path: string, content: string): FSNode {
    return { ...makeFile(name, path), content, language: 'json' };
  }

  it('saves a new diagram canvas into the selected folder', async () => {
    const onFilesChange = vi.fn();
    render(
      <DynamicWorkspace
        sectionType="ERD_DESIGN"
        initialFiles={[
          makeDir('database', '/database', [
            makeDir('designs', '/database/designs', [
              makeDir('erd', '/database/designs/erd', [
                diagramFile('diagram.json', '/database/designs/erd/diagram.json', JSON.stringify(erdElements)),
              ]),
            ]),
            makeDir('sql', '/database/sql'),
          ]),
        ]}
        onFilesChange={onFilesChange}
      />,
    );
    await screen.findByTestId('shape-ent-1');

    // Select the database folder, then add a DFD canvas — it must be saved
    // INSIDE /database, not into the stage folder.
    fireEvent.click(screen.getByText('database'));
    fireEvent.click(screen.getByText('Add diagram'));
    fireEvent.click(screen.getByRole('button', { name: 'DFD' }));

    const flattened = lastFlattened(onFilesChange);
    // The database folder had no diagram yet → the first canvas takes diagram.json
    expect(flattened.some((f) => f.path === '/database/diagram.json')).toBe(true);
    expect(flattened.some((f) => f.path === '/database/designs/erd/diagram-2.json')).toBe(false);
  });

  it('saves the SQL script into the selected folder', async () => {
    const onFilesChange = vi.fn();
    // Sandbox mode hits the API — stub the status/tree calls the tab needs.
    (api.get as Mock).mockImplementation((url: string) => {
      if (url.endsWith('/mysql/status')) {
        return Promise.resolve({
          data: { data: { connected: false, host: '127.0.0.1', port: 3307 } },
        });
      }
      if (url.endsWith('/server/status')) {
        return Promise.resolve({ data: { data: { running: false, port: null } } });
      }
      if (url.endsWith('/tree')) {
        return Promise.resolve({ data: { data: { children: [] } } });
      }
      return Promise.resolve({ data: { data: {} } });
    });
    (api.post as Mock).mockResolvedValue({ data: { data: {} } });

    render(
      <DynamicWorkspace
        sessionId="test-session"
        initialFiles={[]}
        onFilesChange={onFilesChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Database' }));
    await screen.findByText(/MySQL offline/);

    // Type SQL, open the save row, and save — the default target is db/
    // because nothing is selected.
    fireEvent.change(screen.getByPlaceholderText(/Type SQL here/), {
      target: { value: 'CREATE TABLE users (id INT);' },
    });
    fireEvent.click(screen.getByTitle('Save this script into the selected folder'));
    fireEvent.change(screen.getByPlaceholderText('schema.sql'), {
      target: { value: 'schema.sql' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const flattened = lastFlattened(onFilesChange);
    expect(
      flattened.some(
        (f) =>
          f.path === '/db/schema.sql' && f.content === 'CREATE TABLE users (id INT);',
      ),
    ).toBe(true);
  });

  it('creates a new file inside the selected folder from the toolbar', () => {
    const onFilesChange = renderWorkspace();

    // Select the src folder, then use the toolbar New File button.
    fireEvent.click(screen.getByText('src'));
    fireEvent.click(screen.getByTitle('New File (in /src)'));

    const input = screen.getByPlaceholderText('name or nested/path');
    fireEvent.change(input, { target: { value: 'helper.js' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const flattened = lastFlattened(onFilesChange);
    expect(flattened.some((f) => f.path === '/src/helper.js')).toBe(true);
    expect(flattened.some((f) => f.path === '/helper.js')).toBe(false);
  });
});

describe('DynamicWorkspace — workspace tools gating', () => {
  function renderWithTools(tools: string[], sectionType?: string) {
    const initialFiles = [
      makeDir('src', '/src', [makeFile('index.js', '/src/index.js')]),
    ];
    render(
      <DynamicWorkspace
        initialFiles={initialFiles}
        onFilesChange={vi.fn()}
        workspaceTools={tools}
        sectionType={sectionType}
      />,
    );
  }

  // Terminal/Browser tab buttons carry an "(off)" badge until opened.
  const terminalTab = { name: /^Terminal( \(off\))?$/ };
  const browserTab = { name: /^Browser( \(off\))?$/ };

  it('shows all tabs when no tools are specified (legacy exams = all tools)', () => {
    renderWithTools([]);

    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.getByRole('button', terminalTab)).toBeInTheDocument();
    expect(screen.getByRole('button', browserTab)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Database' })).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Terminal')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Browser Preview')).toBeInTheDocument();
    expect(screen.getByTitle('Upload Files (to root)')).toBeInTheDocument();
  });

  it('hides unselected tabs (terminal, database, browser) and their toolbar controls', () => {
    renderWithTools(['CODE_EDITOR', 'FILE_EXPLORER']);

    // Editor + explorer remain
    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.getByTitle('Toggle File Explorer')).toBeInTheDocument();

    // Terminal, database and browser tabs are gone
    expect(screen.queryByRole('button', terminalTab)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Database' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', browserTab)).not.toBeInTheDocument();

    // So are their toolbar toggles and the upload button
    expect(screen.queryByTitle('Toggle Terminal')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Toggle Browser Preview')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Upload Files (to root)')).not.toBeInTheDocument();
  });

  it('hides the Diagram tab on design sections when the diagram editor is not enabled', () => {
    renderWithTools(['CODE_EDITOR', 'FILE_EXPLORER'], 'ERD_DESIGN');

    expect(screen.queryByRole('button', { name: 'Diagram' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
  });

  it('opens the Diagram tab on design sections when the diagram editor is enabled, hiding the editor', () => {
    renderWithTools(['FILE_EXPLORER', 'DIAGRAM_EDITOR'], 'ERD_DESIGN');

    expect(screen.getByRole('button', { name: 'Diagram' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editor' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Database' })).not.toBeInTheDocument();
  });

  it('hides the file explorer panel when the file explorer tool is disabled', () => {
    renderWithTools(['CODE_EDITOR', 'TERMINAL']);

    expect(screen.queryByTitle('Toggle File Explorer')).not.toBeInTheDocument();
    expect(screen.queryByText('Explorer')).not.toBeInTheDocument();
  });
});

// ── Free diagrams on non-design sections ──────────
// The Diagram tab is available on EVERY section when the diagram editor is
// enabled — not just design stages. On sections without a fixed diagram the
// candidate picks a type (filtered by their trade) from a chooser, and the
// canvas is saved into the workspace (designs/ or database/designs/).

describe('DynamicWorkspace — free diagrams on non-design sections', () => {
  function diagramFile(name: string, path: string, content: string): FSNode {
    return { ...makeFile(name, path), content, language: 'json' };
  }

  function renderNonDesign(
    opts: {
      sectionType?: string;
      tradeCode?: string;
      tradeName?: string;
      projectMode?: boolean;
      initialFiles?: FSNode[];
    } = {},
  ) {
    const onFilesChange = vi.fn();
    render(
      <DynamicWorkspace
        sectionType={opts.sectionType}
        tradeCode={opts.tradeCode}
        tradeName={opts.tradeName}
        projectMode={opts.projectMode}
        initialFiles={
          opts.initialFiles ?? [makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]
        }
        onFilesChange={onFilesChange}
        workspaceTools={['FILE_EXPLORER', 'CODE_EDITOR', 'DIAGRAM_EDITOR']}
      />,
    );
    return onFilesChange;
  }

  it('offers a trade-filtered type chooser on a MIXED section', async () => {
    renderNonDesign({ sectionType: 'MIXED', tradeCode: 'SWD', tradeName: 'Software Development' });

    // The Diagram tab is present alongside the editor.
    fireEvent.click(screen.getByRole('button', { name: 'Diagram' }));

    // Chooser asks what to draw and lists only the trade's diagram types.
    expect(
      await screen.findByText('What diagram would you like to draw?'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Software Development diagrams/)).toBeInTheDocument();

    // SWD → ERD, DFD, Flowchart, UML only.
    for (const label of ['ERD', 'DFD', 'Flowchart', 'UML']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    // No networking/multimedia diagram types.
    for (const absent of ['Topology', 'Subnetting', 'Storyboard', 'UI Mockup']) {
      expect(screen.queryByRole('button', { name: absent })).not.toBeInTheDocument();
    }
  });

  it('filters the chooser by the candidate trade (NET → networking diagrams)', async () => {
    renderNonDesign({ sectionType: 'CODE_WRITING', tradeCode: 'NET', tradeName: 'Networking' });

    fireEvent.click(screen.getByRole('button', { name: 'Diagram' }));

    expect(
      await screen.findByText('What diagram would you like to draw?'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Networking diagrams/)).toBeInTheDocument();

    // NET → Flowchart, Topology, Subnetting only.
    for (const label of ['Flowchart', 'Topology', 'Subnetting']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    for (const absent of ['ERD', 'DFD', 'UML', 'Storyboard', 'UI Mockup']) {
      expect(screen.queryByRole('button', { name: absent })).not.toBeInTheDocument();
    }
  });

  it('creates a canvas and saves it into designs/ when a type is picked', async () => {
    const onFilesChange = renderNonDesign({
      sectionType: 'MIXED',
      tradeCode: 'SWD',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Diagram' }));
    fireEvent.click(await screen.findByRole('button', { name: 'ERD' }));

    // A canvas tab opens and the canvas toolbar renders for the ERD type.
    expect(await screen.findByRole('tab', { name: /ERD/ })).toBeInTheDocument();
    expect(screen.getByTitle('Select & move (V)')).toBeInTheDocument();

    // Each kind gets its own folder: an ERD is persisted to
    // database/designs/erd/diagram.json.
    await waitFor(() => {
      expect(
        lastFlattened(onFilesChange).some(
          (f) =>
            f.path === '/database/designs/erd/diagram.json' &&
            f.content.includes('"diagramType":"ERD"'),
        ),
      ).toBe(true);
    });
  });

  it('saves a free diagram under its kind folder in project mode', async () => {
    const onFilesChange = renderNonDesign({
      sectionType: 'CODE_WRITING',
      tradeCode: 'SWD',
      projectMode: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Diagram' }));
    fireEvent.click(await screen.findByRole('button', { name: 'UML' }));

    expect(await screen.findByRole('tab', { name: /UML/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(
        lastFlattened(onFilesChange).some(
          (f) =>
            f.path === '/database/designs/uml/diagram.json' &&
            f.content.includes('"diagramType":"UML"'),
        ),
      ).toBe(true);
    });
  });

  it('restores a previously saved free diagram on a returning visit', async () => {
    renderNonDesign({
      sectionType: 'MIXED',
      tradeCode: 'SWD',
      initialFiles: [
        makeDir('database', '/database', [
          makeDir('designs', '/database/designs', [
            makeDir('dfd', '/database/designs/dfd', [
              diagramFile(
                'diagram.json',
                '/database/designs/dfd/diagram.json',
                JSON.stringify({ diagramType: 'DFD', elements: [] }),
              ),
            ]),
          ]),
        ]),
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Diagram' }));

    // The saved DFD canvas is reopened instead of showing the chooser.
    expect(await screen.findByRole('tab', { name: /DFD/ })).toBeInTheDocument();
    expect(
      screen.queryByText('What diagram would you like to draw?'),
    ).not.toBeInTheDocument();
  });

  it('hides the Diagram tab on non-design sections when DIAGRAM_EDITOR is disabled', () => {
    render(
      <DynamicWorkspace
        sectionType="MIXED"
        initialFiles={[makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]}
        onFilesChange={vi.fn()}
        workspaceTools={['FILE_EXPLORER', 'CODE_EDITOR']}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Diagram' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
  });
});

describe('DynamicWorkspace — saved-designs sync to workspace files', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const erdElements: DiagramElement[] = [
    { id: 'ent-1', type: 'box', x: 40, y: 60, width: 160, height: 70, text: 'Patient' },
  ];

  it('mirrors the browser saved-designs library into the kind folders', async () => {
    window.localStorage.setItem(
      'savedDiagramDesigns',
      JSON.stringify([
        { id: 'd-1', name: 'Payroll ERD', diagramType: 'ERD', elements: erdElements, savedAt: 1750000000000 },
      ]),
    );

    const onFilesChange = renderWorkspace();

    // An ERD draft lands next to the section diagrams in database/designs/erd/.
    await waitFor(() => {
      const files = lastFlattened(onFilesChange);
      expect(files.some((f) => f.path === '/database/designs/erd/payroll-erd.json')).toBe(true);
    });

    const files = lastFlattened(onFilesChange);
    const saved = files.find((f) => f.path === '/database/designs/erd/payroll-erd.json');
    expect(saved).toBeDefined();
    const parsed = JSON.parse(saved!.content);
    expect(parsed).toMatchObject({ name: 'Payroll ERD', diagramType: 'ERD' });
    expect(parsed.elements).toHaveLength(1);
  });

  it('does not sync saved designs in read-only mode', async () => {
    window.localStorage.setItem(
      'savedDiagramDesigns',
      JSON.stringify([
        { id: 'd-1', name: 'Payroll ERD', diagramType: 'ERD', elements: erdElements, savedAt: 1750000000000 },
      ]),
    );

    const onFilesChange = vi.fn();
    render(
      <DynamicWorkspace
        readOnly
        initialFiles={[makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]}
        onFilesChange={onFilesChange}
      />,
    );

    // Give the sync effect a chance to run — nothing should be written.
    await new Promise((r) => setTimeout(r, 50));
    expect(
      lastFlattened(onFilesChange).some((f) => f.path === '/database/designs/erd/payroll-erd.json'),
    ).toBe(false);
  });
});

describe('DynamicWorkspace — candidate tools picker', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // The tab bar is the Tools button's grandparent (the button sits in a
  // relative wrapper inside the tab bar). Scoping tab queries to it avoids
  // the icon-only "Toggle Terminal" button in the top toolbar.
  function tabBar(): HTMLElement {
    const toolsButton = screen.getByRole('button', { name: /Tools/ });
    return toolsButton.closest('div')!.parentElement!;
  }

  function openToolsMenu() {
    fireEvent.click(screen.getByRole('button', { name: /Tools/ }));
    return screen.getByText('Workspace tools').closest('div')!;
  }

  it('shows every provisioned tool on by default', () => {
    render(
      <DynamicWorkspace
        workspaceTools={['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL']}
        initialFiles={[makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]}
        onFilesChange={vi.fn()}
      />,
    );

    // All provisioned tabs are present before any choice is made.
    expect(within(tabBar()).getByRole('button', { name: /Terminal/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();

    const menu = openToolsMenu();
    expect(within(menu).getByRole('button', { name: /File Explorer/ })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Code Editor/ })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Terminal/ })).toBeInTheDocument();
  });

  it('hides a tab when the candidate turns the tool off and remembers the choice', () => {
    render(
      <DynamicWorkspace
        workspaceTools={['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL']}
        initialFiles={[makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]}
        onFilesChange={vi.fn()}
      />,
    );

    const menu = openToolsMenu();
    fireEvent.click(within(menu).getByRole('button', { name: /Terminal/ }));
    // Close the menu before checking the tab bar.
    fireEvent.click(screen.getByRole('button', { name: /Tools/ }));

    // The Terminal tab disappears and the choice is persisted.
    expect(within(tabBar()).queryByRole('button', { name: /Terminal/ })).not.toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem('workspaceToolsChoice') ?? '[]') as string[];
    expect(stored).not.toContain('TERMINAL');
    expect(stored).toContain('CODE_EDITOR');
  });

  it('applies the remembered tools choice on the next visit', () => {
    window.localStorage.setItem(
      'workspaceToolsChoice',
      JSON.stringify(['FILE_EXPLORER', 'CODE_EDITOR']),
    );

    render(
      <DynamicWorkspace
        workspaceTools={['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL']}
        initialFiles={[makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]}
        onFilesChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
    expect(within(tabBar()).queryByRole('button', { name: /Terminal/ })).not.toBeInTheDocument();
  });

  it('never enables a tool the platform owner did not provision', () => {
    window.localStorage.setItem(
      'workspaceToolsChoice',
      JSON.stringify(['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL', 'BROWSER_PREVIEW']),
    );

    render(
      <DynamicWorkspace
        workspaceTools={['FILE_EXPLORER', 'CODE_EDITOR']}
        initialFiles={[makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]}
        onFilesChange={vi.fn()}
      />,
    );

    // The owner only provisioned explorer + editor — the saved TERMINAL
    // choice is clamped away and no Browser/Diagram tabs appear.
    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
    expect(within(tabBar()).queryByRole('button', { name: /Terminal/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Browser' })).not.toBeInTheDocument();

    const menu = openToolsMenu();
    expect(within(menu).getByRole('button', { name: /File Explorer/ })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Code Editor/ })).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /Terminal/ })).not.toBeInTheDocument();
  });

  it('forces locked tools on even when the saved choice excluded them', () => {
    // The candidate previously turned the Terminal off...
    window.localStorage.setItem(
      'workspaceToolsChoice',
      JSON.stringify(['FILE_EXPLORER', 'CODE_EDITOR']),
    );

    render(
      <DynamicWorkspace
        workspaceTools={['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL']}
        lockedWorkspaceTools={['TERMINAL']}
        initialFiles={[makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]}
        onFilesChange={vi.fn()}
      />,
    );

    // ...but the owner locked it, so the Terminal tab is back regardless.
    expect(within(tabBar()).getByRole('button', { name: /Terminal/ })).toBeInTheDocument();

    const menu = openToolsMenu();
    const terminalEntry = within(menu).getByRole('button', { name: /Terminal/ });
    expect(terminalEntry).toBeDisabled();
    expect(within(menu).getByText('Locked by the exam owner')).toBeInTheDocument();
  });

  it('cannot turn a locked tool off', () => {
    // The candidate previously had the Terminal on (it is locked, so they
    // could never have turned it off) — clicking it must be a no-op.
    window.localStorage.setItem(
      'workspaceToolsChoice',
      JSON.stringify(['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL']),
    );

    render(
      <DynamicWorkspace
        workspaceTools={['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL']}
        lockedWorkspaceTools={['TERMINAL']}
        initialFiles={[makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]}
        onFilesChange={vi.fn()}
      />,
    );

    const menu = openToolsMenu();
    fireEvent.click(within(menu).getByRole('button', { name: /Terminal/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tools/ }));

    // The Terminal tab stays and the stored choice still contains it.
    expect(within(tabBar()).getByRole('button', { name: /Terminal/ })).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem('workspaceToolsChoice') ?? '[]') as string[];
    expect(stored).toContain('TERMINAL');
  });

  it('clamps locks to the owner-configured pool', () => {
    render(
      <DynamicWorkspace
        workspaceTools={['FILE_EXPLORER', 'CODE_EDITOR']}
        lockedWorkspaceTools={['DATABASE', 'TERMINAL']}
        initialFiles={[makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]}
        onFilesChange={vi.fn()}
      />,
    );

    // The owner never provisioned DATABASE/TERMINAL — the lock cannot add them.
    const menu = openToolsMenu();
    expect(within(menu).queryByRole('button', { name: /Database Console/ })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /Terminal/ })).not.toBeInTheDocument();
  });

  it('hides the tools picker in read-only mode', () => {
    render(
      <DynamicWorkspace
        readOnly
        initialFiles={[makeDir('src', '/src', [makeFile('index.js', '/src/index.js')])]}
        onFilesChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Tools/ })).not.toBeInTheDocument();
  });
});
