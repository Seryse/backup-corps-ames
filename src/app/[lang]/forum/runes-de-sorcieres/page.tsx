'use client';

import { use, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, PlusCircle, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function RunesForumPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = use(params);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const threadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;

    return query(
        collection(firestore, 'forum_threads'),
        where('category', '==', 'runes-de-sorcieres'),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: threads, isLoading: isThreadsLoading } = useCollection(threadsQuery);

  if (!isUserLoading && !user) {
     router.push(`/${lang}/login`);
     return null;
  }

  if (isUserLoading || isThreadsLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FDFBF8]">
        <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="bg-[#FDFBF8] min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <p className="text-sm font-semibold text-amber-600 uppercase tracking-widest">Cercle Privé</p>
          <h1 className="text-4xl font-light text-gray-800 tracking-wider mt-2">Sanctuaire des Runes</h1>
          <p className="text-lg text-gray-500 mt-2">Un espace d'échange pour les passionnés des runes de sorcières.</p>
        </header>

        <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-right">
                <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Link href={`/${lang}/forum/runes-de-sorcieres/nouveau`}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Lancer une discussion
                    </Link>
                </Button>
            </div>

            <div className="space-y-4">
                {threads && threads.length > 0 ? (
                    threads.map((thread: any) => {
                         const date = thread.createdAt?.toDate ? thread.createdAt.toDate() : new Date();
                         return (
                            <Link href={`/${lang}/forum/runes-de-sorcieres/${thread.id}`} key={thread.id}>
                                <Card className="bg-white/80 hover:bg-white transition-all duration-300 border-none shadow-sm hover:shadow-md cursor-pointer group">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-xl font-normal text-gray-800 group-hover:text-amber-700 transition-colors">
                                                    {thread.title}
                                                </CardTitle>
                                                <CardDescription className="text-gray-500 mt-1">
                                                    Par <span className="font-medium">{thread.authorName}</span> • {format(date, 'Pp', { locale: fr })}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center text-gray-400 bg-gray-50 px-3 py-1 rounded-full text-xs">
                                                <MessageSquare className="mr-1 h-3 w-3" />
                                                Répondre
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </Link>
                        );
                    })
                ) : (
                    <div className="text-center py-16 bg-white/50 rounded-lg border border-dashed border-gray-300">
                        <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-lg text-gray-600">Le calme règne ici pour l'instant.</p>
                        <p className="text-sm text-gray-400">Soyez la première à partager votre expérience.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
