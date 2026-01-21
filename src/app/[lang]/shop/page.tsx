'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { ShoppingBag, Loader2, TriangleAlert } from 'lucide-react';
import type { Formation } from '@/components/providers/cart-provider';
import { FormationCard } from '@/components/shop/formation-card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// This type represents the structure of the document in Firestore, with localized fields
export type FormationDocument = Omit<Formation, 'name' | 'description' | 'id'> & {
    name: { [key in Locale]?: string };
    description: { [key in Locale]?: string };
};

export default function ShopPage({ params: { lang } }: { params: { lang: Locale } }) {
  const [dict, setDict] = useState<Dictionary['shop'] | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.shop));
  }, [lang]);

  const formationsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'formations');
  }, [firestore]);
  
  const { data: formationsData, isLoading, error } = useCollection<FormationDocument>(formationsCollection);

  // This transforms the Firestore data into the format the `FormationCard` expects,
  // selecting the correct language for the current user.
  const formations: Formation[] | null = useMemo(() => {
    if (!formationsData) return null;
    return formationsData.map(doc => ({
      ...doc,
      name: (doc.name && doc.name[lang]) || (doc.name && doc.name['fr']) || doc.id, // Fallback logic
      description: (doc.description && doc.description[lang]) || (doc.description && doc.description['fr']) || '', // Fallback logic
    }));
  }, [formationsData, lang]);
  
  if (isLoading || !dict) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="mt-4 text-lg font-semibold">{dict?.loading || 'Chargement des formations...'}</p>
      </div>
    )
  }

  if (error) {
      return (
          <div className="container mx-auto p-4 sm:p-8">
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Erreur de chargement</AlertTitle>
                <AlertDescription>
                    Un problème est survenu lors de la récupération des formations. Veuillez réessayer plus tard.
                </AlertDescription>
            </Alert>
          </div>
      )
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
            <ShoppingBag className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-headline">{dict.title}</h1>
        </div>
        
        {formations && formations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {formations.map(formation => (
                    <FormationCard key={formation.id} formation={formation} dict={dict} lang={lang} />
                ))}
            </div>
        ) : (
             <div className="text-center py-16">
                <h2 className="text-2xl font-headline">Boutique en construction</h2>
                <p className="text-muted-foreground mt-2">{dict.noFormations || "Aucune formation n'est disponible pour le moment."}</p>
             </div>
        )}
    </div>
  );
}
