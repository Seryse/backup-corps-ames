'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, orderBy, Query } from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, PlusCircle, Trash2, Edit, ImageOff, Rss } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Locale } from '@/i18n-config';
import type { LocalizedString } from '@/components/providers/cart-provider';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const NewsForm = dynamic(() => import('./news-form'), {
  loading: () => <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});


export type NewsArticle = {
    id: string;
    title: LocalizedString;
    content: LocalizedString;
    imageUrl: string;
    createdAt: any; // Firestore Timestamp
};

interface NewsManagerProps {
  dictionary: any;
  lang: Locale;
}

export default function NewsManager({ dictionary, lang }: NewsManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [articleToEdit, setArticleToEdit] = useState<NewsArticle | undefined>(undefined);

  const newsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'news'), orderBy('createdAt', 'desc')) as Query<NewsArticle>;
  }, [firestore]);

  const { data: articles, isLoading } = useCollection<NewsArticle>(newsQuery);

  const handleAddNew = () => {
    setArticleToEdit(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (article: NewsArticle) => {
    setArticleToEdit(article);
    setIsFormOpen(true);
  };

  const handleDelete = async (articleId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'news', articleId);
    try {
        await deleteDoc(docRef);
        toast({ title: dictionary.success.articleDeleted });
    } catch (e: any) {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: `news/${articleId}`,
                operation: 'delete',
            })
        );
        toast({
            variant: "destructive",
            title: dictionary.error.generic,
            description: e.message,
        });
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Rss className="h-8 w-8 text-accent" />
          <h2 className="text-3xl font-headline">{dictionary.manageNews}</h2>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {dictionary.addArticle}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles?.map((article) => {
            const localizedTitle = article.title?.[lang] || article.title?.en || '...';
            const localizedContent = article.content?.[lang] || article.content?.en || '...';
            const articleDate = article.createdAt?.toDate();
            return (
              <Card key={article.id} className="flex flex-col">
                <CardHeader>
                    <div className="relative aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                        {article.imageUrl ? (
                            <Image
                                src={article.imageUrl}
                                alt={localizedTitle}
                                fill
                                className="object-cover rounded-t-lg"
                            />
                        ) : (
                            <ImageOff className="h-12 w-12 text-muted-foreground" />
                        )}
                    </div>
                  <CardTitle className="pt-4">{localizedTitle}</CardTitle>
                   {articleDate && <CardDescription>{format(articleDate, "d MMMM yyyy", { locale: lang === 'fr' ? fr : undefined })}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                        {localizedContent}
                    </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(article)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{dictionary.deleteArticleConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{dictionary.deleteArticleConfirmDescription}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(article.id)}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {articleToEdit ? dictionary.editArticle : dictionary.addArticle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <NewsForm
              articleToEdit={articleToEdit}
              onClose={() => setIsFormOpen(false)}
              dictionary={dictionary}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
