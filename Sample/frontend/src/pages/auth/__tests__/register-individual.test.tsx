import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type * as framerMotion from 'framer-motion';
import { RegisterIndividualPage } from '../register-individual';
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

const mockedRegister = vi.mocked(authService.register);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/auth/register/individual']}>
      <RegisterIndividualPage />
    </MemoryRouter>,
  );
}

/** Fill step 0 with valid values (except the phone) and continue to step 1. */
function fillStep0AndContinue(phone = '0788123456') {
  fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Jean' } });
  fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Niyo' } });
  fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'jean@example.com' } });
  fireEvent.change(screen.getByPlaceholderText('7XX XXX XXX'), { target: { value: phone } });
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

/** Fill valid passwords and accept the terms on step 1. */
function fillPasswords() {
  fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'Skills@123' } });
  fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { value: 'Skills@123' } });
  fireEvent.click(screen.getByText(/i agree to the/i));
}

/** Walk from step 1 → 3. Step 2 (professional) has no required fields. */
function goToReview() {
  for (let i = 0; i < 2; i += 1) {
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  }
}

describe('RegisterIndividualPage — step validation and submit', () => {
  beforeEach(() => {
    mockedRegister.mockReset();
  });

  it('does NOT leave step 0 when the email is invalid', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Jean' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Niyo' } });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByPlaceholderText('7XX XXX XXX'), { target: { value: '0788123456' } });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText('Valid email required')).toBeInTheDocument();
    expect(screen.getByText('Personal information')).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('does NOT leave step 1 when the password is too weak', () => {
    renderPage();
    fillStep0AndContinue();
    fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'password' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByText(/i agree to the/i));

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText('Need an uppercase letter')).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('does NOT advance from step 1 until the terms are accepted', () => {
    renderPage();
    fillStep0AndContinue();
    fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'Skills@123' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { value: 'Skills@123' } });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText('Accept terms to continue')).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('submits with a local-format phone and shows the success screen', async () => {
    mockedRegister.mockResolvedValue({ success: true });
    renderPage();
    fillStep0AndContinue('0788123456');
    fillPasswords();
    goToReview();

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(mockedRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jean@example.com',
          password: 'Skills@123',
          firstName: 'Jean',
          lastName: 'Niyo',
          phone: '+250 0788123456',
          role: 'INDIVIDUAL_CANDIDATE',
        }),
      ),
    );
    expect(await screen.findByText('Account created')).toBeInTheDocument();
  });

  it('submits when the phone is typed with the dial prefix', async () => {
    mockedRegister.mockResolvedValue({ success: true });
    renderPage();
    fillStep0AndContinue('+250788123456');
    fillPasswords();
    goToReview();

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(mockedRegister).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+250 788123456' }),
      ),
    );
  });
});