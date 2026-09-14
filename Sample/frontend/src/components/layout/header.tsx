import { LogOut, ChevronDown, Search, Sparkles, Settings, CreditCard, Bell } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/auth-store';
import { useAuth } from '@hooks/use-auth';
import { Avatar, AvatarFallback } from '@components/ui/avatar';
import { SidebarTrigger } from '@components/ui/sidebar';
import { PricingModal } from '@components/subscription/pricing-modal';

const avatarPalette = ['#f37d2d', '#2965ff', '#10b981', '#7c3aed', '#ef4444', '#f59e0b', '#14b8a6', '#3b82f6'];

function getNameAvatarStyle(name: string) {
  const value = name.trim() || 'User';
  const hash = [...value].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const background = avatarPalette[hash % avatarPalette.length];
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';

  return { background, initials };
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Close the user menu on outside click / Escape
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/auth/login');
  };

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const avatar = getNameAvatarStyle(displayName);
  const isActivePaidPlan = user?.subscriptionStatus?.toUpperCase() === 'ACTIVE';
  const showUpgradeCta = !isActivePaidPlan;

  return (
    <>
      <header className="flex h-16 items-center justify-between bg-[#ffff] px-6">
        {/* Breadcrumbs / Search */}
        <div className="flex items-center gap-4">
          {/* Mobile nav toggle */}
          <SidebarTrigger className="lg:hidden" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="search"
              id="header-search"
              name="header-search"
              placeholder="Search exams, candidates..."
              aria-label="Search exams and candidates"
              className="w-[28rem] rounded-full border border-border bg-[#ffff] py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-surface-tertiary transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{ backgroundColor: avatar.background }}
                >
                  {avatar.initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-text-tertiary hidden md:block" />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border bg-white shadow-dropdown z-50 animate-scale-in overflow-hidden">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {user?.firstName ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p className="text-xs text-text-tertiary truncate">{user?.email}</p>
                </div>

                {/* Upgrade to Pro — only for users who are not on an active paid plan */}
                {showUpgradeCta && (
                  <button
                    onClick={() => { setMenuOpen(false); setPricingOpen(true); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    Upgrade to Pro
                  </button>
                )}

                {/* Navigation items */}
                <div className="py-1">
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/account'); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    Account
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/billing'); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                  >
                    <CreditCard className="h-4 w-4 shrink-0" />
                    Billing
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/notifications'); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                  >
                    <Bell className="h-4 w-4 shrink-0" />
                    Notifications
                  </button>
                </div>

                {/* Log out */}
                <div className="border-t border-border py-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#d92d20] hover:bg-[#fff1f1] hover:text-[#b42318] transition-colors"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
    </>
  );
}

export default Header;
