import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}: ConfirmActionModalProps) {
  const Icon = variant === 'danger' ? AlertCircle : AlertTriangle;
  const iconColor = variant === 'danger' ? 'text-error' : 'text-warning';
  const iconBg = variant === 'danger' ? 'bg-error-light' : 'bg-warning-light';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center py-2 text-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${iconBg}`}
        >
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary max-w-sm">{message}</p>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {loading ? 'Processing...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmActionModal;
