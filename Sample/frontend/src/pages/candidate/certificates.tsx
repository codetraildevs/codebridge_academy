import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { candidateService, type CandidateCertificate } from '@services/candidate-service';
import { formatDate } from '@utils/format';
import {
  Award,
  Download,
  ExternalLink,
  QrCode,
  Loader2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Star,
  CalendarDays,
} from 'lucide-react';

const PAGE_SIZE = 10;

export function CandidateCertificatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [certificates, setCertificates] = useState<CandidateCertificate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await candidateService.getCertificates({ page, limit: PAGE_SIZE });
      setCertificates(result.data);
      setTotalCount(result.meta.totalItems);
      setTotalPages(result.meta.totalPages);
    } catch (err: any) {
      setError('Failed to load certificates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const filteredCertificates = certificates.filter((c) =>
    !searchQuery ||
    c.tradeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.organizationName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success" dot>Active</Badge>;
      case 'REVOKED':
        return <Badge variant="error" dot>Revoked</Badge>;
      case 'EXPIRED':
        return <Badge variant="warning" dot>Expired</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Certificates</h1>
        <p className="mt-1 text-sm text-text-secondary">View and download your earned certificates</p>
      </div>

      {/* ── Search ──────────────────────────────────── */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search certificates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* ── Certificates Grid ──────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
          <p className="mt-4 text-sm text-text-secondary">Loading certificates...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="h-12 w-12 text-error" />
          <h3 className="mt-4 text-lg font-semibold text-text-primary">Error</h3>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <Button variant="primary" className="mt-6" onClick={loadCertificates}>Try Again</Button>
        </div>
      ) : filteredCertificates.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center py-16 text-center">
              <Award className="h-12 w-12 text-text-tertiary" />
              <h3 className="mt-4 text-lg font-medium text-text-primary">
                {searchQuery ? 'No matching certificates' : 'No certificates yet'}
              </h3>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                {searchQuery
                  ? 'Try adjusting your search.'
                  : 'Complete and pass an assessment to earn your certificate.'}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCertificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Card
                  padding="md"
                  className="group relative overflow-hidden transition-all duration-300 hover:shadow-elevation-medium hover:-translate-y-1"
                >
                  {/* Decorative top bar */}
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500" />

                  {/* Header */}
                  <div className="mt-1 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-100 to-accent-50">
                        <Award className="h-6 w-6 text-accent-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">{cert.tradeName}</h3>
                        <p className="text-xs text-text-tertiary">{cert.organizationName || 'Qualexas'}</p>
                      </div>
                    </div>
                    {getStatusBadge(cert.status)}
                  </div>

                  {/* Certificate Number */}
                  <div className="mt-4 rounded-lg bg-surface-secondary p-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary-500" />
                      <p className="text-xs font-mono text-text-secondary font-medium">
                        {cert.certificateNumber}
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  {cert.overallScore !== null && (
                    <div className="mt-3 flex items-center gap-2">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      <span className="text-sm font-semibold text-text-primary">
                        Score: {Math.round(cert.overallScore)}%
                      </span>
                    </div>
                  )}

                  {/* Issue/Expiry dates */}
                  <div className="mt-3 space-y-1 text-xs text-text-tertiary">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Issued: {formatDate(cert.issueDate)}
                    </p>
                    {cert.expiryDate && (
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Expires: {formatDate(cert.expiryDate)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border">
                    {cert.pdfUrl && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Download className="h-4 w-4" />}
                        onClick={() => window.open(cert.pdfUrl!, '_blank')}
                      >
                        Download
                      </Button>
                    )}
                    {cert.verificationUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ExternalLink className="h-4 w-4" />}
                        onClick={() => window.open(cert.verificationUrl!, '_blank')}
                      >
                        Verify
                      </Button>
                    )}
                    {cert.qrCodeUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<QrCode className="h-4 w-4" />}
                        onClick={() => window.open(cert.qrCodeUrl!, '_blank')}
                      >
                        QR
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-text-tertiary">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  icon={<ChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

export default CandidateCertificatesPage;
