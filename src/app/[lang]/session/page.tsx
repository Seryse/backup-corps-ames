'use client'

import React, { useState, useEffect } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { checkSessionAccess } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, MessageSquare } from 'lucide-react';
import RealtimeSubtitles from '@/components/session/realtime-subtitles';

export default function SessionPage({ params: { lang } }: { params: { lang: Locale } }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [dict, setDict] = useState<Dictionary | null>(null);
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);
  
  // TEMPORARY: Grant admin rights to any logged-in user for testing purposes.
  // In a real app, this would use custom claims.
  const isAdmin = true;

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d));
  }, [lang]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    checkSessionAccess(user.uid)
      .then(hasAccess => {
        setAccessGranted(hasAccess);
      })
      .catch(() => setAccessGranted(false));
  }, [user, isUserLoading, router, lang]);

  if (accessGranted === null || !dict || isUserLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="mt-4 text-lg font-semibold">{dict?.session.loading || 'Loading...'}</p>
      </div>
    );
  }

  if (!accessGranted && !isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-destructive/10 p-3 rounded-full">
                <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="mt-4 text-2xl font-headline text-destructive">{dict.session.accessDenied}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{dict.session.accessDeniedMessage}</p>
            <Button onClick={() => router.push(`/${lang}/dashboard`)} className="mt-6">
              {dict.session.backToDashboard}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
            <MessageSquare className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-headline">{dict.session.title}</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
                {/* Placeholder for Video Player */}
                <Card>
                    <CardHeader>
                        <CardTitle>Live Session Video</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                            <p className="text-muted-foreground">Video player coming soon...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-8">
                 <RealtimeSubtitles dictionary={dict?.session} lang={lang} isAdmin={isAdmin} />
            </div>
        </div>
    </div>
  );
}
