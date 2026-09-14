import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminTradeEnvironmentsPage } from '@pages/admin/trade-environments';
import type { Trade } from '@app_types/index';

// ── Mocks ──────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  listTrades: vi.fn(),
  updateTrade: vi.fn(),
}));

vi.mock('@services/trade-service', () => ({
  tradeService: {
    listTrades: (...args: unknown[]) => mocks.listTrades(...args),
    updateTrade: (...args: unknown[]) => mocks.updateTrade(...args),
  },
}));

// ── Fixtures ───────────────────────────────────────
function trade(over: Partial<Trade> & { id: string; name: string; code: string }): Trade {
  return {
    description: '',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

// - SWD: no configured workspaceTools → built-in default (all 7 tools).
// - NET: configured to a narrow set (differs from its built-in default so
//   Reset has something meaningful to restore).
// - TRM: no configured workspaceTools → built-in default (tourism set).
const SWD = trade({ id: 't-swd', name: 'Software Development', code: 'SWD' });
const NET = trade({
  id: 't-net',
  name: 'Networking',
  code: 'NET',
  workspaceTools: ['CODE_EDITOR'],
});
const TRM = trade({ id: 't-trm', name: 'Tourism', code: 'TRM' });

// ── Helpers ────────────────────────────────────────
// Scope queries to one trade's card (each trade renders its own grid).
function tradeCard(name: string) {
  const heading = screen.getByText(name);
  const card = heading.closest('.rounded-xl');
  if (!card) throw new Error(`Trade card not found for ${name}`);
  return within(card as HTMLElement);
}

function toolButton(card: ReturnType<typeof tradeCard>, label: string) {
  // The main tool toggle carries aria-pressed; the lock button does not, so
  // filter it out (its name also contains the tool label, e.g. "Lock Terminal").
  const buttons = card.getAllByRole('button', { name: new RegExp(label) });
  const main = buttons.find((b) => b.hasAttribute('aria-pressed'));
  if (!main) throw new Error(`Tool button not found for ${label}`);
  return main;
}

// Built-in per-trade defaults from frontend/src/lib/workspace-tools.ts.
// Display labels are used for the grid's aria-pressed checks; the Save payload
// carries tool IDs.
const SWD_DEFAULTS = [
  'File Explorer', 'Code Editor', 'Terminal', 'Diagram Editor', 'Database Console', 'Live Preview', 'File Upload',
];
const TRM_DEFAULTS = ['File Explorer', 'Diagram Editor', 'Live Preview', 'File Upload'];
const NET_DEFAULTS = ['File Explorer', 'Code Editor', 'Terminal', 'Diagram Editor', 'File Upload'];
const NET_DEFAULT_IDS = ['FILE_EXPLORER', 'CODE_EDITOR', 'TERMINAL', 'DIAGRAM_EDITOR', 'FILE_UPLOAD'];

// ── Tests ──────────────────────────────────────────

describe('AdminTradeEnvironmentsPage — per-trade default workspace tools', () => {
  beforeEach(() => {
    mocks.listTrades.mockReset();
    mocks.updateTrade.mockReset();
    mocks.listTrades.mockResolvedValue([SWD, NET, TRM]);
  });

  it('pre-selects the built-in defaults for trades without a configured environment', async () => {
    render(<AdminTradeEnvironmentsPage />);

    await screen.findByText('Software Development');

    // SWD is unconfigured → the built-in default (all tools) is selected.
    const swd = tradeCard('Software Development');
    for (const label of SWD_DEFAULTS) {
      expect(toolButton(swd, label)).toHaveAttribute('aria-pressed', 'true');
    }

    // TRM is unconfigured → the built-in tourism environment is selected and
    // the tools outside it are not.
    const trm = tradeCard('Tourism');
    for (const label of TRM_DEFAULTS) {
      expect(toolButton(trm, label)).toHaveAttribute('aria-pressed', 'true');
    }
    for (const label of ['Code Editor', 'Terminal', 'Database Console']) {
      expect(toolButton(trm, label)).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('pre-selects the configured environment for a trade and leaves the rest unselected', async () => {
    render(<AdminTradeEnvironmentsPage />);

    await screen.findByText('Networking');

    const net = tradeCard('Networking');
    // NET's DB-configured value is CODE_EDITOR only.
    expect(toolButton(net, 'Code Editor')).toHaveAttribute('aria-pressed', 'true');
    for (const label of ['File Explorer', 'Terminal', 'Diagram Editor', 'Database Console', 'Live Preview', 'File Upload']) {
      expect(toolButton(net, label)).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('saves the toggled tool selection for a trade via updateTrade', async () => {
    mocks.updateTrade.mockResolvedValue({
      ...NET,
      workspaceTools: ['CODE_EDITOR', 'DATABASE'],
    });
    render(<AdminTradeEnvironmentsPage />);

    await screen.findByText('Networking');

    const net = tradeCard('Networking');
    // Turn on the Database Console for the NET trade, then save.
    fireEvent.click(toolButton(net, 'Database Console'));
    fireEvent.click(net.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(mocks.updateTrade).toHaveBeenCalledTimes(1));
    expect(mocks.updateTrade).toHaveBeenCalledWith('t-net', {
      workspaceTools: ['CODE_EDITOR', 'DATABASE'],
      lockedWorkspaceTools: [],
    });
    expect(
      await screen.findByText(/"Networking" working environment saved/),
    ).toBeInTheDocument();
  });

  it('restores the built-in default for the trade when Reset is clicked', async () => {
    mocks.updateTrade.mockResolvedValue({
      ...NET,
      workspaceTools: [...NET_DEFAULT_IDS],
    });
    render(<AdminTradeEnvironmentsPage />);

    await screen.findByText('Networking');

    const net = tradeCard('Networking');
    fireEvent.click(net.getByRole('button', { name: /Reset/ }));

    // NET's built-in default (networking set) is restored.
    for (const label of NET_DEFAULTS) {
      expect(toolButton(net, label)).toHaveAttribute('aria-pressed', 'true');
    }
    for (const label of ['Database Console', 'Live Preview']) {
      expect(toolButton(net, label)).toHaveAttribute('aria-pressed', 'false');
    }
    // The Save button now persists the restored default.
    fireEvent.click(net.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(mocks.updateTrade).toHaveBeenCalledTimes(1));
    expect(mocks.updateTrade).toHaveBeenCalledWith('t-net', {
      workspaceTools: [...NET_DEFAULT_IDS],
      lockedWorkspaceTools: [],
    });
  });
});
