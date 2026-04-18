'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Query } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Rss, GraduationCap, CalendarDays, ArrowRight } from 'lucide-react';
import type { NewsArticle } from '@/components/admin/news-manager';
import type { Formation } from '@/components/providers/cart-provider';
import type { SessionType } from '@/components/admin/session-type-manager';
import { format } from 'date-fns';
import { fr, es, enUS } from 'date-fns/locale';
import HeroSection from '@/components/layout/HeroSection';

export default function HomePage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const firestore = useFirestore();

  const featuredSessionIds = [
    'oSg6XPOsc7nrE2suecdT', 
    'bNIaBtKEoWR6k1OZyrHa', 
    '6twSGzIg4HcBCku7vHZM', 
    'F1CFrTVYPeCa1ZSw6gTd'
  ];

  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);

  const newsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'news'), orderBy('createdAt', 'desc')) as Query<NewsArticle>;
  }, [firestore]);

  const formationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'formations')) as Query<Formation>;
  }, [firestore]);
  
  const sessionTypesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sessionTypes'), where('__name__', 'in', featuredSessionIds)) as Query<SessionType>;
  }, [firestore]);

  const { data: news, isLoading: isLoadingNews } = useCollection<NewsArticle>(newsQuery);
  const { data: formations, isLoading: isLoadingFormations } = useCollection<Formation>(formationsQuery);
  const { data: sessionTypes, isLoading: isLoadingSessionTypes } = useCollection<SessionType>(sessionTypesQuery);
  
  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang] || fr;
  
  const latestNews = news ? news[0] : null;
  const olderNews = news ? news.slice(1) : [];

  if (isLoadingNews || isLoadingFormations || isLoadingSessionTypes || !dict) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const homeDict = dict.home;

  return (
    <div className="space-y-0 pb-12 bg-white">
        
        {/* --- C'EST ICI QUE LA MAGIE OPÈRE ✨ --- */}
        {/* On passe les textes traduits au composant Hero */}
        <HeroSection 
            lang={lang} 
            title={homeDict.hero.title}
            highlight={homeDict.hero.highlight}
            subtitle={homeDict.hero.subtitle}
            cta={homeDict.hero.cta}
        />

        <div className="container mx-auto p-4 sm:p-8 space-y-24 mt-12">
            
            {latestNews && (
                <section>
                      <div className="flex flex-col items-center text-center mb-10">
                        <h2 className="text-2xl md:text-3xl font-sans font-extrabold uppercase tracking-tighter flex items-center gap-3">
                          <Rss className="h-7 w-7 text-accent" />
                          {homeDict.latestNews}
                        </h2>
                    </div>
                    <Link href={`/${lang}/news/${latestNews.id}`} className="group">
                        <Card className="md:grid md:grid-cols-2 overflow-hidden border-slate-100 rounded-3xl bg-white transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                            <div className="relative aspect-video md:aspect-auto">
                                <Image src={latestNews.imageUrl} alt={latestNews.title[lang] || latestNews.title.fr} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                            </div>
                            <div className="flex flex-col p-8 md:p-10 justify-center">
                                <CardHeader className="p-0">
                                    <CardDescription className="text-accent font-sans uppercase tracking-widest text-xs mb-2">
                                    {format(latestNews.createdAt.toDate(), 'PPP', { locale: dateFnsLocale })}
                                    </CardDescription>
                                    <CardTitle className="text-2xl md:text-3xl font-sans font-extrabold uppercase tracking-tight leading-none">
                                    {latestNews.title[lang] || latestNews.title.fr}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 pt-6">
                                    <p className="text-slate-600 font-sans font-light leading-relaxed line-clamp-4">
                                    {latestNews.content[lang] || latestNews.content.fr}
                                    </p>
                                </CardContent>
                            </div>
                        </Card>
                    </Link>
                </section>
            )}

            <section>
                 <div className="flex flex-col items-center text-center mb-10 gap-4">
                    <h2 className="text-2xl md:text-3xl font-sans font-extrabold uppercase tracking-tighter flex items-center gap-3">
                      <CalendarDays className="h-7 w-7 text-accent" />
                      {homeDict.ourSessions}
                    </h2>
                    <Link href={`/${lang}/soins`}>
                      <Button variant="outline" className="rounded-full font-sans font-bold uppercase tracking-widest text-[10px] px-8 py-5">
                        {dict.soins_page.title} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                </div>

                {sessionTypes && sessionTypes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {sessionTypes.map(st => {
                             const localizedName = st.name?.[lang] || st.name.fr;
                             return (
                                <Link key={st.id} href={`/${lang}/session-types/${st.id}`} className="group">
                                    <Card className="overflow-hidden w-full border-none shadow-none bg-slate-50/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 rounded-3xl">
                                            <div className="relative aspect-[4/3] overflow-hidden">
                                              <Image src={st.imageUrl || 'https://placehold.co/400x250'} alt={localizedName} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                            </div>
                                            <CardHeader className="p-6 text-center">
                                                <CardTitle className="text-base font-sans font-extrabold uppercase tracking-tight">{localizedName}</CardTitle>
                                                <div className="h-0.5 w-6 bg-accent/30 mx-auto mt-2 group-hover:w-12 transition-all" />
                                            </CardHeader>
                                            <CardFooter className="p-6 pt-0 justify-center">
                                                 <p className="font-sans font-light tracking-widest text-[10px] text-accent uppercase">
                                                  {new Intl.NumberFormat(lang, { style: 'currency', currency: st.currency }).format(st.price / 100)}
                                                 </p>
                                            </CardFooter>
                                    </Card>
                                </Link>
                             )
                        })}
                    </div>
                ) : null}
            </section>

            <section className="pb-12">
                <div className="flex flex-col items-center text-center mb-10 gap-4">
                    <h2 className="text-2xl md:text-3xl font-sans font-extrabold uppercase tracking-tighter flex items-center gap-3">
                      <GraduationCap className="h-7 w-7 text-accent" />
                      {homeDict.ourFormations}
                    </h2>
                     <Link href={`/${lang}/formations`}>
                      <Button variant="outline" className="rounded-full font-sans font-bold uppercase tracking-widest text-[10px] px-8 py-5">
                          Toutes les formations <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                </div>
                {formations && formations.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {formations.slice(0, 3).map(f => {
                             const localizedName = f.name?.[lang] || f.name.fr;
                             return (
                                <Link key={f.id} href={`/${lang}/formations/${f.id}`} className="group">
                                     <Card className="overflow-hidden w-full border-none shadow-none bg-slate-50/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 rounded-3xl">
                                            <div className="relative aspect-[4/3] overflow-hidden">
                                              <Image src={f.imageUrl || 'https://placehold.co/400x250'} alt={localizedName} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                            </div>
                                            <CardHeader className="p-6 text-center">
                                                <CardTitle className="text-base font-sans font-extrabold uppercase tracking-tight">{localizedName}</CardTitle>
                                                <div className="h-0.5 w-6 bg-accent/30 mx-auto mt-2 group-hover:w-12 transition-all" />
                                            </CardHeader>
                                            <CardFooter className="p-6 pt-0 justify-center">
                                                 <p className="font-sans font-light tracking-widest text-[10px] text-accent uppercase">
                                                  {new Intl.NumberFormat(lang, { style: 'currency', currency: f.currency }).format(f.price / 100)}
                                                 </p>
                                            </CardFooter>
                                    </Card>
                                </Link>
                             )
                        })}
                    </div>
                )}
            </section>

            {olderNews.length > 0 && (
                <section>
                    <div className="flex flex-col items-center text-center mb-10">
                         <h3 className="text-2xl md:text-3xl font-sans font-extrabold uppercase tracking-tighter">{homeDict.moreNews}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {olderNews.map(article => (
                            <Link key={article.id} href={`/${lang}/news/${article.id}`} className="group">
                               <Card className="overflow-hidden w-full border-none shadow-none bg-slate-50/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 rounded-3xl">
                                <div className="relative aspect-[16/9]">
                                    <Image src={article.imageUrl} alt={article.title[lang] || article.title.fr} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                </div>
                                <CardHeader className="p-6">
                                    <CardDescription className="text-accent font-sans uppercase tracking-widest text-[10px] mb-2">
                                            {format(article.createdAt.toDate(), 'PPP', { locale: dateFnsLocale })}
                                    </CardDescription>
                                    <CardTitle className="font-sans font-extrabold uppercase text-base tracking-tight leading-snug line-clamp-2">
                                      {article.title[lang] || article.title.fr}
                                    </CardTitle>
                                </CardHeader>
                               </Card>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    </div>
  );
}