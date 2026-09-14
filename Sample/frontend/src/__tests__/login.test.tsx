import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '@pages/auth/login';
import { describe, it, expect } from 'vitest';

describe('LoginPage smoke test', () => {
  const renderLogin = () =>
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

  it('renders the page heading and subtitle', () => {
    renderLogin();
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to your account to continue'),
    ).toBeInTheDocument();
  });

  it('renders the email input field', () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText('you@example.com');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('renders the password input field', () => {
    renderLogin();
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('renders the Sign In button', () => {
    renderLogin();
    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeInTheDocument();
    // Button is initially disabled because form is empty
    expect(button).toBeDisabled();
  });

  it('renders the Remember me label', () => {
    renderLogin();
    expect(screen.getByText('Remember me')).toBeInTheDocument();
  });

  it('renders the Forgot Password link', () => {
    renderLogin();
    const link = screen.getByRole('link', { name: /forgot password/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('renders the create account link', () => {
    renderLogin();
    const link = screen.getByRole('link', { name: /create an account/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/auth/register');
  });

  it('renders the password visibility toggle button', () => {
    renderLogin();
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('has the email input as required', () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText('you@example.com');
    expect(emailInput).toBeRequired();
  });

  it('has the password input as required', () => {
    renderLogin();
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    expect(passwordInput).toBeRequired();
  });
});
