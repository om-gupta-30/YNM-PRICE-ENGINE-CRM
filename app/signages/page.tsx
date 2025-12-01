'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignagesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to Reflective Part page (which includes MS Part)
    router.push('/signages/reflective');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
      <div className="text-center">
        <p className="text-xl text-slate-200 mb-4">Redirecting to Signages...</p>
      </div>
    </div>
  );
}
