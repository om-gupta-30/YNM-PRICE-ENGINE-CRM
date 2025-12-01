'use client';

import { ReactNode } from 'react';
import CRMLayout from '@/components/layout/CRMLayout';

export default function CRMGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  // This layout wraps all /crm/* pages with the CRM horizontal navigation menu
  // It works within the existing ClientLayout (navbar, breadcrumbs, etc.)
  return <CRMLayout>{children}</CRMLayout>;
}

