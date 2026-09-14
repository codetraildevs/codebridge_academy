import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type * as framerMotion from 'framer-motion';
import { RegisterOrganizationPage } from '../register-organization';
import { authService } from '@services/auth-service';

vi.mock('@services/auth-service', () => ({
  authService: {
    register: vi.fn(),
    registerOrganization: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

// jsdom never fires onExitComplete for framer-motion, so AnimatePresence with
// mode="wait" would block step transitions. Render children synchronously instead.
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof framerMotion>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children ?? null}</>,
  };
});

const mockedRegisterOrganization = vi.mocked(authService.registerOrganization);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/auth/register/organization']}>
      <RegisterOrganizationPage />
    </MemoryRouter>,
  );
}

/** Fill step 0 (organization details) with valid values. */
function fillStep0AndContinue(website = 'https://ktc.rw') {
  fireEvent.change(screen.getByPlaceholderText('e.g., Kigali Technical College'), { target: { value: 'Kigali Technical College' } });
  fireEvent.change(screen.getByPlaceholderText('e.g., KTC'), { target: { value: 'KTC' } });
  fireEvent.click(screen.getByRole('button', { name: /select type/i }));
  fireEvent.click(screen.getByRole('button', { name: /tvet school/i }));
  if (website) {
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: website } });
    fireEvent.blur(screen.getByPlaceholderText('https://...'));
  }
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

/** Fill step 1 (owner) with valid values. */
function fillOwnerAndContinue() {
  fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Admin' } });
  fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'User' } });
  fireEvent.change(screen.getByPlaceholderText('admin@organization.com'), { target: { value: 'admin@org.com' } });
  fireEvent.change(screen.getByPlaceholderText('7XX XXX XXX'), { target: { value: '788123456' } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

/** Fill step 2 (security) and accept terms. */
function fillPasswords() {
  fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'Admin@1234' } });
  fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { value: 'Admin@1234' } });
  fireEvent.click(screen.getByText(/i agree to the/i));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

describe('RegisterOrganizationPage — step validation and submit', () => {
  beforeEach(() => {
    // The page persists draft form state in sessionStorage under qual-reg-org;
    // clear it so each test starts from a blank form.
    sessionStorage.clear();
    mockedRegisterOrganization.mockReset();
  });

  it('does NOT leave step 0 when the website is not a valid URL', () => {
    renderPage();
    fillStep0AndContinue('www.ktc.rw');

    expect(screen.getByText('Valid URL required')).toBeInTheDocument();
    expect(screen.getByText('Organization details')).toBeInTheDocument();
    expect(mockedRegisterOrganization).not.toHaveBeenCalled();
  });

  it('submits with the PhoneInput phone format and shows the success screen', async () => {
    mockedRegisterOrganization.mockResolvedValue({ success: true });
    renderPage();
    fillStep0AndContinue();
    fillOwnerAndContinue();
    fillPasswords();

    fireEvent.click(screen.getByRole('button', { name: /create organization/i }));

    await waitFor(() =>
      expect(mockedRegisterOrganization).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@org.com',
          password: 'Admin@1234',
          firstName: 'Admin',
          lastName: 'User',
          orgName: 'Kigali Technical College',
          orgCode: 'KTC',
          orgType: 'TVET_SCHOOL',
          phone: '+250 788123456',
          website: 'https://ktc.rw',
        }),
      ),
    );
    expect(await screen.findByText('Organization registered')).toBeInTheDocument();
  });
});