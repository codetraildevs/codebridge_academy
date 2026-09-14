import { useState, useEffect } from 'react';
import { Button } from '@components/ui/button';
import {
  X,
  Calendar,
  Send,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    organizationName: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    companySize?: string;
    message: string;
  }) => Promise<void>;
}

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-1000', label: '201-1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
];

export function DemoRequestModal({ isOpen, onClose, onSubmit }: DemoRequestModalProps) {
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [orgName, setOrgName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        organizationName: orgName,
        contactName,
        contactEmail,
        contactPhone: contactPhone || undefined,
        companySize: companySize || undefined,
        message,
      });
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit demo request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setOrgName('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setCompanySize('');
    setMessage('');
    setError('');
    onClose();
  };

  const isValid = orgName && contactName && contactEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-text-primary">
              {step === 'form' ? 'Request a Demo' : 'Request Submitted'}
            </h2>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-text-secondary">
                Fill out the form below and our team will get back to you within 24 hours to schedule a personalized platform demo.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-text-primary">Organization Name *</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="e.g., Kigali Technical College"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">Contact Name *</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">Email *</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="you@organization.com"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">Phone <span className="text-text-tertiary">(optional)</span></label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="+250 788 123 456"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">Company Size <span className="text-text-tertiary">(optional)</span></label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select size...</option>
                    {COMPANY_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-text-primary">
                    Message <span className="text-text-tertiary">(optional)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    rows={4}
                    placeholder="Tell us about your assessment needs, the number of candidates you plan to assess, and any specific features you're interested in..."
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
                <Button variant="primary" type="submit" loading={submitting} disabled={!isValid}>
                  <Send className="mr-1 h-4 w-4" />
                  Submit Request
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
                <CheckCircle2 className="h-8 w-8 text-accent-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-text-primary">Demo Request Submitted!</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Thank you for your interest! Our team will reach out to <strong>{contactEmail}</strong> within 24 hours to schedule your personalized demo.
                </p>
              </div>
              <Button variant="primary" onClick={handleClose}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DemoRequestModal;
