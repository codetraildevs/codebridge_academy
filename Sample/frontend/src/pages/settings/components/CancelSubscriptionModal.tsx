import { useState, useEffect } from 'react';
import { Button } from '@components/ui/button';
import { cn } from '@utils/cn';
import {
  AlertTriangle,
  X,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ThumbsUp,
} from 'lucide-react';
import { CANCELLATION_REASONS } from '../../../types/billing';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: { reason: string; feedback?: string; cancelImmediately?: boolean }) => Promise<void>;
  planName?: string;
}

type Step = 'reason' | 'confirm' | 'done';

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  planName,
}: CancelSubscriptionModalProps) {
  const [step, setStep] = useState<Step>('reason');
  const [selectedReason, setSelectedReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'confirm') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, step]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onConfirm({
        reason: selectedReason,
        feedback: feedback.trim() || undefined,
        cancelImmediately,
      });
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('reason');
    setSelectedReason('');
    setFeedback('');
    setCancelImmediately(false);
    setError('');
    onClose();
  };

  const selectedReasonObj = CANCELLATION_REASONS.find((r) => r.id === selectedReason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget && step !== 'confirm') handleClose(); }}>
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            {step === 'done' ? (
              <CheckCircle2 className="h-5 w-5 text-accent-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-error" />
            )}
            <h2 className="text-lg font-semibold text-text-primary">
              {step === 'reason' && 'Cancel Subscription'}
              {step === 'confirm' && 'Confirm Cancellation'}
              {step === 'done' && 'Cancellation Submitted'}
            </h2>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {step === 'reason' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                We're sorry to see you go. Please let us know why you're cancelling
                {planName && <span> your <strong>{planName}</strong> plan</span>}.
              </p>

              <div className="space-y-2">
                {CANCELLATION_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => setSelectedReason(reason.id)}
                    className={cn(
                      'w-full rounded-lg border-2 p-3 text-left transition-all',
                      selectedReason === reason.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-border hover:border-primary-200 hover:bg-surface-secondary',
                    )}
                  >
                    <span className="text-sm font-medium text-text-primary">{reason.label}</span>
                    <p className="mt-0.5 text-xs text-text-tertiary">{reason.description}</p>
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">
                  Additional feedback <span className="text-text-tertiary">(optional)</span>
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  rows={3}
                  placeholder="Tell us how we could improve..."
                />
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary p-3">
                <input
                  type="checkbox"
                  checked={cancelImmediately}
                  onChange={(e) => setCancelImmediately(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-text-primary">Cancel immediately</span>
                  <p className="text-xs text-text-tertiary">Your subscription will end today instead of at the end of the billing period</p>
                </div>
              </label>
            </div>
          )}

          {step === 'confirm' && selectedReasonObj && (
            <div className="space-y-4">
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Are you sure?</p>
                    <p className="mt-1 text-xs text-yellow-700">
                      {cancelImmediately
                        ? 'Your subscription will end immediately. You will lose access to premium features right away.'
                        : 'Your subscription will remain active until the end of the current billing period.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-surface-secondary p-3">
                <p className="text-xs text-text-tertiary">Reason</p>
                <p className="text-sm font-medium text-text-primary">{selectedReasonObj.label}</p>
                {feedback && (
                  <>
                    <p className="mt-2 text-xs text-text-tertiary">Feedback</p>
                    <p className="text-sm text-text-secondary">{feedback}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
                <ThumbsUp className="h-8 w-8 text-accent-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-text-primary">Cancellation Submitted</p>
                <p className="mt-1 text-sm text-text-secondary">
                  {cancelImmediately
                    ? 'Your subscription has been cancelled. You will lose access to premium features shortly.'
                    : 'Your subscription has been scheduled for cancellation. You will retain access until the end of your billing period.'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          {step === 'reason' && (
            <>
              <Button variant="secondary" onClick={handleClose}>Keep Plan</Button>
              <Button
                variant="primary"
                disabled={!selectedReason}
                onClick={() => setStep('confirm')}
              >
                Continue
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="secondary" onClick={() => setStep('reason')}>Back</Button>
              <Button
                variant="primary"
                className="bg-error hover:bg-error"
                loading={submitting}
                onClick={handleSubmit}
              >
                Confirm Cancellation
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button variant="primary" onClick={handleClose}>Done</Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CancelSubscriptionModal;
