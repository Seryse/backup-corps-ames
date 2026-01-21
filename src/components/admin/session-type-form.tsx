'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import type { SessionType } from './session-type-manager';
import { useToast } from '@/hooks/use-toast';
import { Languages, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { translateText } from '@/ai/flows/translate-text';

interface SessionTypeFormProps {
  sessionTypeToEdit?: SessionType;
  onClose: () => void;
  dictionary: any;
}

const localizedStringSchema = z.object({
  en: z.string().min(1, 'English name is required'),
  fr: z.string().min(1, 'French name is required'),
  es: z.string().min(1, 'Spanish name is required'),
});

const sessionTypeSchema = z.object({
  name: localizedStringSchema,
  description: localizedStringSchema,
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  currency: z.string().min(2, 'Currency is required'),
  tokenProductId: z.string().min(1, 'Token Product ID is required'),
  sessionModel: z.enum(['private', 'small_group', 'large_group']),
  maxParticipants: z.coerce.number().int().min(1, 'Must have at least 1 participant'),
}).refine(data => {
    if (data.sessionModel === 'private') {
        return data.maxParticipants === 1;
    }
    return true;
}, {
    message: "Private sessions must have exactly 1 participant.",
    path: ['maxParticipants']
});

type SessionTypeFormData = z.infer<typeof sessionTypeSchema>;

export default function SessionTypeForm({ sessionTypeToEdit, onClose, dictionary }: SessionTypeFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState<null | 'name' | 'description'>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<SessionTypeFormData>({
    resolver: zodResolver(sessionTypeSchema),
    defaultValues: sessionTypeToEdit
      ? {
          ...sessionTypeToEdit,
          price: sessionTypeToEdit.price / 100, // Convert from cents
        }
      : {
          name: { en: '', fr: '', es: '' },
          description: { en: '', fr: '', es: '' },
          price: 0,
          currency: 'eur',
          tokenProductId: '',
          sessionModel: 'private',
          maxParticipants: 1
        },
  });

  const sessionModel = watch('sessionModel');
  
  const handleTranslate = async (fieldName: 'name' | 'description') => {
    const frenchText = getValues(`${fieldName}.fr`);
    if (!frenchText) {
        toast({
            variant: "destructive",
            title: "Rien à traduire",
            description: `Veuillez d'abord remplir le champ en français.`,
        });
        return;
    }
    setIsTranslating(fieldName);
    try {
        const result = await translateText({ text: frenchText });
        setValue(`${fieldName}.en`, result.en);
        setValue(`${fieldName}.es`, result.es);
        toast({ title: "Traduction terminée !" });
    } catch (error) {
        console.error("Translation failed:", error);
        toast({ variant: "destructive", title: "Erreur de traduction" });
    } finally {
        setIsTranslating(null);
    }
  };
  
  const onSubmit = async (data: SessionTypeFormData) => {
    if (!firestore) return;
    setIsLoading(true);

    try {
        const sessionTypeData = {
          ...data,
          price: Math.round(data.price * 100), // Convert to cents
        };

        if (sessionTypeToEdit?.id) {
            const docRef = doc(firestore, 'sessionTypes', sessionTypeToEdit.id);
            setDoc(docRef, sessionTypeData).catch(e => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `sessionTypes/${sessionTypeToEdit.id}`, operation: 'update', requestResourceData: sessionTypeData }));
            });
            toast({ title: dictionary.success.sessionTypeUpdated });
        } else {
            const collectionRef = collection(firestore, 'sessionTypes');
            addDoc(collectionRef, sessionTypeData).catch(e => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'sessionTypes', operation: 'create', requestResourceData: sessionTypeData }));
            });
            toast({ title: dictionary.success.sessionTypeAdded });
        }
        onClose();

    } catch (e: any) {
        toast({
            variant: "destructive",
            title: dictionary.error.generic,
            description: e.message || "An unexpected error occurred.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="name.en">{dictionary.form.nameEn}</Label>
          <Input id="name.en" {...register('name.en')} />
          {errors.name?.en && <p className="text-sm text-destructive">{errors.name.en.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="name.fr">{dictionary.form.nameFr}</Label>
            <Button variant="ghost" size="icon" type="button" onClick={() => handleTranslate('name')} disabled={isTranslating === 'name'} className="h-7 w-7">
                {isTranslating === 'name' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                <span className="sr-only">Traduire depuis le français</span>
            </Button>
          </div>
          <Input id="name.fr" {...register('name.fr')} />
          {errors.name?.fr && <p className="text-sm text-destructive">{errors.name.fr.message}</p>}
        </div>
        <div>
          <Label htmlFor="name.es">{dictionary.form.nameEs}</Label>
          <Input id="name.es" {...register('name.es')} />
          {errors.name?.es && <p className="text-sm text-destructive">{errors.name.es.message}</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
            <Label htmlFor="description.fr">{dictionary.form.descriptionFr}</Label>
            <Button variant="ghost" size="icon" type="button" onClick={() => handleTranslate('description')} disabled={isTranslating === 'description'} className="h-7 w-7">
                {isTranslating === 'description' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                <span className="sr-only">Traduire depuis le français</span>
            </Button>
        </div>
        <Textarea id="description.fr" {...register('description.fr')} />
        {errors.description?.fr && <p className="text-sm text-destructive">{errors.description.fr.message}</p>}
      </div>
      <div>
        <Label htmlFor="description.en">{dictionary.form.descriptionEn}</Label>
        <Textarea id="description.en" {...register('description.en')} />
        {errors.description?.en && <p className="text-sm text-destructive">{errors.description.en.message}</p>}
      </div>
      <div>
        <Label htmlFor="description.es">{dictionary.form.descriptionEs}</Label>
        <Textarea id="description.es" {...register('description.es')} />
        {errors.description?.es && <p className="text-sm text-destructive">{errors.description.es.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">{dictionary.form.price}</Label>
          <Input id="price" type="number" step="0.01" {...register('price')} />
          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
        </div>
        <div>
          <Label htmlFor="currency">{dictionary.form.currency}</Label>
          <Input id="currency" {...register('currency')} />
          {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
        </div>
      </div>
      
      <div>
        <Label htmlFor="tokenProductId">{dictionary.form.tokenProductId}</Label>
        <Input id="tokenProductId" {...register('tokenProductId')} />
        {errors.tokenProductId && <p className="text-sm text-destructive">{errors.tokenProductId.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
            <Label htmlFor="sessionModel">{dictionary.form.sessionModel}</Label>
            <Select 
                onValueChange={(value) => {
                    setValue('sessionModel', value as 'private' | 'small_group' | 'large_group');
                    if (value === 'private') {
                        setValue('maxParticipants', 1);
                    }
                }}
                defaultValue={sessionModel}
            >
                <SelectTrigger>
                    <SelectValue placeholder={dictionary.form.selectSessionModel} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="private">{dictionary.form.sessionModelOptions.private}</SelectItem>
                    <SelectItem value="small_group">{dictionary.form.sessionModelOptions.small_group}</SelectItem>
                    <SelectItem value="large_group">{dictionary.form.sessionModelOptions.large_group}</SelectItem>
                </SelectContent>
            </Select>
            {errors.sessionModel && <p className="text-sm text-destructive">{errors.sessionModel.message}</p>}
        </div>
        <div>
            <Label htmlFor="maxParticipants">{dictionary.form.maxParticipants}</Label>
            <Input id="maxParticipants" type="number" {...register('maxParticipants')} readOnly={sessionModel === 'private'} />
            {errors.maxParticipants && <p className="text-sm text-destructive">{errors.maxParticipants.message}</p>}
        </div>
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
