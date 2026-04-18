'use client'

import { useForm, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Languages } from 'lucide-react';
import { useState, useEffect } from 'react';
import { translateText } from '@/ai/flows/translate-text';

// New data structure for the about page content
export interface AboutPageContent {
  videoUrl?: string;
  birthContent: { en: string; fr: string; es: string; };
  mediaUrl?: string;
  husbandContent: { en: string; fr: string; es: string; };
  wifeContent: { en: string; fr: string; es: string; };
}

// New Zod schema for the form
const aboutPageSchema = z.object({
  videoUrl: z.string().url({ message: "Veuillez entrer une URL valide." }).or(z.literal('')).optional(),
  birthContent: z.object({
    en: z.string().optional(),
    fr: z.string().min(1, 'Le contenu est requis.'),
    es: z.string().optional(),
  }),
  mediaUrl: z.string().url({ message: "Veuillez entrer une URL valide." }).or(z.literal('')).optional(),
  husbandContent: z.object({
    en: z.string().optional(),
    fr: z.string().min(1, 'Le contenu est requis.'),
    es: z.string().optional(),
  }),
  wifeContent: z.object({
    en: z.string().optional(),
    fr: z.string().min(1, 'Le contenu est requis.'),
    es: z.string().optional(),
  }),
});

type AboutPageFormData = z.infer<typeof aboutPageSchema>;

export default function AboutForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslating, setIsTranslating] = useState<null | 'birthContent' | 'husbandContent' | 'wifeContent'>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    reset,
  } = useForm<AboutPageFormData>({
    resolver: zodResolver(aboutPageSchema),
    defaultValues: {
      videoUrl: '',
      birthContent: { en: '', fr: '', es: '' },
      mediaUrl: '',
      husbandContent: { en: '', fr: '', es: '' },
      wifeContent: { en: '', fr: '', es: '' },
    },
  });

  // Fetch existing content when the component mounts
  useEffect(() => {
    // Si firestore n'est pas encore prêt, on attend, mais on ne bloque pas indéfiniment
    if (!firestore) return;

    const fetchContent = async () => {
        try {
            const docRef = doc(firestore, 'pages', 'about');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data() as AboutPageContent;
                // Use reset to populate the form with fetched data
                // On s'assure que chaque champ a au moins une valeur par défaut pour éviter les bugs
                reset({
                    videoUrl: data.videoUrl || '',
                    birthContent: data.birthContent || { en: '', fr: '', es: '' },
                    mediaUrl: data.mediaUrl || '',
                    husbandContent: data.husbandContent || { en: '', fr: '', es: '' },
                    wifeContent: data.wifeContent || { en: '', fr: '', es: '' },
                });
            }
        } catch (error) {
            console.error("Erreur de chargement:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger le contenu." });
        } finally {
            // Quoi qu'il arrive, on arrête le chargement pour afficher le formulaire
            setIsLoading(false);
        }
    };
    fetchContent();
  }, [firestore, reset, toast]);


  const handleTranslate = async (fieldName: 'birthContent' | 'husbandContent' | 'wifeContent') => {
    const pathFr = `${fieldName}.fr` as Path<AboutPageFormData>;
    const frenchText = getValues(pathFr);

    if (!frenchText) {
        toast({
            variant: "destructive",
            title: "Rien à traduire",
            description: "Remplissez le champ français d'abord.",
        });
        return;
    }

    setIsTranslating(fieldName);
    try {
        // CORRECTION ICI : On s'assure que frenchText est bien une string
        const result = await translateText({ text: String(frenchText) });
        setValue(`${fieldName}.en`, result.en);
        setValue(`${fieldName}.es`, result.es);
        toast({ title: `Section traduite avec succès!` });
    } catch (error) {
        console.error("Translation failed:", error);
        toast({
            variant: "destructive",
            title: "Erreur de traduction",
            description: (error as Error).message
        });
    } finally {
        setIsTranslating(null);
    }
  };

  const onSubmit = async (data: AboutPageFormData) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const docRef = doc(firestore, 'pages', 'about');
      // Ensure we have the full structure even for optional fields
      const dataToSave: AboutPageContent = {
        videoUrl: data.videoUrl || '',
        birthContent: {
          fr: data.birthContent?.fr || '',
          en: data.birthContent?.en || '',
          es: data.birthContent?.es || '',
        },
        mediaUrl: data.mediaUrl || '',
        husbandContent: {
          fr: data.husbandContent?.fr || '',
          en: data.husbandContent?.en || '',
          es: data.husbandContent?.es || '',
        },
        wifeContent: {
          fr: data.wifeContent?.fr || '',
          en: data.wifeContent?.en || '',
          es: data.wifeContent?.es || '',
        },
      };

      await setDoc(docRef, dataToSave, { merge: true });

      toast({ title: "Page 'À Propos' mise à jour avec succès !" });
    } catch (e) {
      console.error("Form submission error:", e);
      toast({
          variant: "destructive",
          title: "Erreur",
          description: (e as Error).message || "Une erreur inattendue est survenue.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  // Helper component for translatable text areas
  const TranslatableTextarea = ({ name, label }: { name: 'birthContent' | 'husbandContent' | 'wifeContent', label: string }) => (
    <div className="space-y-2 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{label}</h3>
        <Button variant="ghost" size="icon" type="button" onClick={() => handleTranslate(name)} disabled={isTranslating === name} className="h-7 w-7">
          {isTranslating === name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          <span className="sr-only">Traduire</span>
        </Button>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor={`${name}.fr`}>Contenu (FR)</Label>
          <Textarea id={`${name}.fr`} {...register(`${name}.fr`)} rows={8} />
          {errors[name]?.fr && <p className="text-sm text-destructive">{errors[name]?.fr?.message}</p>}
        </div>
        <div>
          <Label htmlFor={`${name}.en`}>Contenu (EN)</Label>
          <Textarea id={`${name}.en`} {...register(`${name}.en`)} rows={8} />
        </div>
        <div>
          <Label htmlFor={`${name}.es`}>Contenu (ES)</Label>
          <Textarea id={`${name}.es`} {...register(`${name}.es`)} rows={8} />
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-4 md:p-6 bg-card rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold">Modifier le contenu de la page "À Propos"</h1>
      
      <div className="space-y-2 rounded-md border p-4">
        <h3 className="text-lg font-medium">Média d'en-tête</h3>
        <Label htmlFor="videoUrl">URL de la vidéo (.mp4, .webm)</Label>
        <Input id="videoUrl" {...register('videoUrl')} placeholder="https://exemple.com/video.mp4" />
        {errors.videoUrl && <p className="text-sm text-destructive">{errors.videoUrl.message}</p>}
      </div>
      
      <TranslatableTextarea name="birthContent" label="La naissance de Corps & Âmes" />
      
      <div className="space-y-2 rounded-md border p-4">
        <h3 className="text-lg font-medium">Média secondaire</h3>
        <Label htmlFor="mediaUrl">URL de l'image ou de la vidéo</Label>
        <Input id="mediaUrl" {...register('mediaUrl')} placeholder="https://exemple.com/image.jpg" />
        {errors.mediaUrl && <p className="text-sm text-destructive">{errors.mediaUrl.message}</p>}
      </div>
      
      <TranslatableTextarea name="husbandContent" label="Présentation de mon mari" />
      <TranslatableTextarea name="wifeContent" label="Présentation de la femme" />

      <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-card p-4 border-t">
          <Button type="submit" disabled={isSubmitting} size="lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer les modifications
          </Button>
      </div>
    </form>
  );
}