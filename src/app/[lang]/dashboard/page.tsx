'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Newspaper, Rss, GraduationCap, CalendarDays, ImageOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NewsArticle } from '@/components/admin/news-manager';
import type { Formation } from '@/components/providers/cart-provider';
import type { SessionType } from '@/components/admin/session-type-manager';

export default function HomePage({ params: { lang } }: { params: { lang: Locale } }) {
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const newsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'news'), orderBy('createdAt', 'desc')) as Query<NewsArticle>;
  }, [firestore]);

  const formationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'formations') as Query<Formation>;
  }, [firestore]);

  const sessionTypesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sessionTypes') as Query<SessionType>;
  }, [firestore]);

  const { data: articles, isLoading: isLoadingArticles } = useCollection<NewsArticle>(newsQuery);
  const { data: formations, isLoading: isLoadingFormations } = useCollection<Formation>(formationsQuery);
  const { data: sessionTypes, isLoading: isLoadingSessionTypes } = useCollection<SessionType>(sessionTypesQuery);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d));
  }, [lang]);

  const isLoading = isUserLoading || isLoadingArticles || isLoadingFormations || isLoadingSessionTypes || !dict;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const latestArticle = articles?.[0];
  const olderArticles = articles?.slice(1);

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="mb-12 flex items-center gap-6">
        <Image src="/icone.png" alt="Corps et Âmes Logo" width={80} height={80} className="rounded-full shadow-md" />
        <div>
            <h1 className="text-4xl font-headline mb-2">{dict.home.title}</h1>
            <p className="text-lg text-muted-foreground">{dict.home.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
          <Rss className="h-8 w-8 text-accent" />
          <h2 className="text-3xl font-headline">{dict.home.latestNews}</h2>
      </div>

      <div className="space-y-12">
        {latestArticle ? (
            <Card key={latestArticle.id} className="grid md:grid-cols-3 overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
                <div className="md:col-span-1 relative min-h-[250px]">
                    <Image src={latestArticle.imageUrl} alt={latestArticle.title?.[lang] || ''} fill className="object-cover" />
                </div>
                <div className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>{latestArticle.title?.[lang] || latestArticle.title?.en}</CardTitle>
                        {latestArticle.createdAt?.toDate() && <p className="text-sm text-muted-foreground pt-1">{format(latestArticle.createdAt.toDate(), "d MMMM yyyy", { locale: lang === 'fr' ? fr : undefined })}</p>}
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">{latestArticle.content?.[lang] || latestArticle.content?.en}</p>
                    </CardContent>
                </div>
            </Card>
        ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <Newspaper className="mx-auto h-16 w-16 text-muted-foreground" />
                <h2 className="mt-6 text-2xl font-headline">{dict.home.noNews}</h2>
                <p className="text-muted-foreground mt-2">{dict.home.noNewsDescription}</p>
            </div>
        )}

        {sessionTypes && sessionTypes.length > 0 && (
            <section>
                <div className="flex items-center gap-4 mb-8">
                    <CalendarDays className="h-8 w-8 text-accent" />
                    <h2 className="text-3xl font-headline">{dict.home.ourSessions}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sessionTypes.map(sessionType => {
                        const localizedName = sessionType.name?.[lang] || sessionType.name?.en || '...';
                        return (
                            <Card key={sessionType.id} className="flex flex-col overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
                                <CardHeader className="p-0">
                                    <div className="relative aspect-video bg-muted flex items-center justify-center">
                                        {sessionType.imageUrl ? (
                                            <Image src={sessionType.imageUrl} alt={localizedName} fill className="object-cover" />
                                        ) : (
                                            <ImageOff className="h-12 w-12 text-muted-foreground" />
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 flex-grow">
                                    <h3 className="text-xl font-headline">{localizedName}</h3>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full">
                                        <Link href={`/${lang}/agenda`}>{dict.home.bookASession}</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </section>
        )}

        {formations && formations.length > 0 && (
            <section>
                <div className="flex items-center gap-4 mb-8">
                    <GraduationCap className="h-8 w-8 text-accent" />
                    <h2 className="text-3xl font-headline">{dict.home.ourFormations}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {formations.map(formation => {
                        const localizedName = formation.name?.[lang] || formation.name?.en || '...';
                        return (
                            <Card key={formation.id} className="flex flex-col overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
                                <CardHeader className="p-0">
                                    <div className="relative aspect-video bg-muted flex items-center justify-center">
                                        <Image src={formation.imageUrl} alt={localizedName} fill className="object-cover" />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 flex-grow">
                                    <h3 className="text-xl font-headline">{localizedName}</h3>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full">
                                        <Link href={`/${lang}/shop`}>{dict.home.discoverFormations}</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </section>
        )}

        {olderArticles && olderArticles.length > 0 && olderArticles.map(article => {
            const localizedTitle = article.title?.[lang] || article.title?.en || 'Titre manquant';
            const localizedContent = article.content?.[lang] || article.content?.en || 'Contenu manquant...';
            const articleDate = article.createdAt?.toDate();
            
            return (
                <Card key={article.id} className="grid md:grid-cols-3 overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
                    <div className="md:col-span-1 relative min-h-[200px]">
                    <Image src={article.imageUrl} alt={localizedTitle} fill className="object-cover" />
                    </div>
                    <div className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>{localizedTitle}</CardTitle>
                        {articleDate && <p className="text-sm text-muted-foreground pt-1">{format(articleDate, "d MMMM yyyy", { locale: lang === 'fr' ? fr : undefined })}</p>}
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">{localizedContent}</p>
                    </CardContent>
                    </div>
                </Card>
            )
        })}
      </div>
    </div>
  );
}
