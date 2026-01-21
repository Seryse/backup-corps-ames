'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { checkSessionAccess } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Music, Play, ShieldAlert, SlidersHorizontal, Square } from 'lucide-react';
import RealtimeSubtitles from '@/components/session/realtime-subtitles';

// Mock admin UID for demo purposes. In a real app, this would come from a database/claims.
const ADMIN_UID = 'REPLACE_WITH_YOUR_ADMIN_UID';

export default function SessionPage({ params: { lang } }: { params: { lang: Locale } }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [dict, setDict] = useState<Dictionary['session'] | null>(null);
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.session));
  }, [lang]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    checkSessionAccess(user.uid)
      .then(hasAccess => {
        // For demo purposes, we will grant access to the admin unconditionally
        if (user.uid === ADMIN_UID) {
          setAccessGranted(true);
        } else {
          setAccessGranted(hasAccess);
        }
      })
      .catch(() => setAccessGranted(false));
  }, [user, authLoading, router, lang]);

  if (accessGranted === null || !dict) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="mt-4 text-lg font-semibold">{dict?.loading || 'Loading...'}</p>
      </div>
    );
  }

  if (!accessGranted) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto bg-destructive/10 p-3 rounded-full">
                <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="mt-4 text-2xl font-headline text-destructive">{dict.accessDenied}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{dict.accessDeniedMessage}</p>
            <Button onClick={() => router.push(`/${lang}/dashboard`)} className="mt-6">
              {dict.backToDashboard}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = user?.uid === ADMIN_UID;

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <h1 className="text-4xl font-headline mb-8">{dict.title}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card className="h-[60vh] flex items-center justify-center bg-muted/30">
                <p className="text-muted-foreground">Video Stream Placeholder</p>
            </Card>
        </div>
        <div className="flex flex-col gap-8">
          {isAdmin && <AdminControls dictionary={dict} />}
          <RealtimeSubtitles dictionary={dict} lang={lang} isAdmin={isAdmin}/>
        </div>
      </div>
    </div>
  );
}

function AdminControls({ dictionary }: { dictionary: Dictionary['session'] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-headline">
                    <SlidersHorizontal className="h-5 w-5"/>
                    {dictionary.adminControls}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button className="w-full justify-start gap-2">
                    <Play className="h-5 w-5" />
                    {dictionary.startIntro}
                </Button>
                 <p className="text-sm text-muted-foreground pt-4 border-t">
                    Anti-Ducking Audio Mixing controls (Web Audio API logic would be implemented here).
                 </p>
                 <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start gap-2">
                        <Music className="h-5 w-5" /> Select Background Music
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2">
                        <Mic className="h-5 w-5" /> Mix Microphone Audio
                    </Button>
                 </div>
            </CardContent>
        </Card>
    );
}
