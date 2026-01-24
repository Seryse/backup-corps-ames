'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Loader2 } from 'lucide-react';
import StatsDashboard from '@/components/admin/stats-dashboard';
import { adminEmails } from '@/lib/config';

export default function AdminStatsPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [dict, setDict] = useState<Dictionary | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d));
  }, [lang]);

  useEffect(() => {
    if (!isUserLoading) {
      const isEmailAuthorized = user && user.email && adminEmails.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
      
      if (user && isEmailAuthorized) {
        setIsAuthorized(true);
      } else {
        router.replace(`/${lang}/dashboard`);
      }
    }
  }, [user, isUserLoading, router, lang]);

  if (!isAuthorized || !dict) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <StatsDashboard dictionary={dict} lang={lang} />
    </div>
  );
}
