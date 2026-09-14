import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WorkspaceTerminal } from '@components/workspace/workspace-terminal';
import { createVirtualFileSystem } from '@lib/virtual-fs';

// ── Types ───────────────────────────────────────────

type Handler = (...args: unknown[]) => void;

interface FakeSocket {
  connected: boolean;
  on: (event: string, cb: Handler) => FakeSocket;
  removeAllListeners: () => void;
  close: () => void;
  emit: (...args: unknown[]) => void;
  handlers: Record<string, Handler[]>;
  emitEvent: (event: string, ...args: unknown[]) => void;
}

// ── Mocks (hoisted so the vi.mock factories can reference them) ──
const mocks = vi.hoisted(() => {
  const sockets: FakeSocket[] = [];
  const ioMock = vi.fn(() => {
    const handlers: Record<string, Handler[]> = {};
    const socket: FakeSocket = {
      connected: false,
      on: vi.fn((event: string, cb: Handler) => {
        (handlers[event] ??= []).push(cb);
        return socket;
      }),
      removeAllListeners: vi.fn(),
      close: vi.fn(() => {
        socket.connected = false;
      }),
      emit: vi.fn(),
      handlers,
      emitEvent: (event: string, ...args: unknown[]) => {
        (handlers[event] ?? []).forEach((cb) => cb(...args));
      },
    };
    sockets.push(socket);
    return socket;
  });
  return { sockets, ioMock };
});

vi.mock('socket.io-client', () => ({
  io: mocks.ioMock,
}));
// xterm is only instantiated in 'real' mode (never reached in these tests);
// stub it so importing the component is safe in jsdom.
vi.mock('xterm', () => ({ Terminal: vi.fn() }));
vi.mock('xterm-addon-fit', () => ({ FitAddon: vi.fn() }));

// ── Helpers ─────────────────────────────────────────

function renderTerminal(
  sessionId: string | null = 'test-session-123',
  cwd?: string | null,
  initialFs?: ReturnType<typeof createVirtualFileSystem>,
) {
  const fs = initialFs ?? createVirtualFileSystem([]);
  return render(<WorkspaceTerminal sessionId={sessionId} fs={fs} cwd={cwd ?? null} />);
}

// A small file tree with a database/ folder so folder-scoped tests can assert
// what the shell sees inside the selected folder.
function makeFolderFs() {
  const fs = createVirtualFileSystem([]);
  fs.createFile('/database/schema.sql', 'CREATE TABLE users (id INT);');
  fs.createFile('/index.html', '<h1>Hello</h1>');
  return fs;
}

function lastSocket(): FakeSocket {
  return mocks.sockets[mocks.sockets.length - 1]!;
}

// ── Tests ───────────────────────────────────────────

describe('WorkspaceTerminal — Wi-Fi fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sockets.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in connecting mode and opens a terminal socket with the sessionId', () => {
    renderTerminal('session-abc');

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    expect(mocks.ioMock).toHaveBeenCalledWith(
      '/sandbox/terminal',
      expect.objectContaining({ query: { sessionId: 'session-abc' } }),
    );
    expect(mocks.sockets).toHaveLength(1);
    // No Reconnect button while the first connection attempt is in flight
    expect(screen.queryByRole('button', { name: /reconnect/i })).not.toBeInTheDocument();
  });

  it('renders directly in offline simulated mode when there is no sessionId', () => {
    renderTerminal(null);

    expect(screen.getByText('Terminal (offline)')).toBeInTheDocument();
    expect(mocks.ioMock).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
  });

  it('falls back to offline simulated mode with a Reconnect button on reconnect_failed', () => {
    renderTerminal();
    const socket = lastSocket();

    act(() => {
      socket.emitEvent('reconnect_failed');
    });

    expect(screen.getByText('Terminal (offline)')).toBeInTheDocument();
    expect(screen.getByText(/Could not reconnect/)).toBeInTheDocument();
    expect(screen.getByText(/Real terminal unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();
    // Offline command input is still usable
    expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
  });

  it('falls back to offline mode when the initial connection times out', () => {
    vi.useFakeTimers();
    renderTerminal();
    expect(screen.getByText('Connecting...')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByText('Terminal (offline)')).toBeInTheDocument();
    expect(screen.getByText(/Connection timed out/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();
  });

  it('creates a fresh socket and returns to connecting mode when Reconnect is clicked', () => {
    renderTerminal();
    const firstSocket = lastSocket();
    expect(mocks.ioMock).toHaveBeenCalledTimes(1);

    // Force the offline fallback first
    act(() => {
      firstSocket.emitEvent('reconnect_failed');
    });
    expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reconnect/i }));

    // The old socket is torn down and a brand-new one is created
    expect(firstSocket.removeAllListeners).toHaveBeenCalled();
    expect(firstSocket.close).toHaveBeenCalled();
    expect(mocks.ioMock).toHaveBeenCalledTimes(2);
    expect(mocks.sockets).toHaveLength(2);
    // Back to the connecting state
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });
});

