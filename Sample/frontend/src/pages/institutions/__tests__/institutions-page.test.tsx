import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InstitutionsPage } from '../index';
import { organizationService } from '@services/organization-service';
import { subscriptionService } from '@services/subscription-service';
import type { SeatTrendRow } from '@services/dashboard-service';
import type { Organization } from '../../../types';

vi.mock('@services/organization-service', () => ({
  organizationService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('@services/subscription-service', () => ({
  subscriptionService: {
    getOrgStats: vi.fn(),
    getOrgStatsById: vi.fn(),
  },
}));

function mockTrend(): SeatTrendRow[] {
  return [
    { month: 'March', year: 2026, seatsConsumed: 4 },
    { month: 'April', year: 2026, seatsConsumed: 3 },
    { month: 'May', year: 2026, seatsConsumed: 2 },
    { month: 'June', year: 2026, seatsConsumed: 1 },
    { month: 'July', year: 2026, seatsConsumed: 0 },
    { month: 'August', year: 2026, seatsConsumed: 2 },
  ];
}

function mockStats(overrides: { seatUsageTrend?: SeatTrendRow[] } = {}) {
  vi.mocked(subscriptionService.getOrgStatsById).mockResolvedValue({
    totalUsers: 3,
    totalCandidates: 12,
    totalExams: 1,
    activeExams: 0,
    completedAssessments: 2,
    passRate: 50,
    averageScore: 65,
    totalCertificates: 1,
    seatUsageTrend: overrides.seatUsageTrend ?? mockTrend(),
    usage: null,
  } as any);
}

// The detail panel fetches org stats whenever it opens. Default the mock to an
// empty trend so tests not focused on the trend (deep link, keyboard, seat
// column) never crash the tree on an unmocked call. describe-level beforeEach
// blocks clear calls but keep this implementation (clearAllMocks does not reset
// implementations).
beforeEach(() => {
  vi.mocked(subscriptionService.getOrgStatsById).mockResolvedValue({
    seatUsageTrend: [],
  } as any);
});

function orgFixture(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'CodeBridge Academy',
    code: 'CB',
    organizationType: 'TVET_SCHOOL',
    isVerified: true,
    isActive: true,
    subscriptionStatus: 'ACTIVE',
    maxUsers: 50,
    maxCandidates: 100,
    maxJobPostings: 10,
    totalCandidates: 80,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockList(orgs: Organization[]) {
  vi.mocked(organizationService.list).mockResolvedValue({
    data: orgs,
    meta: { page: 1, limit: 20, totalItems: orgs.length, totalPages: 1 },
  } as any);
}

function renderPage(initialEntry = '/organizations') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <InstitutionsPage />
    </MemoryRouter>,
  );
}

describe('InstitutionsPage — seat quota column', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList([orgFixture()]);
  });

  it('renders a Seats column with the used/max meter per organization', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CodeBridge Academy')).toBeInTheDocument();
      expect(screen.getByText('Seats')).toBeInTheDocument();
      expect(screen.getByText('80/100')).toBeInTheDocument();
    });
  });

  it('shows Unlimited seats for uncapped plans', async () => {
    mockList([orgFixture({ maxCandidates: 999999, totalCandidates: 80 })]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('80/Unlimited')).toBeInTheDocument();
    });
  });

  it('marks the seats meter at capacity', async () => {
    mockList([orgFixture({ maxCandidates: 80, totalCandidates: 80 })]);

    renderPage();

    await waitFor(() => {
      // Full seat usage renders in the error color
      expect(screen.getByText('80/80').className).toContain('text-error');
    });
  });

  it('defaults missing seat counts to 0 used', async () => {
    mockList([orgFixture({ totalCandidates: undefined })]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('0/100')).toBeInTheDocument();
    });
  });
});

