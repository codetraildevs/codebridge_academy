import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io, type Socket } from 'socket.io-client';
import { cn } from '@utils/cn';
import { RefreshCw, Terminal as TerminalIcon, Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { VirtualFileSystem, FSNode } from '@lib/virtual-fs';

import 'xterm/css/xterm.css';

// ── Types ───────────────────────────────────────────

interface WorkspaceTerminalProps {
  sessionId: string | null;
  fs: VirtualFileSystem;
  readOnly?: boolean;
  /**
   * Folder the shell should start in (relative to the sandbox root, e.g.
   * "database" or "database/sql"). The backend spawns the shell here so the
   * terminal follows the folder the candidate is working in.
   */
  cwd?: string | null;
}

type TerminalMode = 'connecting' | 'real' | 'simulated' | 'failed';

// ── Simulated terminal (fallback) ───────────────────

interface SimState {
  output: string[];
  history: string[];
  historyIndex: number;
  /** Relative folder path the simulated shell is inside ('' = workspace root). */
  cwd: string;
}

// Resolve a shell-style path against the current cwd (supports /, ./ and ../).
function resolveSimPath(cwd: string, target: string): string {
  if (target.startsWith('/')) return target.replace(/^\/+|\/+$/g, '');
  const combined = cwd ? `${cwd}/${target}` : target;
  const parts: string[] = [];
  for (const part of combined.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function createSimulatedTerminal(
  fs: VirtualFileSystem,
  onOutput: (lines: string[]) => void,
  initialCwd = '',
): {
  execute: (input: string) => void;
  clear: () => void;
  setCwd: (folder: string) => void;
  getState: () => SimState;
} {
  const state: SimState = {
    output: [
      'Welcome to the workspace terminal (offline mode)',
      initialCwd ? `Started inside ${initialCwd}/` : 'Started at the workspace root',
      'Type "help" for available commands',
      '',
    ],
    history: [],
    historyIndex: -1,
    cwd: initialCwd,
  };

  const addOutput = (lines: string | string[]) => {
    const arr = Array.isArray(lines) ? lines : [lines];
    state.output = [...state.output, ...arr];
    onOutput(arr);
  };

  const promptFor = (cmd: string) => `/${state.cwd} $ ${cmd}`;

  // Children of the current cwd (the directory node), or the whole tree for root.
  const currentChildren = (): FSNode[] | null => {
    if (!state.cwd) return fs.getNodes();
    const node = fs.findNode('/' + state.cwd);
    return node?.type === 'directory' ? (node.children ?? []) : null;
  };

  const execute = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    const command = parts[0]?.toLowerCase();

    // Add to history
    state.history.push(trimmed);
    state.historyIndex = state.history.length;

    const promptLine = promptFor(trimmed);

    switch (command) {
      case 'help':
        addOutput([
          promptLine,
          '  help          - Show this help',
          '  ls / dir      - List files',
          '  cd <dir>      - Change folder (cd .. / cd / go up / to root)',
          '  pwd           - Show current path',
          '  cat <file>    - Display file contents',
          '  mkdir <name>  - Create directory',
          '  touch <file>  - Create file',
          '  echo <text>   - Print text',
          '  clear         - Clear screen',
          '  date          - Show date/time',
          '  whoami        - Show user',
          '  node <file>   - Run a .js file (simulated)',
          '',
        ]);
        break;

      case 'ls':
      case 'dir': {
        const nodes = currentChildren();
        if (!nodes) {
          addOutput([promptLine, `ls: cannot access '/${state.cwd}': No such directory`]);
          break;
        }
        addOutput([
          promptLine,
          ...nodes.map((n: any) =>
            n.type === 'directory' ? `  \uD83D\uDCC1 ${n.name}/` : `  \uD83D\uDCC4 ${n.name}`,
          ),
          '',
        ]);
        break;
      }

      case 'cd': {
        const target = parts[1];
        if (!target) {
          state.cwd = '';
          addOutput([promptLine, '/']);
          break;
        }
        const resolved = resolveSimPath(state.cwd, target);
        if (!resolved) {
          state.cwd = '';
          addOutput([promptLine, '/']);
          break;
        }
        const node = fs.findNode('/' + resolved);
        if (node?.type === 'directory') {
          state.cwd = resolved;
          addOutput([promptLine, `/${resolved}`]);
        } else {
          addOutput([promptLine, `cd: ${target}: No such directory`]);
        }
        break;
      }

      case 'pwd':
        addOutput([promptLine, `/${state.cwd}`]);
        break;

      case 'cat': {
        const target = parts[1];
        if (!target) {
          addOutput([promptLine, 'Usage: cat <filename>']);
          break;
        }
        const filePath = '/' + resolveSimPath(state.cwd, target);
        const content = fs.readFile(filePath);
        if (content !== null) {
          addOutput([promptLine, content, '']);
        } else {
          addOutput([promptLine, `cat: ${target}: No such file`]);
        }
        break;
      }

      case 'mkdir': {
        const dir = parts[1];
        if (!dir) {
          addOutput([promptLine, 'Usage: mkdir <dirname>']);
          break;
        }
        const dirPath = '/' + resolveSimPath(state.cwd, dir);
        if (fs.createDirectory(dirPath)) {
          addOutput([promptLine, `Created directory: ${dir}`]);
        } else {
          addOutput([promptLine, `mkdir: ${dir}: File exists`]);
        }
        break;
      }

      case 'touch': {
        const file = parts[1];
        if (!file) {
          addOutput([promptLine, 'Usage: touch <filename>']);
          break;
        }
        const touchPath = '/' + resolveSimPath(state.cwd, file);
        if (fs.createFile(touchPath, '')) {
          addOutput([promptLine, `Created file: ${file}`]);
        } else {
          addOutput([promptLine, `touch: ${file}: File exists`]);
        }
        break;
      }

      case 'echo':
        addOutput([promptLine, trimmed.slice(5).trimLeft() || '']);
        break;

      case 'clear':
        state.output = [''];
        onOutput(['']);
        break;

      case 'node': {
        const script = parts[1];
        if (!script) {
          addOutput([promptLine, 'Usage: node <filename>']);
          break;
        }
        const scriptPath = '/' + resolveSimPath(state.cwd, script);
        const scriptContent = fs.readFile(scriptPath);
        if (scriptContent !== null) {
          addOutput([
            promptLine,
            `[Node.js] Running ${script}...`,
            '\u2501'.repeat(30),
            '[Simulated] Output would appear here in online mode',
            `[Simulated] "${script}" executed`,
            '\u2501'.repeat(30),
            '',
          ]);
        } else {
          addOutput([promptLine, `node: ${script}: No such file`]);
        }
        break;
      }

      case 'date':
        addOutput([promptLine, new Date().toString()]);
        break;

      case 'whoami':
        addOutput([promptLine, 'candidate']);
        break;

      default:
        if (trimmed) {
          addOutput([promptLine, `Command not found: ${command} (offline mode)`]);
        }
    }
  };

  return {
    execute,
    clear: () => {
      state.output = [''];
      onOutput(['']);
    },
    // Update the folder the simulated shell is inside (candidate selected a
    // new folder while the terminal tab stayed open).
    setCwd: (folder: string) => {
      state.cwd = folder;
    },
    getState: () => ({ ...state }),
  };
}

// ── Main Component ──────────────────────────────────

export function WorkspaceTerminal({ sessionId, fs, readOnly = false, cwd = null }: WorkspaceTerminalProps) {
  const [mode, setMode] = useState<TerminalMode>(sessionId ? 'connecting' : 'simulated');
  const [connectionError, setConnectionError] = useState('');
  // The offline (simulated) shell — created lazily on first render so its
  // welcome lines (including the folder it started inside) can seed the
  // visible output right away.
  const simRef = useRef<ReturnType<typeof createSimulatedTerminal> | null>(null);
  const [lines, setLines] = useState<string[]>(() => {
    const sim = createSimulatedTerminal(
      fs,
      (newLines) => setLines((prev) => [...prev, ...newLines]),
      cwd ?? '',
    );
    simRef.current = sim;
    return sessionId
      ? ['Connecting to workspace terminal...', 'Type "help" for available commands', '']
      : sim.getState().output;
  });
  const [simInput, setSimInput] = useState('');

  // The folder the shell is actually running in. A live shell starts only
  // once — when the tab opens or is reconnected — so this is captured then
  // and does NOT follow every folder click (that would tear the socket down
  // and kill the shell plus anything running inside it, e.g. a dev server).
  // The offline shell does follow folder clicks and is kept in sync below.
  const [shellCwd, setShellCwd] = useState<string | null>(cwd);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const simHistoryIndexRef = useRef(-1);
  const simHistoryRef = useRef<string[]>([]);

  // Refs/state for robust reconnection on weak / flaky Wi-Fi
  const modeRef = useRef<TerminalMode>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const [retryToken, setRetryToken] = useState(0);

  // The offline shell follows folder clicks while the tab stays open. A live
  // (real) shell is left untouched — it only starts in the folder selected
  // when it was opened or reconnected (captured by the socket effect below).
  useEffect(() => {
    simRef.current?.setCwd(cwd ?? '');
    // Pure-offline mode has no backend shell, so the displayed folder is
    // always the currently selected one.
    if (!sessionId) {
      setShellCwd(cwd ?? '');
    }
  }, [cwd, sessionId]);

  const fallbackToSimulated = useCallback((reason: string) => {
    setMode('simulated');
    setConnectionError(reason);
    setLines([
      '\u26a0 Real terminal unavailable',
      `  ${reason}`,
      'Switching to offline mode...',
      'Type "help" for available commands',
      'Click "Reconnect" below to try again.',
      '',
    ]);
  }, []);

  const retryConnection = useCallback(() => {
    if (!sessionId) return;
    // Drop the old socket so the effect below creates a fresh one
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
      socketRef.current = null;
    }
    setMode('connecting');
    setConnectionError('');
    setLines(['Connecting to workspace terminal...', 'Type "help" for available commands', '']);
    setRetryToken((t) => t + 1);
  }, [sessionId]);

  // ── Connect to WebSocket ─────────────────────────
  useEffect(() => {
    if (!sessionId) return;

    // Capture the folder the shell will start in for THIS connection. Folder
    // clicks afterwards do not re-run this effect — the shell keeps running.
    setShellCwd(cwd ?? '');
    modeRef.current = 'connecting';

    const socketIo = io('/sandbox/terminal', {
      query: { sessionId, ...(cwd ? { cwd } : {}) },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 6,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
      timeout: 4000,
    });

    socketRef.current = socketIo;

    socketIo.on('connect', () => {
      console.log('Terminal connected');
      setMode('real');
      setConnectionError('');
      // Clear terminal on connect
      if (xtermRef.current) {
        xtermRef.current.clear();
      }
    });

    socketIo.on('data', (data: string) => {
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    });

    socketIo.on('error', (err: { message: string }) => {
      console.error('Terminal WS error:', err.message);
      setConnectionError(err.message);
    });

    socketIo.on('exit', (code: number | null) => {
      console.log(`Shell exited with code ${code}`);
      if (xtermRef.current) {
        xtermRef.current.write(`\r\n\x1b[33mProcess exited (code ${code})\x1b[0m\r\n`);
      }
    });

    socketIo.on('disconnect', (reason) => {
      console.log(`Terminal WS disconnected: ${reason}`);
      if (reason === 'io server disconnect') {
        // Server closed the socket — no automatic reconnect
        socketIo.close();
        fallbackToSimulated('Disconnected by server');
      } else if (modeRef.current === 'real') {
        // Transient network drop — socket.io reconnects automatically
        if (xtermRef.current) {
          xtermRef.current.write(`\r\n\x1b[33mConnection lost (${reason}) — reconnecting...\x1b[0m\r\n`);
        }
      }
    });

    socketIo.on('reconnect_failed', () => {
      console.error('Terminal reconnection failed after multiple attempts');
      fallbackToSimulated('Could not reconnect (check your Wi-Fi / network)');
    });

    socketIo.on('connect_error', (err) => {
      console.error('Terminal connection failed:', err.message);
      setConnectionError(err.message);
      // socket.io keeps retrying automatically — the timeout below switches
      // to offline mode if the very first attempt is still stuck.
    });

    // Timeout fallback: if we still haven't connected (weak/flaky Wi-Fi),
    // fall back to the offline terminal after a few seconds.
    const timeout = setTimeout(() => {
      if (modeRef.current === 'connecting') {
        fallbackToSimulated('Connection timed out (weak Wi-Fi?)');
      }
    }, 6000);

    return () => {
      clearTimeout(timeout);
      socketIo.removeAllListeners();
      socketIo.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, retryToken]);

  // ── Initialize xterm.js ──────────────────────────
  useEffect(() => {
    if (mode !== 'real' || !terminalRef.current || xtermRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', Menlo, Monaco, monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#4ec9b0',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4fc1ff',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#d16969',
        brightGreen: '#4ec9b0',
        brightYellow: '#dcdcaa',
        brightBlue: '#569cd6',
        brightMagenta: '#c586c0',
        brightCyan: '#4fc1ff',
        brightWhite: '#ffffff',
      },
      allowTransparency: false,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    terminal.open(terminalRef.current);
    terminal.focus();

    // Fit terminal to container
    const fitTerminal = () => {
      try {
        fitAddon.fit();
      } catch { /* ignore */ }
    };

    fitTerminal();
    const resizeObserver = new ResizeObserver(() => fitTerminal());
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    // Handle input
    terminal.onData((data: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('input', data);
      }
    });

    // Handle resize
    terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('resize', { cols, rows });
      }
    });

    xtermRef.current = terminal;

    // Write welcome message
    terminal.write('\r\n\x1b[32m\u2714 Connected to workspace shell\x1b[0m\r\n\n');

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      xtermRef.current = null;
    };
  }, [mode]);

  // ── Simulated terminal input handler ─────────────
  const handleSimKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        simRef.current?.execute(simInput);
        simHistoryRef.current.push(simInput);
        simHistoryIndexRef.current = simHistoryRef.current.length;
        setSimInput('');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (simHistoryIndexRef.current > 0) {
          simHistoryIndexRef.current--;
          setSimInput(simHistoryRef.current[simHistoryIndexRef.current] || '');
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (simHistoryIndexRef.current < simHistoryRef.current.length - 1) {
          simHistoryIndexRef.current++;
          setSimInput(simHistoryRef.current[simHistoryIndexRef.current] || '');
        } else {
          simHistoryIndexRef.current = simHistoryRef.current.length;
          setSimInput('');
        }
      }
    },
    [simInput],
  );

  const clearSim = useCallback(() => {
    simRef.current?.clear();
  }, []);

  // ── Render ───────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#333] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-3.5 w-3.5 text-[#888]" />
          <span className="text-xs text-[#aaa]">
            {mode === 'connecting' && 'Connecting...'}
            {mode === 'real' && 'bash'}
            {mode === 'simulated' && 'Terminal (offline)'}
            {mode === 'failed' && 'Terminal (disconnected)'}
          </span>
          {shellCwd && (
            <span className="text-xs text-[#666]" title="Terminal working directory">
              · /{shellCwd}
            </span>
          )}
          {/* Connection indicator */}
          {mode === 'connecting' && (
            <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />
          )}
          {mode === 'real' && (
            <Wifi className="h-3 w-3 text-green-400" />
          )}
          {(mode === 'simulated' || mode === 'failed') && (
            <WifiOff className="h-3 w-3 text-yellow-500" />
          )}
        </div>

        {(mode === 'simulated' || mode === 'failed') && sessionId && (
          <button
            onClick={retryConnection}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#aaa] hover:text-white hover:bg-[#333] transition-colors"
            title="Reconnect to the real terminal"
          >
            <Wifi className="h-3 w-3 text-yellow-500" />
            Reconnect
          </button>
        )}
        {mode !== 'real' && (
          <button
            onClick={clearSim}
            className="rounded p-1 text-[#888] hover:text-white hover:bg-[#333] transition-colors"
            title="Clear terminal"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Terminal body */}
      <div className="relative flex-1 overflow-hidden">
        {/* Real xterm terminal */}
        {mode === 'real' && (
          <div
            ref={terminalRef}
            className="h-full w-full"
          />
        )}

        {/* Simulated terminal (fallback) */}
        {(mode === 'simulated' || mode === 'failed') && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto p-3 font-mono text-sm leading-5 text-[#d4d4d4]">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'whitespace-pre-wrap',
                    line.startsWith('\u26a0') && 'text-yellow-400',
                    line.startsWith('$ ') && 'text-[#4ec9b0]',
                    line.startsWith('  \uD83D\uDCC1') && 'text-[#dcdcaa]',
                    line.startsWith('  \uD83D\uDCC4') && 'text-[#9cdcfe]',
                    (line.startsWith('[Simulated]') || line.startsWith('\u2501')) && 'text-[#666] italic',
                  )}
                >
                  {line}
                </div>
              ))}
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[#4ec9b0] shrink-0">$</span>
                <input
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  onKeyDown={handleSimKeyDown}
                  className="flex-1 bg-transparent border-0 text-[#d4d4d4] font-mono text-sm outline-none caret-[#d4d4d4]"
                  placeholder="Type a command..."
                  autoFocus
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>
        )}

        {/* Connecting overlay */}
        {mode === 'connecting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1e1e1e]/90 px-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            <p className="mt-3 text-sm text-[#aaa]">Connecting to shell...</p>
            <p className="mt-1 text-xs text-[#666]">session: {sessionId?.slice(0, 8)}...</p>
            {connectionError && (
              <p className="mt-2 text-xs text-yellow-500">\u26a0 {connectionError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceTerminal;
