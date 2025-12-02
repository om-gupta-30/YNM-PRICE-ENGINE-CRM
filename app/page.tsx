'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if user is authenticated
      const auth = localStorage.getItem('auth');
      
      if (auth === 'true') {
        // User is authenticated - redirect to home page
        router.replace('/home');
      } else {
        // User is not authenticated - redirect to login page
        router.replace('/login');
      }
    }
  }, [router]);

  return null;
}
