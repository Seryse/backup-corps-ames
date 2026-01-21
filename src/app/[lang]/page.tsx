'use client'

import { useEffect } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Locale } from '@/i18n-config';

export default function HomeRedirectPage({ params: { lang } }: { params: { lang: Locale } }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;

    if (user) {
      router.replace(`/${lang}/dashboard`);
    } else {
      router.replace(`/${lang}/login`);
    }
  }, [user, isUserLoading, lang, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-accent" />
    </div>
  );
}
