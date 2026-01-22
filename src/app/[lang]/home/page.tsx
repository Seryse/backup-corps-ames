'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, Query } from 'firebase/firestore';
import type { NewsArticle } from '@/components/admin/news-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, ImageOff } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';

export default function HomePage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);

  const newsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'news'), orderBy('createdAt', 'desc'), limit(3)) as Query<NewsArticle>;
  }, [firestore]);

  const { data: articles, isLoading: isLoadingNews } = useCollection<NewsArticle>(newsQuery);

  if (isUserLoading || isLoadingNews || !dict) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const homeDict = dict.home;
  const dashboardDict = dict.dashboard_page;
  const locales: { [key: string]: any } = { en: enUS, fr, es };
  const dateLocale = locales[lang];
  
  const greeting = user ? dashboardDict.subtitle.replace('{name}', user.displayName || 'Belle Âme') : homeDict.greeting_anonymous;

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-headline mb-4">{greeting}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{homeDict.description}</p>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-headline mb-8 text-center">{homeDict.latestNews}</h2>
        {articles && articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {articles.map(article => {
              const localizedTitle = article.title?.[lang] || article.title?.en || '';
              const localizedContent = article.content?.[lang] || article.content?.en || '';
              const articleDate = article.createdAt?.toDate();
              return (
                <Card key={article.id} className="flex flex-col">
                  <CardHeader className="p-0">
                    <div className="relative aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                      {article.imageUrl ? (
                        <Image src={article.imageUrl} alt={localizedTitle} fill className="object-cover rounded-t-lg" />
                      ) : (
                        <ImageOff className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="p-4 pb-0">{localizedTitle}</CardTitle>
                    {articleDate && <CardDescription className="px-4">{format(articleDate, "d MMMM yyyy", { locale: dateLocale })}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex-grow p-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">{localizedContent}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">{homeDict.noNews}</h3>
            <p className="text-muted-foreground mt-2">{homeDict.noNewsDescription}</p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-card p-8 rounded-lg text-center flex flex-col items-center justify-center">
          <h3 className="text-2xl font-headline mb-4">{homeDict.ourFormations}</h3>
          <Button asChild>
            <Link href={`/${lang}/shop`}>
              {homeDict.discoverFormations}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="bg-card p-8 rounded-lg text-center flex flex-col items-center justify-center">
          <h3 className="text-2xl font-headline mb-4">{homeDict.ourSessions}</h3>
          <Button asChild>
            <Link href={`/${lang}/agenda`}>
              {homeDict.bookASession}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
