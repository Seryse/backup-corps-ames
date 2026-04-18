'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore } from '@/firebase';
import type { NewsArticle } from '@/components/admin/news-manager';
import { Locale } from '@/i18n-config';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { format } from 'date-fns';
import { fr, es, enUS } from 'date-fns/locale';
import { Loader2, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function NewsArticlePage() {
  const params = useParams();
  const lang = params.lang as Locale;
  const articleId = params.articleId as string;
  
  const [dict, setDict] = useState<Dictionary | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (lang) {
      getDictionary(lang).then(setDict);
    }
  }, [lang]);

  const articleRef = useMemo(() => 
    (firestore && articleId) ? doc(firestore, 'news', articleId) : null, 
  [firestore, articleId]);

  const { data: article, isLoading } = useDoc<NewsArticle>(articleRef);

  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = lang ? (localesDateFns[lang] || fr) : fr;

  if (isLoading || !article || !dict) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const localizedTitle = article.title[lang] || article.title.fr;
  const localizedContent = article.content[lang] || article.content.fr;

  return (
    <div className="bg-white py-12 sm:py-20">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <article>
          {/* Section Média (Image principale) */}
          {article.imageUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl shadow-xl mb-8">
              <Image src={article.imageUrl} alt={localizedTitle} fill className="object-cover" priority />
            </div>
          )}

          {/* En-tête de l'article */}
          <header className="text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-sans font-extrabold uppercase tracking-tight text-slate-900 mb-4">
              {localizedTitle}
            </h1>
            <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
                <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    <time dateTime={article.createdAt.toDate().toISOString()}>
                        {format(article.createdAt.toDate(), 'PPP', { locale: dateFnsLocale })}
                    </time>
                </div>
            </div>
          </header>

          {/* Corps de l'article (avec support HTML) */}
          <Card className="border-none shadow-none bg-transparent">
            <CardContent 
              className="prose prose-lg lg:prose-xl max-w-none mx-auto p-0 font-sans font-light text-slate-700 prose-headings:font-extrabold prose-headings:uppercase prose-headings:tracking-tight prose-img:rounded-xl prose-img:shadow-lg"
              dangerouslySetInnerHTML={{ __html: localizedContent }}
            />
          </Card>

        </article>
      </div>
    </div>
  );
}
