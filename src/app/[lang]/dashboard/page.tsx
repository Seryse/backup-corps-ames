'use client'

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Locale } from '@/i18n-config';

export default function DashboardPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${lang}/home`);
  }, [lang, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-accent" />
    </div>
  );
}
