import { useState } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { cn } from '@utils/cn';
import {
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  Smartphone,
  Building2,
  Check,
  AlertCircle,
  Globe,
  Shield,
} from 'lucide-react';
import type { PaymentMethod } from '../../../types/billing';

interface PaymentMethodsSectionProps {
  paymentMethods: PaymentMethod[];
  onAdd: (data: {
    type: 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
    cardNumber?: string;
    expMonth?: number;
    expYear?: number;
    cvc?: string;
    cardholderName?: string;
    phoneNumber?: string;
    mobileMoneyProvider?: string;
    countryCode?: string;
    isDefault?: boolean;
  }) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// ─── Country codes for East Africa ────────────
const COUNTRY_CODES = [
  { code: '+250', label: 'Rwanda (RW)', flag: '🇷🇼' },
  { code: '+256', label: 'Uganda (UG)', flag: '🇺🇬' },
  { code: '+254', label: 'Kenya (KE)', flag: '🇰🇪' },
  { code: '+255', label: 'Tanzania (TZ)', flag: '🇹🇿' },
  { code: '+257', label: 'Burundi (BI)', flag: '🇧🇮' },
  { code: '+243', label: 'DRC (CD)', flag: '🇨🇩' },
];

// ─── Mobile Money Providers ───────────────────
const MOBILE_MONEY_PROVIDERS = [
  {
    id: 'MTN',
    name: 'MTN Mobile Money',
    shortName: 'MTN MoMo',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    selectedBg: 'bg-yellow-500',
    countries: ['+250', '+256', '+257', '+243'],
    icon: Smartphone,
  },
  {
    id: 'AIRTEL',
    name: 'Airtel Money',
    shortName: 'Airtel Money',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    selectedBg: 'bg-red-500',
    countries: ['+250', '+256', '+254', '+255', '+243'],
    icon: Smartphone,
  },
  {
    id: 'MPESA',
    name: 'M-Pesa',
    shortName: 'M-Pesa',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    selectedBg: 'bg-green-500',
    countries: ['+254', '+255'],
    icon: Smartphone,
  },
];

// ─── Mobile Money Payment Info Banner ─────────
function MobileMoneyInfoBanner() {
  return (
    <div className="rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50 to-blue-50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
            <Smartphone className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Mobile Money Payments</h4>
            <p className="mt-0.5 text-xs text-text-secondary">
              Pay with MTN Mobile Money, Airtel Money, or M-Pesa. Instant confirmation — no waiting.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {MOBILE_MONEY_PROVIDERS.map((provider) => (
            <span
              key={provider.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                provider.id === 'MTN' ? 'bg-yellow-100 text-yellow-800' :
                provider.id === 'AIRTEL' ? 'bg-red-100 text-red-800' :
                'bg-green-100 text-green-800',
              )}
            >
              <Smartphone className="h-3 w-3" />
              {provider.shortName}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-text-tertiary">
        <span className="flex items-center gap-1">
          <Check className="h-3 w-3 text-accent-500" />
          No additional fees
        </span>
        <span className="flex items-center gap-1">
          <Check className="h-3 w-3 text-accent-500" />
          Instant confirmation
        </span>
        <span className="flex items-center gap-1">
          <Check className="h-3 w-3 text-accent-500" />
          Auto-pay available
        </span>
      </div>
    </div>
  );
}

// ─── Provider Selector ────────────────────────
function MobileMoneyProviderSelector({
  value,
  onChange,
  countryCode,
}: {
  value: string;
  onChange: (id: string) => void;
  countryCode: string;
}) {
  const availableProviders = MOBILE_MONEY_PROVIDERS.filter(
    (p) => p.countries.includes(countryCode),
  );

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-primary">Mobile Money Provider</label>
      <div className="grid grid-cols-3 gap-2">
        {MOBILE_MONEY_PROVIDERS.map((provider) => {
          const isAvailable = availableProviders.some((p) => p.id === provider.id);
          const isSelected = value === provider.id;
          return (
            <button
              key={provider.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => onChange(provider.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 text-xs transition-all',
                isSelected
                  ? `${provider.selectedBg} border-transparent text-white`
                  : isAvailable
                    ? `${provider.bgColor} ${provider.borderColor} text-text-primary hover:opacity-80`
                    : 'border-border/40 bg-surface-secondary/50 text-text-tertiary cursor-not-allowed opacity-50',
              )}
            >
              <Smartphone className="h-4 w-4" />
              <span className="font-medium">{provider.shortName}</span>
              {!isAvailable && (
                <span className="text-[9px] opacity-70">N/A</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Payment Method Form ──────────────────
function AddPaymentMethodForm({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: PaymentMethodsSectionProps['onAdd'];
}) {
  const [methodType, setMethodType] = useState<'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER'>('MOBILE_MONEY');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+250');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('MTN');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await onAdd({
        type: methodType,
        cardNumber: methodType === 'CARD' ? cardNumber.replace(/\s/g, '') : undefined,
        expMonth: methodType === 'CARD' && expMonth ? parseInt(expMonth) : undefined,
        expYear: methodType === 'CARD' && expYear ? parseInt(expYear) : undefined,
        cvc: methodType === 'CARD' ? cvc : undefined,
        cardholderName: methodType === 'CARD' ? cardholderName : undefined,
        phoneNumber: methodType === 'MOBILE_MONEY' ? `${countryCode}${phoneNumber.replace(/^0+/, '')}` : undefined,
        mobileMoneyProvider: methodType === 'MOBILE_MONEY' ? mobileMoneyProvider : undefined,
        countryCode: methodType === 'MOBILE_MONEY' ? countryCode : undefined,
        isDefault: false,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add payment method');
    } finally {
      setSubmitting(false);
    }
  };

  const methodOptions: Array<{ value: typeof methodType; label: string; icon: typeof CreditCard; desc: string }> = [
    { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone, desc: 'MTN, Airtel, M-Pesa — instant' },
    { value: 'CARD', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, Amex' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2, desc: 'Direct bank transfer' },
  ];

  // selectedCountry is used implicitly via the countryCode state

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">Add Payment Method</h3>

      {/* Method type selector — Mobile Money first for Africa */}

      <div className="mb-5 flex gap-2">
        {methodOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setMethodType(opt.value);
                if (opt.value === 'MOBILE_MONEY') setMobileMoneyProvider('MTN');
              }}
              className={cn(
                'flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs transition-all',
                methodType === opt.value
                  ? opt.value === 'MOBILE_MONEY'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-border bg-white text-text-tertiary hover:border-primary-200 hover:text-text-primary',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{opt.label.split('/')[0]}</span>
              <span className="text-[10px] text-text-tertiary">{opt.desc}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* ── Mobile Money Form ─────────────── */}
        {methodType === 'MOBILE_MONEY' && (
          <>
            {/* Provider Selection */}
            <MobileMoneyProviderSelector
              value={mobileMoneyProvider}
              onChange={setMobileMoneyProvider}
              countryCode={countryCode}
            />

            {/* Country Code + Phone Number */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-primary">
                Phone Number
              </label>
              <div className="flex gap-2">
                {/* Country code dropdown */}
                <div className="relative">
                  <select
                    value={countryCode}
                    onChange={(e) => {
                      setCountryCode(e.target.value);
                      // Auto-select provider based on country
                      const eligible = MOBILE_MONEY_PROVIDERS.filter(
                        (p) => p.countries.includes(e.target.value),
                      );
                      const firstEligible = eligible[0];
                      if (firstEligible && !eligible.some((p) => p.id === mobileMoneyProvider)) {
                        setMobileMoneyProvider(firstEligible.id);
                      }
                    }}
                    className="h-[42px] appearance-none rounded-lg border border-border bg-white pl-2.5 pr-7 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <Globe className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
                </div>

                {/* Phone number input */}
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="7XX XXX XXX"
                  required
                />
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-text-tertiary">
                <Shield className="h-3 w-3 text-accent-500" />
                You'll receive a payment request on your phone. No sensitive data stored.
              </p>
            </div>

            {/* Provider info cards */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {MOBILE_MONEY_PROVIDERS.filter((p) =>
                p.countries.includes(countryCode),
              ).map((provider) => (
                <div
                  key={provider.id}
                  className={cn(
                    'rounded-lg border p-2.5 text-xs',
                    mobileMoneyProvider === provider.id
                      ? 'border-primary-200 bg-primary-50'
                      : 'border-border bg-white',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'flex h-6 w-6 items-center justify-center rounded',
                      provider.id === 'MTN' ? 'bg-yellow-100' :
                      provider.id === 'AIRTEL' ? 'bg-red-100' : 'bg-green-100',
                    )}>
                      <Smartphone className={cn(
                        'h-3.5 w-3.5',
                        provider.id === 'MTN' ? 'text-yellow-700' :
                        provider.id === 'AIRTEL' ? 'text-red-700' : 'text-green-700',
                      )} />
                    </div>
                    <span className="font-medium text-text-primary">{provider.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Credit Card Form ──────────────── */}
        {methodType === 'CARD' && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">Cardholder Name</label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-primary">Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="4242 4242 4242 4242"
                required
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">Month</label>
                <input
                  type="text"
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="MM"
                  required
                  maxLength={2}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">Year</label>
                <input
                  type="text"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="YYYY"
                  required
                  maxLength={4}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-primary">CVC</label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="123"
                  required
                  maxLength={4}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Bank Transfer Form ────────────── */}
        {methodType === 'BANK_TRANSFER' && (
          <div className="rounded-lg bg-surface-secondary p-4 text-xs text-text-secondary">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary-500" />
              <span className="font-medium text-text-primary">Bank Transfer Information</span>
            </div>
            <p className="leading-relaxed">
              After submitting, you will receive our bank account details via email to complete the transfer.
              Your payment method will be activated upon confirmation (1-3 business days).
            </p>
            <div className="mt-3 flex items-center gap-2 text-accent-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Bank of Kigali • Equity Bank • I&M Bank supported</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" loading={submitting}>
            {methodType === 'MOBILE_MONEY' ? 'Link Mobile Money' : 'Add Method'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Component ──────────────────────────
export function PaymentMethodsSection({
  paymentMethods,
  onAdd,
  onSetDefault,
  onDelete,
}: PaymentMethodsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await onDelete(id);
      setDeleteConfirmId(null);
    } finally {
      setDeleting(false);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'CARD': return CreditCard;
      case 'MOBILE_MONEY': return Smartphone;
      case 'BANK_TRANSFER': return Building2;
      default: return CreditCard;
    }
  };

  const getMethodLabel = (pm: PaymentMethod) => {
    switch (pm.type) {
      case 'CARD':
        return `${pm.brand || 'Card'} ending in ${pm.last4}`;
      case 'MOBILE_MONEY':
        return `Mobile Money (${pm.phoneNumber || 'N/A'})`;
      case 'BANK_TRANSFER':
        return `Bank Transfer${pm.bankName ? ` — ${pm.bankName}` : ''}`;
      default:
        return 'Payment Method';
    }
  };

  const mobileMoneyMethods = paymentMethods.filter((pm) => pm.type === 'MOBILE_MONEY');
  const otherMethods = paymentMethods.filter((pm) => pm.type !== 'MOBILE_MONEY');

  return (
    <Card id="payment-methods">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary-500" />
            Payment Methods
          </CardTitle>
          {!showAddForm && (
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Add Method
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Mobile Money Info Banner */}
        <MobileMoneyInfoBanner />

        {showAddForm && (
          <AddPaymentMethodForm
            onClose={() => setShowAddForm(false)}
            onAdd={onAdd}
          />
        )}

        {paymentMethods.length === 0 && !showAddForm && (
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
            <CreditCard className="mx-auto mb-2 h-8 w-8 text-text-tertiary" />
            <p className="text-sm text-text-secondary">No payment methods added yet</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Add a payment method to manage your subscription billing
            </p>
          </div>
        )}

        {paymentMethods.length > 0 && (
          <div className="space-y-3">
            {/* Mobile Money methods grouped first */}
            {mobileMoneyMethods.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile Money
                </h4>
                <div className="space-y-2">
                  {mobileMoneyMethods.map((pm) => (
                    <PaymentMethodRow
                      key={pm.id}
                      pm={pm}
                      Icon={Smartphone}
                      iconBg="bg-accent-50"
                      iconColor="text-accent-600"
                      deleteConfirmId={deleteConfirmId}
                      deleting={deleting}
                      onSetDefault={onSetDefault}
                      onDeleteClick={setDeleteConfirmId}
                      onConfirmDelete={handleDelete}
                      onCancelDelete={() => setDeleteConfirmId(null)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other methods (card, bank transfer) */}
            {otherMethods.length > 0 && (
              <div>
                {mobileMoneyMethods.length > 0 && (
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    <CreditCard className="h-3.5 w-3.5" />
                    Other Methods
                  </h4>
                )}
                <div className="space-y-2">
                  {otherMethods.map((pm) => {
                    const Icon = getMethodIcon(pm.type);
                    return (
                      <PaymentMethodRow
                        key={pm.id}
                        pm={pm}
                        Icon={Icon}
                        iconBg={pm.type === 'CARD' ? 'bg-blue-50' : 'bg-surface-tertiary'}
                        iconColor={pm.type === 'CARD' ? 'text-blue-600' : 'text-text-secondary'}
                        deleteConfirmId={deleteConfirmId}
                        deleting={deleting}
                        onSetDefault={onSetDefault}
                        onDeleteClick={setDeleteConfirmId}
                        onConfirmDelete={handleDelete}
                        onCancelDelete={() => setDeleteConfirmId(null)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ─── Payment Method Row ──────────────────────
function PaymentMethodRow({
  pm,
  Icon,
  iconBg,
  iconColor,
  deleteConfirmId,
  deleting,
  onSetDefault,
  onDeleteClick,
  onConfirmDelete,
  onCancelDelete,
}: {
  pm: PaymentMethod;
  Icon: typeof CreditCard;
  iconBg: string;
  iconColor: string;
  deleteConfirmId: string | null;
  deleting: boolean;
  onSetDefault: (id: string) => Promise<void>;
  onDeleteClick: (id: string) => void;
  onConfirmDelete: (id: string) => Promise<void>;
  onCancelDelete: () => void;
}) {
  const getMethodLabel = (p: PaymentMethod) => {
    switch (p.type) {
      case 'CARD':
        return `${p.brand || 'Card'} ending in ${p.last4}`;
      case 'MOBILE_MONEY':
        return `${p.phoneNumber || 'Mobile Money'}`;
      case 'BANK_TRANSFER':
        return `Bank Transfer${p.bankName ? ` — ${p.bankName}` : ''}`;
      default:
        return 'Payment Method';
    }
  };

  const getMethodSubtitle = (p: PaymentMethod) => {
    const parts = [`Added ${new Date(p.createdAt).toLocaleDateString()}`];
    if (p.isVerified) {
      parts.push('Verified');
    } else {
      parts.push('Pending verification');
    }
    return parts.join(' • ');
  };

  const isDeleting = deleteConfirmId === pm.id;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-border bg-white p-3 transition-all',
        pm.isDefault && 'border-primary-200 bg-primary-50/50',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          iconBg,
        )}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {getMethodLabel(pm)}
            </span>
            {pm.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                <Check className="h-2.5 w-2.5" />
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-text-tertiary">{getMethodSubtitle(pm)}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!pm.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetDefault(pm.id)}
            title="Set as default"
          >
            <CheckCircle2 className="h-4 w-4 text-text-tertiary hover:text-primary-500" />
          </Button>
        )}
        {isDeleting ? (
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs text-text-tertiary">Confirm?</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-error hover:text-error"
              loading={deleting}
              onClick={() => onConfirmDelete(pm.id)}
            >
              Yes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelDelete}
            >
              No
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-text-tertiary hover:text-error"
            onClick={() => onDeleteClick(pm.id)}
            title="Remove payment method"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default PaymentMethodsSection;
