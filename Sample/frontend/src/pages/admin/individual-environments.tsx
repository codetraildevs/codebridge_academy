import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { adminService, type AdminUser } from '@services/admin-service';
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  Settings2,
  User,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@utils/cn';

const ROLE_COLORS: Record<string, 'info' | 'success' | 'warning' | 'error' | 'neutral'> = {
  PLATFORM_OWNER: 'error',
  ORGANIZATION_OWNER: 'warning',
  ADMIN: 'info',
  DESIGNER: 'neutral',
  ASSESSOR: 'info',
  ORGANIZATION_REVIEWER: 'neutral',
  CANDIDATE: 'success',
  INDIVIDUAL_CANDIDATE: 'success',
};

export function AdminIndividualEnvironmentsPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.listIndividualCandidates();
      setUsers(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load individual candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Individual User Environments</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage environment configurations for individual candidates
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadUsers}>
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <Card padding="md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </Card>

      {/* Users List */}
      <Card padding="sm">
        <div className="space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-text-tertiary">
              {searchQuery ? 'No users match your search' : 'No individual candidates found'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => navigate(`/admin/subscribers/user/${user.id}/environment`)}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 transition-all hover:bg-surface-secondary"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary">
                        {user.firstName} {user.lastName}
                      </p>
                      <Badge variant={user.isActive ? 'success' : 'error'} size="sm">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-tertiary">
                      <span>{user.email}</span>
                      <span>·</span>
                      <span>{user.subscriptionStatus || 'No plan'}</span>
                    </div>
                  </div>
                </div>                  <div className="flex items-center gap-2">
                  <Badge
                    variant={user.subscriptionStatus ? 'info' : 'neutral'}
                    size="sm"
                  >
                    {user.subscriptionStatus || 'No Plan'}
                  </Badge>
                  <Settings2 className="h-4 w-4 text-text-tertiary" />
                  <ChevronRight className="h-4 w-4 text-text-tertiary" />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export default AdminIndividualEnvironmentsPage;