describe('WorkspaceTerminal — folder-aware working directory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sockets.length = 0;
  });

  it('passes the selected folder as the shell working directory in the socket query', () => {
    renderTerminal('session-abc', 'database/sql');

    expect(mocks.ioMock).toHaveBeenCalledWith(
      '/sandbox/terminal',
      expect.objectContaining({ query: { sessionId: 'session-abc', cwd: 'database/sql' } }),
    );
  });

  it('omits the cwd query param when no folder is selected', () => {
    renderTerminal('session-abc', null);

    expect(mocks.ioMock).toHaveBeenCalledWith(
      '/sandbox/terminal',
      expect.objectContaining({ query: { sessionId: 'session-abc' } }),
    );
  });

  it('shows the working directory next to the mode label', () => {
    renderTerminal('session-abc', 'database');

    expect(screen.getByText('· /database')).toBeInTheDocument();
  });

  it('does not restart a live shell when the selected folder changes', () => {
    const { rerender } = renderTerminal('session-abc', 'database');
    expect(mocks.ioMock).toHaveBeenCalledTimes(1);

    // Selecting a different folder while a socket exists must NOT tear it
    // down — that would kill the shell and any process running inside it
    // (e.g. a dev server started with `npm start`).
    rerender(
      <WorkspaceTerminal
        sessionId="session-abc"
        fs={createVirtualFileSystem([])}
        cwd="src"
      />,
    );

    expect(mocks.ioMock).toHaveBeenCalledTimes(1);
    expect(mocks.sockets).toHaveLength(1);
    // The header still shows the folder the shell actually started in
    expect(screen.getByText('· /database')).toBeInTheDocument();
  });
});

describe('WorkspaceTerminal — simulated offline terminal is folder-aware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sockets.length = 0;
  });

  function runCommand(command: string) {
    const input = screen.getByPlaceholderText('Type a command...');
    fireEvent.change(input, { target: { value: command } });
    fireEvent.keyDown(input, { key: 'Enter' });
  }

  it('starts inside the selected folder', () => {
    renderTerminal(null, 'database', makeFolderFs());

    expect(screen.getByText('Started inside database/')).toBeInTheDocument();
    runCommand('pwd');
    expect(screen.getByText('/database')).toBeInTheDocument();
  });

  it('lists the contents of the selected folder with ls', () => {
    renderTerminal(null, 'database', makeFolderFs());

    runCommand('ls');

    expect(screen.getByText(/schema\.sql/)).toBeInTheDocument();
  });

  it('cd .. returns to the workspace root', () => {
    renderTerminal(null, 'database', makeFolderFs());

    runCommand('cd ..');
    runCommand('pwd');
    // cd prints the new path and so does pwd — both are the root here
    expect(screen.getAllByText('/').length).toBeGreaterThan(0);

    // From the root, the database folder is listed again
    runCommand('ls');
    expect(screen.getByText(/\uD83D\uDCC1 database\//)).toBeInTheDocument();
  });

  it('offline shell follows folder clicks without losing output', () => {
    const { rerender } = renderTerminal(null, 'database', makeFolderFs());
    runCommand('pwd');
    expect(screen.getByText('/database')).toBeInTheDocument();

    // Select a different folder while the terminal tab stays open
    rerender(
      <WorkspaceTerminal
        sessionId={null}
        fs={createVirtualFileSystem([])}
        cwd="src"
      />,
    );

    // The offline shell moved into the newly selected folder — no socket, so
    // no reconnect, no output wipe.
    expect(screen.getByText('· /src')).toBeInTheDocument();
    runCommand('pwd');
    expect(screen.getByText('/src')).toBeInTheDocument();
    // Previous output is preserved
    expect(screen.getByText('/database')).toBeInTheDocument();
  });
});
