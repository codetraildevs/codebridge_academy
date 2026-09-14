import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsageMeter } from '../usage-meter';

function barFill(container: HTMLElement) {
  const fill = container.querySelector('.h-full');
  return {
    width: (fill as HTMLElement)?.style?.width ?? null,
    className: (fill as HTMLElement)?.className ?? '',
  };
}

describe('UsageMeter', () => {
  it('renders the label and used/max readout', () => {
    const { container } = render(<UsageMeter used={7} max={500} label="Assessments Used" />);

    expect(screen.getByText('Assessments Used')).toBeInTheDocument();
    expect(screen.getByText('7 / 500')).toBeInTheDocument();
    expect(barFill(container).width).toMatch(/^1\.4/); // 1.4000000000000001% float noise
    expect(barFill(container).className).toContain('bg-accent-500');
  });

  it('displays Unlimited for uncapped plans and skips a percentage pin', () => {
    render(<UsageMeter used={3} max={999999} label="Free Assessments" />);

    expect(screen.getByText('3 / Unlimited')).toBeInTheDocument();
  });

  it('shows the warning color from 80%', () => {
    const { container } = render(<UsageMeter used={80} max={100} label="Assessments Used" />);

    expect(screen.getByText('80 / 100').className).toContain('text-warning');
    expect(barFill(container).className).toContain('bg-warning');
  });

  it('shows the critical color from 95% and at exactly 100%', () => {
    const { container } = render(<UsageMeter used={100} max={100} label="Assessments Used" />);

    expect(screen.getByText('100 / 100').className).toContain('text-error');
    expect(barFill(container).className).toContain('bg-error');
    expect(barFill(container).width).toBe('100%');
  });

  it('forces the critical state when atCapacity even far below thresholds', () => {
    // e.g. the quota banner's max=0 no-plan case — red alert, empty bar
    const { container } = render(<UsageMeter used={3} max={0} atCapacity />);

    expect(barFill(container).className).toContain('bg-error');
    expect(barFill(container).width).toBe('0%');
  });

  it('omits the label row when no label is given (banner usage)', () => {
    // The banner renders its own used/max copy, so it uses the bare bar.
    const { container } = render(<UsageMeter used={7} max={500} className="w-28" />);

    expect(screen.queryByText('7 / 500')).not.toBeInTheDocument();
    expect(container.querySelector('.mb-1')).toBeNull();
    expect(container.querySelector('.w-28')).not.toBeNull();
    expect(barFill(container).className).toContain('bg-accent-500');
  });

  it('stays accent in binary tone until atCapacity, even near the cap', () => {
    // Banner contract: blue below the cap (90% used, not yet blocked), red only
    // when atCapacity is forced.
    const { container } = render(<UsageMeter used={90} max={100} tone="binary" />);

    expect(barFill(container).className).toContain('bg-accent-500');
    expect(barFill(container).width).toBe('90%');

    const { container: atCap } = render(<UsageMeter used={100} max={100} tone="binary" atCapacity />);
    expect(barFill(atCap).className).toContain('bg-error');
    expect(barFill(atCap).width).toBe('100%');
  });
});
