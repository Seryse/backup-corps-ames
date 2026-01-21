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
import type { Formation } from '@/components/providers/cart-provider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Languages } from 'lucide-react';
import { useState } from 'react';
import { translateTextAction } from '@/app/actions';

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
  tokenProductId: z.string().min(1, 'Token Product ID is required'),
  imageUrl: z.string().url().optional(),
  imageFile: z.any().optional(),
});

type FormationFormData = z.infer<typeof formationSchema>;

export default function FormationForm({ formationToEdit, onClose, dictionary }: FormationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState<null | 'name' | 'description'>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
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
          tokenProductId: '',
          imageUrl: '',
        },
  });

  const handleTranslate = async (fieldName: 'name' | 'description') => {
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


  const onSubmit = (data: FormationFormData) => {
    if (!firestore) return;
    setIsLoading(true);

    const formationData = {
      name: data.name,
      description: data.description,
      price: Math.round(data.price * 100),
      currency: data.currency,
      tokenProductId: data.tokenProductId,
      imageUrl: formationToEdit?.imageUrl || 'https://placehold.co/600x400/E6E6FA/333333?text=Image',
    };

    const firestorePromise = formationToEdit?.id
        ? setDoc(doc(firestore, 'formations', formationToEdit.id), formationData)
        : addDoc(collection(firestore, 'formations'), formationData);
    
    firestorePromise.then(() => {
        toast({ title: formationToEdit ? dictionary.success.formationUpdated : dictionary.success.formationAdded });
        onClose();
    })
    .catch(e => {
        console.error("Form submission error:", e);
        toast({
            variant: "destructive",
            title: dictionary.error.generic,
            description: e.message || "An unexpected error occurred.",
        });
    })
    .finally(() => {
        setIsLoading(false);
    });
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
                <span className="sr-only">{dictionary.form.translate}</span>
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
                <span className="sr-only">{dictionary.form.translate}</span>
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
      
      <div>
          <Label htmlFor="imageFile">{dictionary.form.image} (désactivé)</Label>
          <Input id="imageFile" type="file" accept="image/*" disabled />
          {/* <Input id="imageFile" type="file" accept="image/*" {...register('imageFile')} /> */}
          {formationToEdit?.imageUrl && (
            <div className="mt-4">
                <p className="text-sm font-medium">Image Actuelle:</p>
                <img src={formationToEdit.imageUrl} alt="Current formation" className="mt-2 h-20 w-20 object-cover rounded-md" />
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
