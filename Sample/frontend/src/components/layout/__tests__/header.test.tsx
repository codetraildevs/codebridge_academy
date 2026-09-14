import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from '../header';
import { SidebarProvider } from '@components/ui/sidebar';
import { useAuthStore } from '@stores/auth-store';
import { roleService, type Role } from '@services/role-service';
import { notificationsApi, type InboxItem } from '@services/notifications-service';

// ── Mocks ──────────────────────────────────
vi.mock('@services/role-service', () => ({
  roleService: { list: vi.fn() },
}));

vi.mock('@services/notifications-service', () => ({
  notificationsApi: {
    getInbox: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

const mockInboxItems: InboxItem[] = [
  {
    id: 'sub-1',
    kind: 'review',
    title: 'SQL Database Design',
    description: 'Jane Doe submitted for review',
    route: '/assessor-review',
    isRead: false,
    timestamp: new Date().toISOString(),
  },
];

const mockRoles = [
  { id: '1', name: 'PLATFORM_OWNER', description: 'Full platform access', permissions: [] },
] as unknown as Role[];

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderHeader() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <SidebarProvider>
          <Header />
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Header — live notification badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'admin@codebridge.academy',
        firstName: 'Platform',
        lastName: 'Owner',
        role: 'PLATFORM_OWNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
    vi.mocked(roleService.list).mockResolvedValue(mockRoles);
  });

  it('shows the unread count from the real inbox on the bell', async () => {
    vi.mocked(notificationsApi.getInbox).mockResolvedValue({
      items: mockInboxItems,
      unread: 5,
    });

    renderHeader();

    const bell = await screen.findByRole('button', { name: /notifications, 5 unread/i });
    expect(within(bell).getByText('5')).toBeInTheDocument();
  });

  it('hides the badge when there are no unread items', async () => {
    vi.mocked(notificationsApi.getInbox).mockResolvedValue({ items: [], unread: 0 });

    renderHeader();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^notifications$/i })).toBeInTheDocument();
    });
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('caps large counts at 99+', async () => {
    vi.mocked(notificationsApi.getInbox).mockResolvedValue({
      items: mockInboxItems,
      unread: 120,
    });

    renderHeader();

    const bell = await screen.findByRole('button', { name: /notifications, 120 unread/i });
    expect(within(bell).getByText('99+')).toBeInTheDocument();
  });
});

describe('Header — notification dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'admin@codebridge.academy',
        firstName: 'Platform',
        lastName: 'Owner',
        role: 'PLATFORM_OWNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
    vi.mocked(roleService.list).mockResolvedValue(mockRoles);
    vi.mocked(notificationsApi.getInbox).mockResolvedValue({
      items: [...mockInboxItems],
      unread: 1,
    });
  });

  it('opens on bell click and lists the current notifications', async () => {
    renderHeader();

    fireEvent.click(await screen.findByRole('button', { name: /notifications, 1 unread/i }));

    expect(await screen.findByText('SQL Database Design')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe submitted for review')).toBeInTheDocument();
    expect(notificationsApi.getInbox).toHaveBeenCalled();
  });

  it('shows an empty state when there is nothing to report', async () => {
    vi.mocked(notificationsApi.getInbox).mockResolvedValue({ items: [], unread: 0 });

    renderHeader();

    fireEvent.click(await screen.findByRole('button', { name: /^notifications$/i }));

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });

  it('navigates to the item route on click and closes the dropdown', async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<SidebarProvider><Header /></SidebarProvider>} />
            <Route path="/assessor-review" element={<div>Review Center Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /notifications, 1 unread/i }));
    fireEvent.click(await screen.findByRole('button', { name: /sql database design/i }));

    expect(await screen.findByText('Review Center Page')).toBeInTheDocument();
    expect(notificationsApi.markRead).toHaveBeenCalledWith('sub-1');
    expect(screen.queryByText('SQL Database Design')).not.toBeInTheDocument();
  });

  it('marks all read from the dropdown footer', async () => {
    renderHeader();

    fireEvent.click(await screen.findByRole('button', { name: /notifications, 1 unread/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mark all read/i }));

    // React Query defers the mutationFn until after the commit phase, so wait
    // for the API call instead of asserting synchronously.
    await waitFor(() => expect(notificationsApi.markAllRead).toHaveBeenCalled());
  });

  it('closes the dropdown on Escape', async () => {
    renderHeader();

    fireEvent.click(await screen.findByRole('button', { name: /notifications, 1 unread/i }));
    expect(await screen.findByText('SQL Database Design')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('SQL Database Design')).not.toBeInTheDocument();
    });
  });

  it('closes the dropdown on outside mousedown', async () => {
    renderHeader();

    fireEvent.click(await screen.findByRole('button', { name: /notifications, 1 unread/i }));
    expect(await screen.findByText('SQL Database Design')).toBeInTheDocument();

    // The header listens for `mousedown` (not `click`) on the document.
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('SQL Database Design')).not.toBeInTheDocument();
    });
  });

  it('shows the upgrade CTA only for free users and hides it for active paid plans', async () => {
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'admin@codebridge.academy',
        firstName: 'Platform',
        lastName: 'Owner',
        role: 'PLATFORM_OWNER',
        isActive: true,
        mfaEnabled: false,
        subscriptionStatus: 'ACTIVE',
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });

    const { unmount } = renderHeader();
    fireEvent.click(screen.getAllByRole('button', { name: /^PO$/i })[0]);
    expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({
      user: {
        id: '1',
        email: 'admin@codebridge.academy',
        firstName: 'Platform',
        lastName: 'Owner',
        role: 'PLATFORM_OWNER',
        isActive: true,
        mfaEnabled: false,
        subscriptionStatus: null,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });

    renderHeader();
    fireEvent.click(screen.getAllByRole('button', { name: /^PO$/i })[0]);
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
  });
});
