'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import type { Formation, LocalizedString } from '@/components/providers/cart-provider';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface FormationFormProps {
  formationToEdit?: Formation;
  onClose: () => void;
  dictionary: any; // Simplified dictionary type for props
}

const localizedStringSchema = z.object({
  en: z.string().min(1, 'English name is required'),
  fr: z.string().min(1, 'French name is required'),
  es: z.string().min(1, 'Spanish name is required'),
});

const formationSchema = z.object({
  name: localizedStringSchema,
  description: localizedStringSchema,
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  currency: z.string().min(2, 'Currency is required'),
  imageId: z.string().min(1, 'Image ID is required'),
  tokenProductId: z.string().min(1, 'Token Product ID is required'),
});

type FormationFormData = z.infer<typeof formationSchema>;

export default function FormationForm({ formationToEdit, onClose, dictionary }: FormationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormationFormData>({
    resolver: zodResolver(formationSchema),
    defaultValues: formationToEdit
      ? {
          ...formationToEdit,
          price: formationToEdit.price / 100, // Convert from cents for display
        }
      : {
          name: { en: '', fr: '', es: '' },
          description: { en: '', fr: '', es: '' },
          price: 0,
          currency: 'eur',
          imageId: '',
          tokenProductId: '',
        },
  });

  const onSubmit = async (data: FormationFormData) => {
    if (!firestore) return;
    setIsLoading(true);

    const formationData = {
      ...data,
      price: Math.round(data.price * 100), // Convert to cents for storage
    };

    try {
      if (formationToEdit?.id) {
        const docRef = doc(firestore, 'formations', formationToEdit.id);
        await setDoc(docRef, formationData);
        toast({ title: dictionary.success.formationUpdated });
      } else {
        const collectionRef = collection(firestore, 'formations');
        await addDoc(collectionRef, formationData);
        toast({ title: dictionary.success.formationAdded });
      }
      onClose();
    } catch (e: any) {
        const operation = formationToEdit?.id ? 'update' : 'create';
        const path = formationToEdit?.id ? `formations/${formationToEdit.id}` : 'formations';
        
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: path,
                operation: operation,
                requestResourceData: formationData,
            })
        );
        toast({
            variant: "destructive",
            title: dictionary.error.generic,
            description: e.message,
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
          <Label htmlFor="name.fr">{dictionary.form.nameFr}</Label>
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
        <Label htmlFor="description.en">{dictionary.form.descriptionEn}</Label>
        <Textarea id="description.en" {...register('description.en')} />
        {errors.description?.en && <p className="text-sm text-destructive">{errors.description.en.message}</p>}
      </div>
      <div>
        <Label htmlFor="description.fr">{dictionary.form.descriptionFr}</Label>
        <Textarea id="description.fr" {...register('description.fr')} />
        {errors.description?.fr && <p className="text-sm text-destructive">{errors.description.fr.message}</p>}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="imageId">{dictionary.form.imageId}</Label>
          <Input id="imageId" {...register('imageId')} />
          {errors.imageId && <p className="text-sm text-destructive">{errors.imageId.message}</p>}
        </div>
        <div>
          <Label htmlFor="tokenProductId">{dictionary.form.tokenProductId}</Label>
          <Input id="tokenProductId" {...register('tokenProductId')} />
          {errors.tokenProductId && <p className="text-sm text-destructive">{errors.tokenProductId.message}</p>}
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
