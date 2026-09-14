import { useState } from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { cn } from '@utils/cn';
import { AlertCircle, Pencil, X } from 'lucide-react';

const STATUS_OPTIONS = ['ACTIVE', 'TRIAL', 'PENDING', 'EXPIRED', 'CANCELLED'];

const selectClass =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

export interface AssignSubscriptionPayload {
  planId?: string;
  status?: string;
  durationDays?: number;
  note?: string;
}

/**
 * Shared modal for platform owners to assign a plan / set the subscription
 * status for an organization or an individual user (used by the Organization
 * Subscriptions and User Subscriptions admin pages).
 */
export function AssignSubscriptionModal({
  entityName,
  currentPlanId,
  currentPlanName,
  plans,
  onClose,
  onSave,
}: {
  entityName: string;
  currentPlanId: string | null;
  currentPlanName?: string | null;
  plans: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (payload: AssignSubscriptionPayload) => Promise<unknown>;
}) {
  const [planId, setPlanId] = useState(currentPlanId ?? '');
  const [status, setStatus] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onSave({
        planId: planId || undefined,
        status: status || undefined,
        durationDays: durationDays ? Number(durationDays) : undefined,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update subscription');
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-text-primary">Assign Subscription</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div>
            <p className="text-sm text-text-secondary">
              Set the plan and status for <strong className="text-text-primary">{entityName}</strong>
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">Plan</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={selectClass} aria-label="Plan">
              <option value="">Keep current plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {currentPlanName && (
              <p className="mt-1 text-xs text-text-tertiary">Currently on: {currentPlanName}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass} aria-label="Status">
              <option value="">Keep current status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">
              Duration (days) <span className="text-text-tertiary">(optional — defaults to the plan period)</span>
            </label>
            <Input
              type="number"
              min={1}
              max={3650}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="e.g. 30, 90, 365"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">
              Note <span className="text-text-tertiary">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Reason for the change (recorded in subscription history)"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

export default AssignSubscriptionModal;
