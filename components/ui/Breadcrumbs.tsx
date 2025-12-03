'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useState, useEffect } from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

function Breadcrumbs() {
  const pathname = usePathname();
  const safePathname = pathname ?? "/";
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const shouldHideBreadcrumbs =
    safePathname === '/login' || safePathname === '/change-password';

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = safePathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/home' },
    ];

    // Handle special routes
    if (safePathname === '/home') {
      return breadcrumbs;
    }

    // Check if we're in Price Engine section (mbcb, signages, paint, price-engine, quotation-status, quotation-status-update, history)
    const priceEngineRoutes = ['mbcb', 'signages', 'paint', 'price-engine', 'quotation-status', 'quotation-status-update', 'history'];
    const isPriceEngineRoute = paths.some(p => priceEngineRoutes.includes(p.toLowerCase()));

    // Check if we're in CRM section
    const isCrmRoute = safePathname.startsWith('/crm');

    // Add Price Engine or CRM link based on route
    if (isPriceEngineRoute) {
      breadcrumbs.push({ label: 'Price Engine', href: '/price-engine' });
    } else if (isCrmRoute) {
      breadcrumbs.push({ label: 'CRM', href: '/crm' });
    }

    // Generate remaining breadcrumbs
    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      
      // Skip if this is a route we've already handled
      if (path === 'home' || path === 'price-engine' || path === 'crm') {
        return;
      }

      // Check if this path segment is a number (likely an ID) and we have a dynamic label for it
      let label = '';
      if (/^\d+$/.test(path)) {
        const dynamicLabel = dynamicLabels[currentPath];
        if (dynamicLabel) {
          label = dynamicLabel;
        } else {
          // Show ID if we haven't loaded the name yet
          label = path;
        }
      } else {
        // Format label nicely
        label = path
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Special handling for common routes
        if (path === 'mbcb') {
          label = 'MBCB';
        } else if (path === 'w-beam') {
          label = 'W Beam';
        } else if (path === 'double-w-beam') {
          label = 'Double W Beam';
        } else if (path === 'thrie') {
          label = 'Thrie Beam';
        } else if (path === 'reflective') {
          label = 'Reflective Signages';
        } else if (path === 'quotation-status') {
          label = 'Quotation Status';
        } else if (path === 'quotation-status-update') {
          label = 'Quotation Status Update';
        } else if (path === 'accounts') {
          label = 'Accounts';
        } else if (path === 'subaccounts') {
          label = 'Sub-Accounts';
        } else if (path === 'contacts') {
          label = 'Contacts';
        } else if (path === 'sub-accounts') {
          label = 'Sub-Accounts';
        }
      }

      breadcrumbs.push({
        label: label,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  // Fetch dynamic labels for IDs in the path (account names, sub-account names)
  useEffect(() => {
    if (shouldHideBreadcrumbs) {
      setDynamicLabels({});
      setIsLoading(false);
      return;
    }

    const fetchDynamicLabels = async () => {
      setIsLoading(true);
      const paths = safePathname.split('/').filter(Boolean);
      const newLabels: Record<string, string> = {};
      
      // Check for sub-account ID (e.g., /crm/subaccounts/40/contacts)
      if (safePathname.startsWith('/crm/subaccounts/') && paths.length >= 3) {
        const subAccountId = paths[2];
        if (/^\d+$/.test(subAccountId)) {
          try {
            const response = await fetch(`/api/subaccounts/${subAccountId}`);
            const data = await response.json();
            if (data.success && data.subAccount) {
              newLabels[`/crm/subaccounts/${subAccountId}`] = data.subAccount.sub_account_name || `Sub-Account ${subAccountId}`;
              
              // Also fetch account name if needed
              if (data.subAccount.accountId) {
                try {
                  const accountResponse = await fetch(`/api/accounts/${data.subAccount.accountId}`);
                  const accountData = await accountResponse.json();
                  if (accountData.success && accountData.data) {
                    newLabels[`/crm/accounts/${data.subAccount.accountId}`] = accountData.data.account_name;
                  }
                } catch (error) {
                  console.error('Error fetching account name:', error);
                }
              }
            }
          } catch (error) {
            console.error('Error fetching sub-account name:', error);
          }
        }
      }
      
      // Check if we're in a CRM route with account IDs (including detail pages)
      if (safePathname.startsWith('/crm/accounts/') && paths.length >= 3) {
        const accountId = paths[2];
        if (/^\d+$/.test(accountId)) {
          try {
            const response = await fetch(`/api/accounts/${accountId}`);
            const data = await response.json();
            if (data.success && data.data) {
              newLabels[`/crm/accounts/${accountId}`] = data.data.account_name || `Account ${accountId}`;
            }
          } catch (error) {
            console.error('Error fetching account name:', error);
          }
        }
      }
      
      // Check for account detail page with sub-accounts (e.g., /crm/accounts/1/sub-accounts)
      if (safePathname.includes('/sub-accounts') && paths.length >= 4 && paths[0] === 'crm' && paths[1] === 'accounts') {
        const accountId = paths[2];
        if (/^\d+$/.test(accountId)) {
          try {
            const response = await fetch(`/api/accounts/${accountId}`);
            const data = await response.json();
            if (data.success && data.data) {
              newLabels[`/crm/accounts/${accountId}`] = data.data.account_name || `Account ${accountId}`;
            }
          } catch (error) {
            console.error('Error fetching account name:', error);
          }
        }
      }
      
      if (Object.keys(newLabels).length > 0) {
        setDynamicLabels(newLabels);
      }
      setIsLoading(false);
    };
    
    if (safePathname.startsWith('/crm')) {
      fetchDynamicLabels();
    } else {
      setDynamicLabels({});
    }
  }, [safePathname, shouldHideBreadcrumbs]);

  if (shouldHideBreadcrumbs) {
    return null;
  }

  const breadcrumbs = generateBreadcrumbs();

  return (
    <nav className="mb-6 fade-up flex items-center justify-center" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm glassmorphic-premium px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl overflow-x-auto max-w-full">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-brand-gold/60">/</span>
              )}
              {isLast ? (
                <span className="text-brand-gold font-semibold">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-slate-300 hover:text-brand-gold transition-all duration-200 hover:scale-105"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default memo(Breadcrumbs);

