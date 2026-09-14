import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock the auth service module so login page smoke tests don't make real API calls
vi.mock('@services/auth-service', () => ({
  authService: {
    login: vi.fn().mockResolvedValue({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshToken: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));