describe('InstitutionsPage — ?org= deep link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the detail panel for an org present in the loaded list', async () => {
    mockList([orgFixture()]);

    renderPage('/organizations?org=org-1');

    await waitFor(() => {
      // jsdom renders both the desktop + mobile panels (Tailwind hidden/lg:block
      // classes don't hide anything in jsdom) — assert at least one is open.
      expect(screen.getAllByText('Organization Details').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Max Candidates').length).toBeGreaterThan(0);
    });
    // No extra fetch needed — the org came from the list
    expect(organizationService.getById).not.toHaveBeenCalled();
  });

  it('fetches the org by id when it is not on the current list page', async () => {
    mockList([]); // deep-linked org is on another page
    vi.mocked(organizationService.getById).mockResolvedValue(
      orgFixture({ id: 'org-99', name: 'Far Away College' }),
    );

    renderPage('/organizations?org=org-99');

    await waitFor(() => {
      expect(organizationService.getById).toHaveBeenCalledWith('org-99');
      expect(screen.getAllByText('Organization Details').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Far Away College').length).toBeGreaterThan(0);
    });
  });

  it('does not re-fetch the deep-linked org when the list refreshes', async () => {
    mockList([]); // org comes via the getById fallback
    vi.mocked(organizationService.getById).mockResolvedValue(orgFixture({ id: 'org-99' }));

    renderPage('/organizations?org=org-99');

    await waitFor(() => {
      expect(screen.getAllByText('Organization Details').length).toBeGreaterThan(0);
    });
    expect(organizationService.getById).toHaveBeenCalledTimes(1);

    // A list refresh re-runs the deep-link effect — the fallback must not fire
    // again for the already-resolved org id.
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => {
      expect(organizationService.list).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getAllByText('Organization Details').length).toBeGreaterThan(0);
    });
    expect(organizationService.getById).toHaveBeenCalledTimes(1);
  });

  it('leaves the panel closed when the deep-linked org cannot be loaded', async () => {
    mockList([]);
    vi.mocked(organizationService.getById).mockRejectedValue(new Error('404'));

    renderPage('/organizations?org=org-missing');

    await waitFor(() => {
      expect(organizationService.getById).toHaveBeenCalledWith('org-missing');
      expect(screen.queryByText('Organization Details')).not.toBeInTheDocument();
    });
  });

  it('clears the panel (and closes the panel) when a row is re-clicked', async () => {
    mockList([orgFixture()]);

    renderPage('/organizations?org=org-1');

    await waitFor(() => {
      expect(screen.getAllByText('Organization Details').length).toBeGreaterThan(0);
    });

    // Re-clicking the selected row closes the panel (the org name also shows
    // in the open panel, so target the first match = the table row)
    fireEvent.click(screen.getAllByText('CodeBridge Academy')[0]!);
    await waitFor(() => {
      expect(screen.queryByText('Organization Details')).not.toBeInTheDocument();
    });
  });
});

