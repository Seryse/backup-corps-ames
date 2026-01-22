'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, Query } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Rss, GraduationCap, CalendarDays, ArrowRight } from 'lucide-react';
import type { NewsArticle } from '@/components/admin/news-manager';
import type { Formation } from '@/components/providers/cart-provider';
import type { SessionType } from '@/components/admin/session-type-manager';
import { format } from 'date-fns';
import { fr, es, enUS } from 'date-fns/locale';

export default function HomePage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);

  // Data Fetching
  const newsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'news'), orderBy('createdAt', 'desc')) as Query<NewsArticle>;
  }, [firestore]);

  const formationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'formations'), limit(3)) as Query<Formation>;
  }, [firestore]);
  
  const sessionTypesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sessionTypes'), limit(3)) as Query<SessionType>;
  }, [firestore]);

  const { data: news, isLoading: isLoadingNews } = useCollection<NewsArticle>(newsQuery);
  const { data: formations, isLoading: isLoadingFormations } = useCollection<SessionType>(sessionTypesQuery);
  const { data: sessionTypes, isLoading: isLoadingSessionTypes } = useCollection<SessionType>(sessionTypesQuery);
  
  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || fr;
  
  const latestNews = news ? news[0] : null;
  const olderNews = news ? news.slice(1) : [];


  if (isUserLoading || isLoadingNews || isLoadingFormations || isLoadingSessionTypes || !dict) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const homeDict = dict.home;
  const greeting = user ? homeDict.title.replace('{name}', user.displayName || 'Belle Âme') : homeDict.greeting_anonymous;

  return (
    <div className="container mx-auto p-4 sm:p-8 space-y-12">
        <section className="text-center py-8">
            <h1 className="text-5xl font-headline mb-4">{greeting}</h1>
            <p className="text-xl text-muted-foreground">{homeDict.description}</p>
        </section>

        {/* Latest News */}
        {latestNews && (
            <section>
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-headline flex items-center gap-3"><Rss className="h-7 w-7 text-accent" />{homeDict.latestNews}</h2>
                </div>
                 <Card className="md:grid md:grid-cols-2 overflow-hidden shadow-lg">
                    <div className="relative aspect-video md:aspect-auto">
                        <Image src={latestNews.imageUrl} alt={latestNews.title[lang] || latestNews.title.fr} fill className="object-cover" />
                    </div>
                    <div className="flex flex-col p-6">
                        <CardHeader className="p-0">
                            <CardTitle className="text-3xl font-headline">{latestNews.title[lang] || latestNews.title.fr}</CardTitle>
                            <CardDescription className="pt-2">{format(latestNews.createdAt.toDate(), 'PPP', { locale: dateFnsLocale })}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 pt-4 flex-grow">
                            <p className="text-muted-foreground line-clamp-4">{latestNews.content[lang] || latestNews.content.fr}</p>
                        </CardContent>
                    </div>
                </Card>
            </section>
        )}

         {/* Sessions Section */}
        <section>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-headline flex items-center gap-3"><CalendarDays className="h-7 w-7 text-accent" />{homeDict.ourSessions}</h2>
                 <Button variant="ghost" asChild>
                    <Link href={`/${lang}/agenda`}>{homeDict.bookASession} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
            {sessionTypes && sessionTypes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sessionTypes.map(st => {
                         const localizedName = st.name?.[lang] || st.name.fr;
                         const localizedDescription = st.description?.[lang] || st.description.fr;
                         return (
                            <Link key={st.id} href={`/${lang}/session-types/${st.id}`} className="flex">
                                <Card className="overflow-hidden w-full transition-shadow hover:shadow-lg">
                                    <Image src={st.imageUrl || 'https://placehold.co/400x250'} alt={localizedName} width={400} height={250} className="w-full h-48 object-cover" />
                                    <CardHeader>
                                        <CardTitle>{localizedName}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground line-clamp-2">{localizedDescription}</p>
                                    </CardContent>
                                     <CardFooter>
                                         <p className="text-lg font-semibold">{new Intl.NumberFormat(lang, { style: 'currency', currency: st.currency }).format(st.price / 100)}</p>
                                    </CardFooter>
                                </Card>
                            </Link>
                         )
                    })}
                </div>
            ) : (
                 <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">{dict.agenda.noSlots}</p>
                </div>
            )}
        </section>

        {/* Formations Section */}
        <section>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-headline flex items-center gap-3"><GraduationCap className="h-7 w-7 text-accent" />{homeDict.ourFormations}</h2>
                <Button variant="ghost" asChild>
                    <Link href={`/${lang}/shop`}>{homeDict.discoverFormations} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
            {formations && formations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {formations.map(f => {
                         const localizedName = f.name?.[lang] || f.name.fr;
                         const localizedDescription = f.description?.[lang] || f.description.fr;
                         return (
                            <Link key={f.id} href={`/${lang}/formations/${f.id}`} className="flex">
                                <Card className="overflow-hidden w-full transition-shadow hover:shadow-lg">
                                    <Image src={f.imageUrl} alt={localizedName} width={400} height={250} className="w-full h-48 object-cover" />
                                    <CardHeader>
                                        <CardTitle>{localizedName}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground line-clamp-2">{localizedDescription}</p>
                                    </CardContent>
                                    <CardFooter>
                                         <p className="text-lg font-semibold">{new Intl.NumberFormat(lang, { style: 'currency', currency: f.currency }).format(f.price / 100)}</p>
                                    </CardFooter>
                                </Card>
                            </Link>
                         )
                    })}
                </div>
            ) : (
                 <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">{dict.shop.noFormations}</p>
                </div>
            )}
        </section>

        {/* Older News */}
        {olderNews && olderNews.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-headline flex items-center gap-3">{homeDict.moreNews || 'Plus d\'actualités'}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {olderNews.map(article => {
                        const localizedTitle = article.title?.[lang] || article.title.fr;
                        const localizedContent = article.content?.[lang] || article.content.fr;
                        return (
                            <Card key={article.id} className="overflow-hidden">
                                <Image src={article.imageUrl} alt={localizedTitle} width={400} height={250} className="w-full h-48 object-cover" />
                                <CardHeader>
                                    <CardTitle>{localizedTitle}</CardTitle>
                                    <CardDescription>{format(article.createdAt.toDate(), 'PPP', { locale: dateFnsLocale })}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground line-clamp-3">{localizedContent}</p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </section>
        )}
    </div>
  );
}
