'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { PlaceHolderImages, ImagePlaceholder } from '@/lib/placeholder-images';
import Image from 'next/image';
import { Locale } from '@/i18n-config';
import FormationManager from '@/components/admin/formation-manager';
import { Separator } from '@/components/ui/separator';
import NewsManager from '@/components/admin/news-manager';
import SessionTypeManager from '@/components/admin/session-type-manager';
import { Loader2 } from 'lucide-react';
import UpcomingSessions from '@/components/admin/upcoming-sessions';

const adminEmails = ['seryse@live.be', 'jael@live.fr', 'selvura@gmail.com'];
const adminUids = ['HvsOFzrOwFTHWTBVBextpZtV5I53'];

export default function AdminPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [dict, setDict] = useState<Dictionary | null>(null);
  const [adminImage, setAdminImage] = useState<ImagePlaceholder | undefined>(undefined);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d));
    setAdminImage(PlaceHolderImages.find(p => p.id === 'admin-console'));
  }, [lang]);

  useEffect(() => {
    if (!isUserLoading) {
      const isEmailAuthorized = user && user.email && adminEmails.includes(user.email);
      const isUidAuthorized = user && adminUids.includes(user.uid);
      
      if (user && (isEmailAuthorized || isUidAuthorized)) {
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
    <div className="container mx-auto p-4 sm:p-8">
      <div className="relative rounded-lg overflow-hidden mb-8">
        {adminImage && (
            <Image
                src={adminImage.imageUrl}
                alt={adminImage.description}
                width={1200}
                height={400}
                className="w-full h-48 object-cover"
                data-ai-hint={adminImage.imageHint}
            />
        )}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <h1 className="text-4xl font-headline text-white drop-shadow-lg">{dict.admin.title}</h1>
        </div>
      </div>
      
      <div className="space-y-8">
        <UpcomingSessions dictionary={dict} lang={lang} />
        <Separator />
        <NewsManager dictionary={dict.admin} lang={lang} />
        <Separator />
        <FormationManager dictionary={dict.admin} lang={lang} />
        <Separator />
        <SessionTypeManager dictionary={dict.admin} lang={lang} />
      </div>
    </div>
  );
}
