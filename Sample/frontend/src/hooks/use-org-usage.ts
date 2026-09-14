import { useEffect, useState } from 'react';
import { useAuthStore } from '@stores/auth-store';
import { subscriptionService, type UsageStats } from '@services/subscription-service';

/**
 * Fetch the current organization's assessment usage (registrations used vs
 * plan.maxAssessments). Only meaningful for org-linked users — org-created
 * candidates and org staff alike, since /api/usage/stats resolves org stats
 * for any user with userType ORGANIZATION + organizationId. Individual
 * candidates get a free-trial shape instead, so the fetch stays off for them.
 *
 * Plain state hook (no react-query) to match the pages that use it.
 */
export function useOrgUsage(): UsageStats | null {
  const user = useAuthStore((s) => s.user);
  const isOrgUser = user?.userType === 'ORGANIZATION' && Boolean(user.organizationId);
  const [usage, setUsage] = useState<UsageStats | null>(null);

  useEffect(() => {
    if (!isOrgUser) return;
    let active = true;
    subscriptionService
      .getOrgStats()
      .then((stats) => {
        // /usage/stats returns the flat UsageStats shape (no nested .usage).
        if (active) setUsage(stats);
      })
      .catch(() => {
        if (active) setUsage(null);
      });
    return () => {
      active = false;
    };
  }, [isOrgUser]);

  return usage;
}

export default useOrgUsage;
