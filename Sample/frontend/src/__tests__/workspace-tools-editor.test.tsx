import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  WorkspaceToolsEditor,
  WorkspaceToolsGrid,
  WORKSPACE_TOOLS,
  WORKSPACE_PRESETS,
  ALL_WORKSPACE_TOOLS,
  effectiveWorkspaceTools,
  sanitizeWorkspaceTools,
  defaultWorkspaceToolsForTrade,
  resolveTradeWorkspaceDefaults,
  TRADE_WORKSPACE_DEFAULTS,
} from '@pages/admin/components/workspace-tools-editor';

describe('WorkspaceToolsEditor', () => {
  it('renders every tool and reports the selected count', () => {
    render(
      <WorkspaceToolsEditor
        tools={['CODE_EDITOR', 'TERMINAL']}
        onChange={() => {}}
        onSave={() => {}}
        saving={false}
        error=""
        success=""
      />,
    );

    for (const tool of WORKSPACE_TOOLS) {
      expect(screen.getByText(tool.label)).toBeInTheDocument();
    }
    expect(screen.getByText('2 of 7 tools selected')).toBeInTheDocument();
  });

  it('toggles a tool through onChange', () => {
    const onChange = vi.fn();
    render(
      <WorkspaceToolsEditor
        tools={['CODE_EDITOR']}
        onChange={onChange}
        onSave={() => {}}
        saving={false}
        error=""
        success=""
      />,
    );

    // Select an unselected tool
    fireEvent.click(screen.getByText('Terminal'));
    expect(onChange).toHaveBeenLastCalledWith(['CODE_EDITOR', 'TERMINAL']);

    // Deselect a selected tool
    fireEvent.click(screen.getByText('Code Editor'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('renders every quick-pick preset with an icon and label', () => {
    render(
      <WorkspaceToolsGrid tools={['CODE_EDITOR']} onChange={() => {}} />,
    );

    expect(screen.getByText('Quick pick')).toBeInTheDocument();
    for (const preset of WORKSPACE_PRESETS) {
      expect(screen.getByRole('button', { name: new RegExp(preset.label) })).toBeInTheDocument();
    }
  });

  it('applies a preset through onChange, replacing the selection', () => {
    const onChange = vi.fn();
    render(
      <WorkspaceToolsGrid tools={['CODE_EDITOR', 'TERMINAL', 'BROWSER_PREVIEW']} onChange={onChange} />,
    );

    // Database only → FILE_EXPLORER, TERMINAL, DATABASE
    fireEvent.click(screen.getByRole('button', { name: /database only/i }));
    expect(onChange).toHaveBeenLastCalledWith(['FILE_EXPLORER', 'TERMINAL', 'DATABASE']);

    // Full stack → all tools
    fireEvent.click(screen.getByRole('button', { name: /full stack/i }));
    expect(onChange).toHaveBeenLastCalledWith(ALL_WORKSPACE_TOOLS);
  });

  it('marks the preset that matches the current selection as active', () => {
    const { rerender } = render(
      <WorkspaceToolsGrid tools={['CODE_EDITOR', 'TERMINAL', 'FILE_EXPLORER', 'BROWSER_PREVIEW']} onChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /code only/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /full stack/i })).toHaveAttribute('aria-pressed', 'false');

    // Order must not matter — same set, different order, still active
    rerender(
      <WorkspaceToolsGrid tools={['BROWSER_PREVIEW', 'FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL']} onChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /code only/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders a trade-default chip when the exam trade is known', () => {
    const netTools = defaultWorkspaceToolsForTrade('NET');
    render(
      <WorkspaceToolsGrid
        tools={netTools}
        onChange={() => {}}
        tradeDefaultTools={netTools}
        tradeDefaultLabel="Networking default"
      />,
    );

    const chip = screen.getByRole('button', { name: /networking default/i });
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render a trade-default chip when no trade default is given', () => {
    render(<WorkspaceToolsGrid tools={['CODE_EDITOR']} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /default/i })).not.toBeInTheDocument();
  });

  it('applies the trade default through onChange, replacing the selection', () => {
    const onChange = vi.fn();
    const trmTools = defaultWorkspaceToolsForTrade('TRM');
    render(
      <WorkspaceToolsGrid
        tools={['CODE_EDITOR']}
        onChange={onChange}
        tradeDefaultTools={trmTools}
        tradeDefaultLabel="Tourism default"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /tourism default/i }));
    expect(onChange).toHaveBeenLastCalledWith(trmTools);
  });

  it('calls onSave from the Save button', () => {
    const onSave = vi.fn();
    render(
      <WorkspaceToolsEditor
        tools={['CODE_EDITOR']}
        onChange={() => {}}
        onSave={onSave}
        saving={false}
        error=""
        success=""
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /save tools/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('surfaces save errors and success messages', () => {
    const { rerender } = render(
      <WorkspaceToolsEditor
        tools={['CODE_EDITOR']}
        onChange={() => {}}
        onSave={() => {}}
        saving={false}
        error="Select at least one workspace tool"
        success=""
      />,
    );
    expect(screen.getByText('Select at least one workspace tool')).toBeInTheDocument();

    rerender(
      <WorkspaceToolsEditor
        tools={['CODE_EDITOR']}
        onChange={() => {}}
        onSave={() => {}}
        saving={false}
        error=""
        success="Workspace tools saved"
      />,
    );
    expect(screen.getByText('Workspace tools saved')).toBeInTheDocument();
  });
});

describe('WorkspaceToolsGrid locking', () => {
  it('renders lock controls for every tool when onChangeLocked is provided', () => {
    render(
      <WorkspaceToolsGrid
        tools={['CODE_EDITOR']}
        onChange={() => {}}
        lockedTools={['CODE_EDITOR']}
        onChangeLocked={() => {}}
      />,
    );

    // The locked tool offers "Unlock", every other tool offers "Lock"
    expect(screen.getByRole('button', { name: /unlock code editor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lock terminal/i })).toBeInTheDocument();
  });

  it('hides lock controls when onChangeLocked is omitted', () => {
    render(
      <WorkspaceToolsGrid
        tools={['CODE_EDITOR']}
        onChange={() => {}}
        lockedTools={['CODE_EDITOR']}
      />,
    );
    expect(screen.queryByRole('button', { name: /lock|unlock/i })).not.toBeInTheDocument();
  });

  it('locking a tool that is off forces it on', () => {
    const onChange = vi.fn();
    const onChangeLocked = vi.fn();
    render(
      <WorkspaceToolsGrid
        tools={['CODE_EDITOR']}
        onChange={onChange}
        lockedTools={[]}
        onChangeLocked={onChangeLocked}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /lock terminal/i }));
    expect(onChangeLocked).toHaveBeenLastCalledWith(['TERMINAL']);
    expect(onChange).toHaveBeenLastCalledWith(['CODE_EDITOR', 'TERMINAL']);
  });

  it('clicking a locked tool never deselects it', () => {
    const onChange = vi.fn();
    render(
      <WorkspaceToolsGrid
        tools={['CODE_EDITOR', 'TERMINAL']}
        onChange={onChange}
        lockedTools={['TERMINAL']}
        onChangeLocked={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('Terminal'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('unlocking keeps the tool selected but no longer locks it', () => {
    const onChangeLocked = vi.fn();
    render(
      <WorkspaceToolsGrid
        tools={['CODE_EDITOR', 'TERMINAL']}
        onChange={() => {}}
        lockedTools={['TERMINAL']}
        onChangeLocked={onChangeLocked}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /unlock terminal/i }));
    expect(onChangeLocked).toHaveBeenLastCalledWith([]);
  });

  it('presets never drop locked tools from the selection', () => {
    const onChange = vi.fn();
    render(
      <WorkspaceToolsGrid
        tools={['CODE_EDITOR', 'TERMINAL']}
        onChange={onChange}
        lockedTools={['DATABASE']}
        onChangeLocked={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /database only/i }));
    expect(onChange).toHaveBeenLastCalledWith(expect.arrayContaining(['DATABASE']));
  });

  it('reports the locked count in the footer', () => {
    render(
      <WorkspaceToolsGrid
        tools={['CODE_EDITOR', 'TERMINAL']}
        onChange={() => {}}
        lockedTools={['TERMINAL']}
        onChangeLocked={() => {}}
      />,
    );
    expect(screen.getByText('2 of 7 tools selected · 1 locked')).toBeInTheDocument();
  });
});

describe('sanitizeWorkspaceTools', () => {
  it('keeps known tools and filters unknown ids', () => {
    expect(sanitizeWorkspaceTools(['CODE_EDITOR', 'NOT_A_TOOL', 'DATABASE'])).toEqual([
      'CODE_EDITOR',
      'DATABASE',
    ]);
  });

  it('returns an empty list for missing/empty input (no all-tools fallback)', () => {
    expect(sanitizeWorkspaceTools(undefined)).toEqual([]);
    expect(sanitizeWorkspaceTools(null)).toEqual([]);
    expect(sanitizeWorkspaceTools([])).toEqual([]);
  });
});

describe('effectiveWorkspaceTools', () => {
  it('returns all tools for empty/missing selections (legacy exams)', () => {
    expect(effectiveWorkspaceTools(undefined)).toEqual(ALL_WORKSPACE_TOOLS);
    expect(effectiveWorkspaceTools(null)).toEqual(ALL_WORKSPACE_TOOLS);
    expect(effectiveWorkspaceTools([])).toEqual(ALL_WORKSPACE_TOOLS);
  });

  it('keeps known tools and filters unknown ids', () => {
    expect(effectiveWorkspaceTools(['CODE_EDITOR', 'NOT_A_TOOL', 'DATABASE'])).toEqual([
      'CODE_EDITOR',
      'DATABASE',
    ]);
  });
});

describe('defaultWorkspaceToolsForTrade', () => {
  it('returns the trade-specific working environment by code', () => {
    expect(defaultWorkspaceToolsForTrade('NET')).toEqual(TRADE_WORKSPACE_DEFAULTS.NET);
    expect(defaultWorkspaceToolsForTrade('swd')).toEqual(TRADE_WORKSPACE_DEFAULTS.SWD);
    expect(defaultWorkspaceToolsForTrade('TRM')).toEqual(TRADE_WORKSPACE_DEFAULTS.TRM);
  });

  it('falls back to all tools for unknown or absent trades (legacy)', () => {
    expect(defaultWorkspaceToolsForTrade('XYZ')).toEqual(ALL_WORKSPACE_TOOLS);
    expect(defaultWorkspaceToolsForTrade(undefined)).toEqual(ALL_WORKSPACE_TOOLS);
    expect(defaultWorkspaceToolsForTrade(null)).toEqual(ALL_WORKSPACE_TOOLS);
    expect(defaultWorkspaceToolsForTrade('')).toEqual(ALL_WORKSPACE_TOOLS);
  });

  it('covers every seeded trade so no trade silently falls back', () => {
    expect(TRADE_WORKSPACE_DEFAULTS.SWD).toEqual(ALL_WORKSPACE_TOOLS);
    const allDefaults = Object.values(TRADE_WORKSPACE_DEFAULTS) as string[][];
    for (const tools of allDefaults) {
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.every((t) => ALL_WORKSPACE_TOOLS.includes(t as any))).toBe(true);
    }
  });
});

describe('resolveTradeWorkspaceDefaults', () => {
  it('prefers the DB-configured workspaceTools when set', () => {
    const trade = { code: 'NET', workspaceTools: ['CODE_EDITOR', 'FILE_UPLOAD'] };
    expect(resolveTradeWorkspaceDefaults(trade)).toEqual(['CODE_EDITOR', 'FILE_UPLOAD']);
  });

  it('falls back to the built-in per-trade defaults when DB value is empty', () => {
    expect(resolveTradeWorkspaceDefaults({ code: 'NET', workspaceTools: [] })).toEqual(
      TRADE_WORKSPACE_DEFAULTS.NET,
    );
    expect(resolveTradeWorkspaceDefaults({ code: 'NET', workspaceTools: null })).toEqual(
      TRADE_WORKSPACE_DEFAULTS.NET,
    );
  });

  it('falls back to built-in defaults when DB value is absent', () => {
    expect(resolveTradeWorkspaceDefaults({ code: 'TRM' })).toEqual(TRADE_WORKSPACE_DEFAULTS.TRM);
  });

  it('falls back to all tools for null/undefined trade', () => {
    expect(resolveTradeWorkspaceDefaults(null)).toEqual(ALL_WORKSPACE_TOOLS);
    expect(resolveTradeWorkspaceDefaults(undefined)).toEqual(ALL_WORKSPACE_TOOLS);
  });

  it('falls back to all tools for unknown trade codes without DB config', () => {
    expect(resolveTradeWorkspaceDefaults({ code: 'XYZ' })).toEqual(ALL_WORKSPACE_TOOLS);
  });
});
