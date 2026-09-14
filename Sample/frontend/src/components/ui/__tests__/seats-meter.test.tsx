import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SeatsMeter } from '../seats-meter';

describe('SeatsMeter', () => {
  describe('card variant (default)', () => {
    it('renders used / max with a label', () => {
      render(<SeatsMeter used={80} max={100} label="Candidate Seats" />);
      expect(screen.getByText('Candidate Seats')).toBeInTheDocument();
      expect(screen.getByText('80 / 100')).toBeInTheDocument();
    });

    it('renders Unlimited for uncapped plans and hides the bar', () => {
      const { container } = render(<SeatsMeter used={12} max={999999} />);
      expect(screen.getByText('12 / Unlimited')).toBeInTheDocument();
      expect(container.querySelector('.rounded-full')).toBeNull();
    });

    it('shows the limit hint only at capacity', () => {
      render(
        <SeatsMeter used={100} max={100} showLimitHint limitHintAction={<a href="/settings/plans">Upgrade</a>} />,
      );
      expect(screen.getByText('Seat limit reached')).toBeInTheDocument();
      expect(screen.getByText('Upgrade')).toBeInTheDocument();
    });

    it('does not show the limit hint below capacity', () => {
      render(<SeatsMeter used={50} max={100} showLimitHint />);
      expect(screen.queryByText('Seat limit reached')).not.toBeInTheDocument();
    });

    it('renders an empty bar for a 0 cap (plan-less org)', () => {
      const { container } = render(<SeatsMeter used={5} max={0} />);
      expect(screen.getByText('5 / 0')).toBeInTheDocument();
      const bar = container.querySelector('.bg-primary-500');
      expect(bar).not.toBeNull();
      expect((bar as HTMLElement).style.width).toBe('0%');
    });
  });

  describe('chip variant', () => {
    it('renders used/max seats badge', () => {
      render(<SeatsMeter variant="chip" used={80} max={100} />);
      expect(screen.getByText('80/100 seats')).toBeInTheDocument();
    });

    it('renders Unlimited seats for uncapped plans', () => {
      render(<SeatsMeter variant="chip" used={80} max={999999} />);
      expect(screen.getByText('Unlimited seats')).toBeInTheDocument();
    });
  });

  describe('table variant', () => {
    it('renders compact used/max readout', () => {
      render(<SeatsMeter variant="table" used={7} max={100} />);
      expect(screen.getByText('7/100')).toBeInTheDocument();
    });

    it('renders Unlimited for uncapped plans without a bar', () => {
      const { container } = render(<SeatsMeter variant="table" used={7} max={999999} />);
      expect(screen.getByText('7/Unlimited')).toBeInTheDocument();
      expect(container.querySelector('.rounded-full')).toBeNull();
    });
  });
});
