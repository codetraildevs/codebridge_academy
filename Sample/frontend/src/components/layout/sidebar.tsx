import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, GraduationCap, Zap } from 'lucide-react';
import { cn } from '@utils/cn';
import { useAuthStore } from '@stores/auth-store';
import { usePermissions } from '@hooks/use-permissions';
import { useNotificationBadges } from '@hooks/use-notification-badges';
import { NAV_GROUPS, type NavGroup, type NavItem } from '@config/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';


function isPathActive(item: NavItem, pathname: string, search: string): boolean {
  if (!item.to) return false;
  const [itemPath, itemQuery] = item.to.split('?');
  if (itemQuery !== undefined) {
    return pathname === itemPath && search === `?${itemQuery}`;
  }
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function hasQueryLinkMatch(items: NavItem[], pathname: string, search: string): boolean {
  return items.some((item) => {
    if (!item.to) return false;
    const [, itemQuery] = item.to.split('?');
    return itemQuery !== undefined && isPathActive(item, pathname, search);
  });
}

function hasExactEndMatch(items: NavItem[], pathname: string): boolean {
  return items.some((item) => {
    if (!item.to) return false;
    const [itemPath] = item.to.split('?');
    return item.end === true && itemPath === pathname;
  });
}

function isItemActive(
  item: NavItem,
  pathname: string,
  search: string,
  queryLinkActive: boolean,
  endLinkActive: boolean,
): boolean {
  if (!item.to) return false;
  const [, itemQuery] = item.to.split('?');
  if (itemQuery === undefined) {
    if (queryLinkActive) return false;
    if (!item.end && endLinkActive) return false;
  }
  return isPathActive(item, pathname, search);
}

export function SidebarComponent() {
  const location = useLocation();
  const { state } = useSidebar();
  const iconOnly = state === 'collapsed';

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const group of NAV_GROUPS) {
      if (group.items.some((item) => isPathActive(item, location.pathname, location.search)))
        initial.add(group.id);
    }
    return initial;
  });

  const user = useAuthStore((s) => s.user);
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const { data: badges } = useNotificationBadges();

  const role = user?.role ?? '';

  const permissionNames = useMemo(() => {
    if (permissionsLoading || !permissions) return null;
    return new Set(permissions.map((p) => p.name));
  }, [permissions, permissionsLoading]);

  const visibleGroups = useMemo(() => {
    if (!user) return [];
    const result: NavGroup[] = [];
    for (const group of NAV_GROUPS) {
      if (group.roles && !group.roles.includes(role)) continue;
      const items = group.items.filter((item) => {
        if (item.roles && !item.roles.includes(role)) return false;
        if (item.permission && permissionNames !== null && !permissionNames.has(item.permission))
          return false;
        return true;
      });
      if (items.length > 0) result.push({ ...group, items });
    }
    return result;
  }, [user, role, permissionNames]);

  const queryLinkActive = useMemo(() => {
    if (!visibleGroups.length) return false;
    const allItems = visibleGroups.flatMap((g) => g.items);
    return hasQueryLinkMatch(allItems, location.pathname, location.search);
  }, [visibleGroups, location.pathname, location.search]);

  const endLinkActive = useMemo(() => {
    if (!visibleGroups.length) return false;
    const allItems = visibleGroups.flatMap((g) => g.items);
    return hasExactEndMatch(allItems, location.pathname);
  }, [visibleGroups, location.pathname]);

  const activeGroupId = useMemo(() => {
    for (const group of visibleGroups) {
      if (group.items.some((item) => isPathActive(item, location.pathname, location.search)))
        return group.id;
    }
    return null;
  }, [visibleGroups, location.pathname, location.search]);

  useEffect(() => {
    if (activeGroupId) {
      setExpandedGroups((prev) => (prev.has(activeGroupId) ? prev : new Set(prev).add(activeGroupId)));
    }
  }, [activeGroupId]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Floating sub-menu (icon rail mode): shows a group's items in a popover
  // anchored to the right of its icon so they are never clipped by the rail.
  const [floatingGroup, setFloatingGroup] = useState<string | null>(null);
  const [floatingAnchor, setFloatingAnchor] = useState<{ top: number; right: number } | null>(null);
  const floatingMenuRef = useRef<HTMLDivElement | null>(null);

  const openFloatingMenu = (event: ReactMouseEvent<HTMLButtonElement>, groupId: string) => {
    if (floatingGroup === groupId) {
      setFloatingGroup(null);
      setFloatingAnchor(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setFloatingAnchor({ top: rect.top, right: rect.right });
    setFloatingGroup(groupId);
  };

  const closeFloatingMenu = () => {
    setFloatingGroup(null);
    setFloatingAnchor(null);
  };

  useEffect(() => {
    closeFloatingMenu();
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!floatingGroup) return;
    const onPointerDown = (event: MouseEvent) => {
      if (floatingMenuRef.current && !floatingMenuRef.current.contains(event.target as Node)) {
        closeFloatingMenu();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFloatingMenu();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [floatingGroup]);

  const floatingGroupData = floatingGroup
    ? visibleGroups.find((g) => g.id === floatingGroup) ?? null
    : null;

  const usage =
    user && (user.maxFreeAssessments ?? 0) > 0
      ? { used: user.freeAssessmentsUsed ?? 0, max: user.maxFreeAssessments ?? 0 }
      : null;

  return (
    <Sidebar collapsible="icon">
      {/* Brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate text-base font-bold">Qualexas</span>
                <span className="truncate text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
                  Assessment Platform
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        {visibleGroups.map((group) => {
          if (group.items.length === 1) {
            const item = group.items[0];
            if (!item) return null;
            const active = isItemActive(item, location.pathname, location.search, queryLinkActive, endLinkActive);
            const badgeCount = badges?.byRoute?.[item.to ?? ''] ?? 0;

            if (item.comingSoon) {
              return (
                <SidebarGroup key={group.id}>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          disabled
                          tooltip={group.label}
                          className="text-text-tertiary opacity-50"
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span>{group.label}</span>
                        </SidebarMenuButton>
                        <SidebarMenuBadge className="text-[9px]">Soon</SidebarMenuBadge>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            }

            return (
              <SidebarGroup key={group.id}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={active} tooltip={group.label}>
                        <Link to={item.to!} aria-current={active ? 'page' : undefined}>
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span>{group.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {badgeCount > 0 && (
                        <SidebarMenuBadge className="bg-error text-white text-[10px] font-semibold">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          const expanded = expandedGroups.has(group.id);

          // Icon rail: the group icon is the trigger and its items open in a
          // popover to the right, so they are placed next to the selected icon.
          if (iconOnly) {
            return (
              <SidebarGroup key={group.id}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip={group.label}
                        aria-expanded={floatingGroup === group.id}
                        data-state={expanded ? 'open' : 'closed'}
                        onClick={(event) => openFloatingMenu(event, group.id)}
                      >
                        <group.icon className="h-5 w-5 shrink-0" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <SidebarGroup key={group.id}>
              <SidebarGroupContent>
                <SidebarMenu>
                  <Collapsible open={expanded} onOpenChange={() => toggleGroup(group.id)}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="text-xs font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary">
                          <group.icon className="h-5 w-5 shrink-0" />
                          <span className="truncate">{group.label}</span>
                          <ChevronDown
                            className={cn(
                              'ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                              expanded && 'rotate-180',
                            )}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {group.items.map((item) => {
                            const active = isItemActive(
                              item,
                              location.pathname,
                              location.search,
                              queryLinkActive,
                              endLinkActive,
                            );
                            const badgeCount = badges?.byRoute?.[item.to ?? ''] ?? 0;

                            if (item.comingSoon) {
                              return (
                                <SidebarMenuSubItem key={`${item.label}-soon`}>
                                  <SidebarMenuSubButton>
                                    <item.icon className="h-4 w-4 shrink-0 opacity-50" />
                                    <span className="text-text-tertiary opacity-50">{item.label}</span>
                                  </SidebarMenuSubButton>
                                  <SidebarMenuBadge className="text-[9px]">Soon</SidebarMenuBadge>
                                </SidebarMenuSubItem>
                              );
                            }

                            return (
                              <SidebarMenuSubItem key={item.to + item.label}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={active}
                                >
                                  <Link
                                    to={item.to!}
                                    aria-current={active ? 'page' : undefined}
                                  >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    <span>{item.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                                {badgeCount > 0 && (
                                  <SidebarMenuBadge className="bg-error text-white text-[10px] font-semibold">
                                    {badgeCount > 99 ? '99+' : badgeCount}
                                  </SidebarMenuBadge>
                                )}
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          {!iconOnly && usage && (
            <SidebarMenuItem>
              <div className="rounded-lg bg-surface-secondary px-3 py-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-accent-500" />
                    Free assessments
                  </span>
                  <span>
                    {usage.used} / {usage.max}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-tertiary">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      usage.used / usage.max >= 0.8 ? 'bg-warning' : 'bg-accent-500',
                    )}
                    style={{ width: `${Math.min((usage.used / usage.max) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </SidebarMenuItem>
          )}


        </SidebarMenu>
      </SidebarFooter>

      {/* Floating sub-menu used while the sidebar is collapsed to icons */}
      {floatingGroupData &&
        floatingAnchor &&
        createPortal(
          <div
            ref={floatingMenuRef}
            role="menu"
            className="fixed z-[60] w-60 overflow-hidden rounded-xl border border-border bg-white text-text-primary shadow-dropdown animate-scale-in"
            style={{
              top: floatingAnchor.top,
              left: floatingAnchor.right + 8,
              minWidth: '14rem',
            }}
          >
            <div className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {floatingGroupData.label}
            </div>
            <div className="py-1">
              {floatingGroupData.items.map((item) => {
                const active = isItemActive(
                  item,
                  location.pathname,
                  location.search,
                  queryLinkActive,
                  endLinkActive,
                );
                const badgeCount = badges?.byRoute?.[item.to ?? ''] ?? 0;

                if (item.comingSoon) {
                  return (
                    <div
                      key={`${item.label}-soon`}
                      className="pointer-events-none flex items-center gap-3 px-4 py-2.5 text-sm text-text-tertiary opacity-60"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="text-[9px]">Soon</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.to + item.label}
                    to={item.to!}
                    role="menuitem"
                    aria-current={active ? 'page' : undefined}
                    onClick={closeFloatingMenu}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      active
                        ? 'bg-primary-50 font-medium text-primary-700'
                        : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="rounded-full bg-error px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </Sidebar>
  );
}

export { SidebarComponent as Sidebar };
export default SidebarComponent;