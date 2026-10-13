'use client';
// Redirect to /erp (ERP dashboard overview)
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/erp');
  }, [router]);

  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#495649'}}>
      <p>Redirecionando...</p>
    </div>
  );
}
