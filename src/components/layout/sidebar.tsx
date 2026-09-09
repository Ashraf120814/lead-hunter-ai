'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Bookmark,
  History,
  Users,
  Mail,
  Download,
  BarChart3,
  CreditCard,
  Settings,
  Shield,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads/find', label: 'Find Leads', icon: Search },
  { href: '/leads/saved', label: 'Saved Leads', icon: Bookmark },
  { href: '/search-history', label: 'Search History', icon: History },
  { href: '/crm', label: 'CRM', icon: Users },
  { href: '/outreach', label: 'Outreach', icon: Mail },
  { href: '/exports', label: 'Exports', icon: Download },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Admin Dashboard', icon: Shield },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-60 xl:w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-muted">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-muted">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Crosshair className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <div className="font-semibold text-sm tracking-tight">Lead Hunter AI</div>
          <div className="text-[10px] text-sidebar-foreground/50">by D-Mappers</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-white font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/40">
              Admin
            </div>
            {ADMIN_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent text-white font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sidebar-muted text-[10px] text-sidebar-foreground/40">
        Lead Hunter AI © 2026
      </div>
    </aside>
  );
}