describe('InstitutionsPage — org seat trend in the detail panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList([orgFixture()]);
  });

  it('fetches the org stats once and renders the Seat Usage Trend card', async () => {
    mockStats();

    renderPage('/organizations?org=org-1');

    await waitFor(() => {
      // The stats fetch is lifted into the page so the two mounted panels
      // (desktop + mobile sheet — jsdom ignores the responsive hidden classes)
      // share a single request.
      expect(subscriptionService.getOrgStatsById).toHaveBeenCalledTimes(1);
      expect(subscriptionService.getOrgStatsById).toHaveBeenCalledWith('org-1');
    });

    await waitFor(() => {
      // jsdom mounts the desktop side panel AND the mobile sheet
      expect(screen.getAllByText('Seat Usage Trend').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Seats consumed').length).toBeGreaterThan(0);
      // Month labels come from the trend rows (Mar, Apr, ...)
      expect(screen.getAllByText('Mar').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Aug').length).toBeGreaterThan(0);
    });
  });

  it('keeps the trend card hidden when the org has no seat data', async () => {
    mockStats({ seatUsageTrend: [] });

    renderPage('/organizations?org=org-1');

    await waitFor(() => {
      expect(subscriptionService.getOrgStatsById).toHaveBeenCalledWith('org-1');
    });
    await waitFor(() => {
      // The panel still opens — only the chart is omitted
      expect(screen.getAllByText('Organization Details').length).toBeGreaterThan(0);
      expect(screen.queryByText('Seat Usage Trend')).not.toBeInTheDocument();
    });
  });

  it('keeps the trend card hidden when the stats fetch fails', async () => {
    vi.mocked(subscriptionService.getOrgStatsById).mockRejectedValue(new Error('network'));

    renderPage('/organizations?org=org-1');

    await waitFor(() => {
      expect(screen.getAllByText('Organization Details').length).toBeGreaterThan(0);
      expect(screen.queryByText('Seat Usage Trend')).not.toBeInTheDocument();
    });
  });

  it('refetches the trend when a different org is selected', async () => {
    mockStats();
    mockList([orgFixture(), orgFixture({ id: 'org-2', name: 'Second College' })]);

    renderPage('/organizations?org=org-1');

    await waitFor(() => {
      expect(subscriptionService.getOrgStatsById).toHaveBeenCalledTimes(1);
      expect(subscriptionService.getOrgStatsById).toHaveBeenCalledWith('org-1');
    });

    fireEvent.click(screen.getByText('Second College'));
    await waitFor(() => {
      expect(subscriptionService.getOrgStatsById).toHaveBeenCalledTimes(2);
      expect(subscriptionService.getOrgStatsById).toHaveBeenLastCalledWith('org-2');
    });
  });
});

describe('InstitutionsPage — keyboard accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList([orgFixture()]);
  });

  it('marks each row as a focusable button announcing the org', async () => {
    renderPage();

    await waitFor(() => {
      const row = screen.getByRole('button', { name: 'Open details for CodeBridge Academy' });
      expect(row).toBeInTheDocument();
      expect(row.getAttribute('tabindex')).toBe('0');
    });
  });

  it('opens the detail panel with the Enter key', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open details for CodeBridge Academy' })).toBeInTheDocument();
    });

    fireEvent.keyDown(screen.getByRole('button', { name: 'Open details for CodeBridge Academy' }), {
      key: 'Enter',
      code: 'Enter',
    });

    await waitFor(() => {
      expect(screen.getAllByText('Organization Details').length).toBeGreaterThan(0);
    });
  });

  it('opens the detail panel with the Space key', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open details for CodeBridge Academy' })).toBeInTheDocument();
    });

    fireEvent.keyDown(screen.getByRole('button', { name: 'Open details for CodeBridge Academy' }), {
      key: ' ',
      code: 'Space',
    });

    await waitFor(() => {
      expect(screen.getAllByText('Organization Details').length).toBeGreaterThan(0);
    });
  });

  it('closes the panel with Enter when the row is already selected', async () => {
    renderPage('/organizations?org=org-1');

    await waitFor(() => {
      expect(screen.getAllByText('Organization Details').length).toBeGreaterThan(0);
    });

    // With the panel open the row is announced as "Close details for ..."
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close details for CodeBridge Academy' }), {
      key: 'Enter',
      code: 'Enter',
    });

    await waitFor(() => {
      expect(screen.queryByText('Organization Details')).not.toBeInTheDocument();
    });
  });

  it('ignores key events from the inner Details button (no double-toggle)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    // The row's onKeyDown must ignore key events originating from its child
    // controls — otherwise pressing Enter on the Details button would toggle
    // the panel once via the button and again via the bubbled row handler.
    // (jsdom's fireEvent.keyDown doesn't synthesize the button's native click,
    // so this isolates the row handler's guard.)
    fireEvent.keyDown(screen.getByText('Details'), {
      key: 'Enter',
      code: 'Enter',
    });

    await waitFor(() => {
      expect(screen.queryByText('Organization Details')).not.toBeInTheDocument();
    });
  });
});
