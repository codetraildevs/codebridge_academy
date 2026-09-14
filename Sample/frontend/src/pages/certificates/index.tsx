import { useState, useEffect, useCallback } from 'react';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { certificateApi, type Certificate, type CertificateStats } from '@services/certificate-service';
import {
  Award,
  Loader2,
  Search,
  Download,
  CheckCircle2,
  Users,
  Ban,
  Clock,
  Plus,
  ExternalLink,
} from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  REVOKED: 'error',
  EXPIRED: 'warning',
};

export function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [certResult, statsResult] = await Promise.all([
        certificateApi.list({
          page,
          limit: 20,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        certificateApi.getStats(),
      ]);
      setCertificates(certResult.data);
      setTotalPages(certResult.meta.totalPages);
      setStats(statsResult);
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const blob = await certificateApi.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this certificate? This action cannot be undone.')) return;
    try {
      await certificateApi.revoke(id);
      fetchData();
    } catch (err) {
      console.error('Revoke failed:', err);
    }
  };

  const handleViewDetail = (cert: Certificate) => {
    // Open verification URL in a new tab
    if (cert.verificationUrl) {
      window.open(cert.verificationUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Certificates</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Generate and manage digital competency certificates
          </p>
        </div>
        <Button onClick={() => alert('Issue Certificate feature coming soon')} icon={<Plus className="h-4 w-4" />}>
          Issue Certificate
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
                <p className="text-xs text-text-secondary">Total Issued</p>
              </div>
            </div>
          </Card>
          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.active}</p>
                <p className="text-xs text-text-secondary">Active</p>
              </div>
            </div>
          </Card>
          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.revoked}</p>
                <p className="text-xs text-text-secondary">Revoked</p>
              </div>
            </div>
          </Card>
          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.expired}</p>
                <p className="text-xs text-text-secondary">Expired</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, cert number, or exam..."
            className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <div className="w-40">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="REVOKED">Revoked</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
        </div>
      ) : certificates.length === 0 ? (
        /* Empty State */
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center py-16 text-center">
            <Award className="h-16 w-16 text-text-tertiary" />
            <h3 className="mt-4 text-lg font-medium text-text-primary">No certificates yet</h3>
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              Certificates are issued automatically when a candidate successfully completes an assessment.
              You can also manually issue certificates from here.
            </p>
            <Button className="mt-6" onClick={() => alert('Issue Certificate feature coming soon')} icon={<Plus className="h-4 w-4" />}>
              Issue First Certificate
            </Button>
          </div>
        </Card>
      ) : (
        /* Certificate List */
        <div className="grid gap-4">
          {certificates.map((cert) => (
            <Card key={cert.id} variant="outlined" padding="md">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 shrink-0">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-text-primary">
                          {cert.candidate.firstName} {cert.candidate.lastName}
                        </h3>
                        <Badge variant={statusVariant[cert.status] || 'neutral'} size="sm">
                          {cert.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-tertiary">
                        {cert.exam.title} &middot; Cert: {cert.certificateNumber.slice(0, 14)}…
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {cert.candidate.registrationNumber}
                    </span>
                    {cert.overallScore !== null && (
                      <span className="font-semibold text-text-primary">
                        Score: {cert.overallScore}%
                      </span>
                    )}
                    {cert.organization && (
                      <span>{cert.organization.name}</span>
                    )}
                    <span>
                      Issued: {new Date(cert.issueDate).toLocaleDateString()}
                    </span>
                    {cert.expiryDate && (
                      <span>
                        Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(cert.id)}
                    loading={downloadingId === cert.id}
                    icon={<Download className="h-4 w-4" />}
                    title="Download PDF"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleViewDetail(cert)}
                    icon={<ExternalLink className="h-4 w-4" />}
                    title="View verification page"
                    disabled={!cert.verificationUrl}
                  />
                  {cert.status === 'ACTIVE' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(cert.id)}
                      icon={<Ban className="h-4 w-4 text-error" />}
                      title="Revoke certificate"
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-text-secondary">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default CertificatesPage;
