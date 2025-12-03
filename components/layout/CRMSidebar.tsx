'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface CRMSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function CRMSidebar({ isExpanded, onToggle }: CRMSidebarProps) {
  const pathname = usePathname();
  const safePathname = pathname ?? "/";
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUsername(localStorage.getItem('username') || '');
    }
  }, []);

  const isActive = (path: string) => {
    if (path === '/crm') {
      return safePathname === '/crm' || safePathname === '/crm/';
    }
    return safePathname === path || safePathname.startsWith(path + '/');
  };

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/crm',
      icon: '📊',
    },
    {
      title: 'Accounts',
      href: '/crm/accounts',
      icon: '🏢',
    },
    {
      title: 'Contacts',
      href: '/crm/contacts',
      icon: '👤',
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
  ];

  return (
    <aside
      className={`
        glassmorphic-premium border-r border-brand-gold/30
        transition-all duration-300 ease-in-out
        flex flex-col
        ${isExpanded ? 'w-[280px]' : 'w-20'}
      `}
      style={{
        position: 'fixed',
        top: '80px', // Space for existing navbar
        left: 0,
        zIndex: 10,
        height: 'calc(100vh - 80px)',
        margin: 0,
        padding: 0,
        paddingTop: '0',
      }}
    >
      {/* Toggle Button */}
      <div className="p-4 border-b border-brand-gold/20" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg text-brand-gold hover:bg-brand-gold/10 transition-all"
          title={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isExpanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)', padding: '16px' }}>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200
                    ${
                      active
                        ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30 shadow-lg'
                        : 'text-slate-300 hover:bg-brand-gold/10 hover:text-white hover:border hover:border-brand-gold/20'
                    }
                  `}
                  title={!isExpanded ? item.title : undefined}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {isExpanded && (
                    <span className="font-medium whitespace-nowrap">{item.title}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

    </aside>
  );
}

