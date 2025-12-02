'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/crm/NotificationBell';

interface CRMLayoutProps {
  children: ReactNode;
}

export default function CRMLayout({ children }: CRMLayoutProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    }
  }, []);

  const isActive = (path: string) => {
    if (path === '/crm') {
      return pathname === '/crm' || pathname === '/crm/';
    }
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/crm',
      icon: '📊',
    },
    {
      title: 'Accounts + Contacts',
      href: '/crm/accounts',
      icon: '🏢',
    },
    {
      title: 'Leads',
      href: '/crm/leads',
      icon: '🎯',
    },
    {
      title: 'Tasks',
      href: '/crm/tasks',
      icon: '✅',
    },
    {
      title: 'Activities',
      href: '/crm/activities',
      icon: '📝',
    },
    ...(isAdmin ? [
      {
        title: 'All Sub-Accounts',
        href: '/crm/admin/subaccounts',
        icon: '🏛️',
      },
      {
        title: 'All Contacts',
        href: '/crm/admin/contacts',
        icon: '👥',
      },
    ] : []),
  ];

  return (
    <>
      {/* CRM Horizontal Navigation Menu - Fixed at top */}
      <div className="fixed top-[70px] left-0 w-full z-40 bg-[#1d0f0a80] backdrop-blur-lg border-b border-[#734020] shadow-xl">
        <nav className="w-full flex justify-between items-center py-3 px-4">
          {/* Left side - Menu items */}
          <div className="flex justify-center items-center gap-4 md:gap-6">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl
                    transition-all duration-200
                    ${
                      active
                        ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30 shadow-lg'
                        : 'text-slate-300 hover:bg-brand-gold/10 hover:text-white hover:border hover:border-brand-gold/20'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium whitespace-nowrap">{item.title}</span>
                </Link>
              );
            })}
          </div>
          
          {/* Right side - Notification Bell (only for employees, not admin) */}
          {!isAdmin && (
            <div className="flex items-center">
              <NotificationBell />
            </div>
          )}
        </nav>
      </div>

      {/* Main Content Area - Added padding to account for fixed menu */}
      <div className="w-full pt-[140px]">
        {children}
      </div>
    </>
  );
}

