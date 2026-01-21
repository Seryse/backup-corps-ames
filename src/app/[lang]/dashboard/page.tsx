'use client'

import React, { useState, useEffect } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Newspaper, Rss } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NewsArticle } from '@/components/admin/news-manager'; // Re-using the type

export default function HomePage({ params: { lang } }: { params: { lang: Locale } }) {
  const [dict, setDict] = useState<Dictionary['home'] | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const newsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'news'), orderBy('createdAt', 'desc')) as Query<NewsArticle>;
  }, [firestore]);

  const { data: articles, isLoading: isLoadingArticles } = useCollection<NewsArticle>(newsQuery);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.home));
  }, [lang]);

  if (isUserLoading || isLoadingArticles || !dict) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="mb-12">
        <h1 className="text-4xl font-headline mb-2">{dict.title}, {user?.displayName || 'explorateur'} !</h1>
        <p className="text-lg text-muted-foreground">{dict.description}</p>
      </div>

      <div className="flex items-center gap-4 mb-8">
          <Rss className="h-8 w-8 text-accent" />
          <h2 className="text-3xl font-headline">{dict.latestNews}</h2>
      </div>

      {articles && articles.length > 0 ? (
        <div className="grid gap-12">
          {articles.map(article => {
            const localizedTitle = article.title?.[lang] || article.title?.en || '...';
            const localizedContent = article.content?.[lang] || article.content?.en || '...';
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
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Newspaper className="mx-auto h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-2xl font-headline">{dict.noNews}</h2>
            <p className="text-muted-foreground mt-2">{dict.noNewsDescription}</p>
        </div>
      )}
    </div>
  );
}
