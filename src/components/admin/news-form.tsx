'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useStorage } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Languages } from 'lucide-react';
import { useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from '../ui/progress';
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
  const storage = useStorage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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

  const onSubmit = async (data: NewsFormData) => {
    if (!firestore || !storage) return;
    setIsLoading(true);
    setUploadProgress(null);

    try {
        let finalImageUrl = articleToEdit?.imageUrl || '';

        if (data.imageFile && data.imageFile.length > 0) {
            const file = data.imageFile[0];
            const uniqueFileName = `${Date.now()}-${file.name}`;
            const fileRef = storageRef(storage, `news/${uniqueFileName}`);
            const uploadTask = uploadBytesResumable(fileRef, file);

            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => {
                        console.error("Upload failed:", error);
                        reject(error);
                    },
                    async () => {
                        finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve();
                    }
                );
            });
        }

        if (!finalImageUrl) {
            toast({ variant: "destructive", title: dictionary.error.generic, description: "Image is required." });
            setIsLoading(false);
            return;
        }

        const articleData = {
          title: data.title,
          content: data.content,
          imageUrl: finalImageUrl,
          createdAt: articleToEdit?.createdAt || serverTimestamp(),
        };

        if (articleToEdit?.id) {
            const docRef = doc(firestore, 'news', articleToEdit.id);
            await setDoc(docRef, articleData, { merge: true });
            toast({ title: dictionary.success.articleUpdated });
        } else {
            const collectionRef = collection(firestore, 'news');
            await addDoc(collectionRef, articleData);
            toast({ title: dictionary.success.articleAdded });
        }
        onClose();

    } catch (e: any) {
        const operation = articleToEdit?.id ? 'update' : 'create';
        const path = articleToEdit?.id ? `news/${articleToEdit.id}` : 'news';
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path,
            operation,
            requestResourceData: {
                title: data.title,
                content: data.content,
            }
        }));

        toast({
            variant: "destructive",
            title: dictionary.error.generic,
            description: e.message || "An unexpected error occurred during the process.",
        });
    } finally {
        setIsLoading(false);
        setUploadProgress(null);
    }
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
          <Label htmlFor="imageFile">{dictionary.form.image}</Label>
          <Input id="imageFile" type="file" accept="image/*" {...register('imageFile')} />
          {uploadProgress !== null && <Progress value={uploadProgress} className="w-full mt-2" />}
          {articleToEdit?.imageUrl && (
            <div className="mt-4">
                <p className="text-sm font-medium">Current Image:</p>
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
