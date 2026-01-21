'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Languages } from 'lucide-react';
import { useState } from 'react';
import type { NewsArticle } from './news-manager';
import { translateTextAction } from '@/app/actions';

interface NewsFormProps {
  articleToEdit?: NewsArticle;
  onClose: () => void;
  dictionary: any;
}

const localizedStringSchema = z.object({
  en: z.string().min(1, 'English version is required'),
  fr: z.string().min(1, 'French version is required'),
  es: z.string().min(1, 'Spanish version is required'),
});

const newsSchema = z.object({
  title: localizedStringSchema,
  content: localizedStringSchema,
  imageUrl: z.string().url().optional(),
  imageFile: z.any().optional(),
});

type NewsFormData = z.infer<typeof newsSchema>;

export default function NewsForm({ articleToEdit, onClose, dictionary }: NewsFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState<null | 'title' | 'content'>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
  } = useForm<NewsFormData>({
    resolver: zodResolver(newsSchema),
    defaultValues: articleToEdit
      ? {
          ...articleToEdit
        }
      : {
          title: { en: '', fr: '', es: '' },
          content: { en: '', fr: '', es: '' },
          imageUrl: '',
        },
  });

  const handleTranslate = async (fieldName: 'title' | 'content') => {
    const frenchText = getValues(`${fieldName}.fr`);
    if (!frenchText) {
        toast({
            variant: "destructive",
            title: dictionary.form.nothingToTranslateTitle,
            description: dictionary.form.nothingToTranslateDescription,
        });
        return;
    }
    setIsTranslating(fieldName);
    try {
        const result = await translateTextAction({ text: frenchText });
        setValue(`${fieldName}.en`, result.en);
        setValue(`${fieldName}.es`, result.es);
        toast({ title: dictionary.success.translationSuccess });
    } catch (error) {
        console.error("Translation failed:", error);
        toast({ variant: "destructive", title: dictionary.form.translationError, description: (error as Error).message });
    } finally {
        setIsTranslating(null);
    }
  };

  const onSubmit = (data: NewsFormData) => {
    if (!firestore) return;
    setIsLoading(true);

    const articleData = {
        title: data.title,
        content: data.content,
        imageUrl: articleToEdit?.imageUrl || 'https://placehold.co/600x400/E6E6FA/333333?text=Image',
        createdAt: articleToEdit?.createdAt || serverTimestamp(),
    };

    const firestorePromise = articleToEdit?.id
        ? setDoc(doc(firestore, 'news', articleToEdit.id), articleData, { merge: true })
        : addDoc(collection(firestore, 'news'), articleData);

    firestorePromise.then(() => {
        toast({ title: articleToEdit ? dictionary.success.articleUpdated : dictionary.success.articleAdded });
        onClose();
    }).catch(e => {
        console.error("Form submission error:", e);
        toast({
            variant: "destructive",
            title: dictionary.error.generic,
            description: e.message || "An unexpected error occurred.",
        });
    }).finally(() => {
        setIsLoading(false);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="title.en">{dictionary.form.titleEn}</Label>
          <Input id="title.en" {...register('title.en')} />
          {errors.title?.en && <p className="text-sm text-destructive">{errors.title.en.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="title.fr">{dictionary.form.titleFr}</Label>
            <Button variant="ghost" size="icon" type="button" onClick={() => handleTranslate('title')} disabled={isTranslating === 'title'} className="h-7 w-7">
              {isTranslating === 'title' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
              <span className="sr-only">{dictionary.form.translate}</span>
            </Button>
          </div>
          <Input id="title.fr" {...register('title.fr')} />
          {errors.title?.fr && <p className="text-sm text-destructive">{errors.title.fr.message}</p>}
        </div>
        <div>
          <Label htmlFor="title.es">{dictionary.form.titleEs}</Label>
          <Input id="title.es" {...register('title.es')} />
          {errors.title?.es && <p className="text-sm text-destructive">{errors.title.es.message}</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="content.fr">{dictionary.form.contentFr}</Label>
          <Button variant="ghost" size="icon" type="button" onClick={() => handleTranslate('content')} disabled={isTranslating === 'content'} className="h-7 w-7">
            {isTranslating === 'content' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
            <span className="sr-only">{dictionary.form.translate}</span>
          </Button>
        </div>
        <Textarea id="content.fr" {...register('content.fr')} rows={5} />
        {errors.content?.fr && <p className="text-sm text-destructive">{errors.content.fr.message}</p>}
      </div>
      <div>
        <Label htmlFor="content.en">{dictionary.form.contentEn}</Label>
        <Textarea id="content.en" {...register('content.en')} rows={5} />
        {errors.content?.en && <p className="text-sm text-destructive">{errors.content.en.message}</p>}
      </div>
      <div>
        <Label htmlFor="content.es">{dictionary.form.contentEs}</Label>
        <Textarea id="content.es" {...register('content.es')} rows={5} />
        {errors.content?.es && <p className="text-sm text-destructive">{errors.content.es.message}</p>}
      </div>
      
      <div>
          <Label htmlFor="imageFile">{dictionary.form.image} (désactivé)</Label>
          <Input id="imageFile" type="file" accept="image/*" disabled />
          {articleToEdit?.imageUrl && (
            <div className="mt-4">
                <p className="text-sm font-medium">Image Actuelle:</p>
                <img src={articleToEdit.imageUrl} alt="Current article" className="mt-2 h-20 w-auto object-contain rounded-md" />
            </div>
          )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          {dictionary.form.cancel}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {dictionary.form.save}
        </Button>
      </div>
    </form>
  );
}
