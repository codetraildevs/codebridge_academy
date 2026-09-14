import { useState } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { cn } from '@utils/cn';
import {
  Tag,
  CheckCircle2,
  X,
  AlertCircle,
  Percent,
  Sparkles,
} from 'lucide-react';

interface AppliedCouponData {
  code: string;
  discountPercent: number;
  discountAmount?: number;
  validUntil: string;
  description: string;
}

interface CouponCodeInputProps {
  appliedCoupon: AppliedCouponData | null;
  onApply: (code: string) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function CouponCodeInput({ appliedCoupon, onApply, onRemove }: CouponCodeInputProps) {
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    setApplying(true);
    setError('');
    try {
      await onApply(code.trim().toUpperCase());
      setCode('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired coupon code');
    } finally {
      setApplying(false);
    }
  };

  const handleRemove = async () => {
    setApplying(true);
    try {
      await onRemove();
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card id="coupon-code">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary-500" />
          Promo Code
        </CardTitle>
      </CardHeader>
      <CardBody>
        {appliedCoupon ? (
          <div className="rounded-lg border border-accent-200 bg-accent-50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100">
                  <Sparkles className="h-5 w-5 text-accent-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-accent-800">
                      {appliedCoupon.code}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-200 px-2 py-0.5 text-[11px] font-medium text-accent-700">
                      <Percent className="h-3 w-3" />
                      {appliedCoupon.discountPercent}% OFF
                    </span>
                  </div>
                  <p className="text-xs text-accent-600 mt-0.5">{appliedCoupon.description}</p>
                  <p className="text-[10px] text-accent-500 mt-0.5">
                    Valid until {new Date(appliedCoupon.validUntil).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemove} loading={applying}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                  error ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
                )}
                placeholder="Enter promo code"
              />
              {error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
              )}
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleApply}
              loading={applying}
              disabled={!code.trim()}
            >
              Apply
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default CouponCodeInput;
