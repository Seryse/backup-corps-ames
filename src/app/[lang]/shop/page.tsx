'use client';

import React, { useState, useEffect, use } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { ShoppingBag, Loader2 } from 'lucide-react';
import type { Formation } from '@/components/providers/cart-provider';
import { FormationCard } from '@/components/shop/formation-card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Query } from 'firebase/firestore';

export default function ShopPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary['shop'] | null>(null);
  const firestore = useFirestore();

  const formationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'formations') as Query<Formation>;
  }, [firestore]);

  const { data: formations, isLoading } = useCollection<Formation>(formationsQuery);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.shop));
  }, [lang]);
  
  if (isLoading || !dict) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="mt-4 text-lg font-semibold">{dict?.loading || 'Chargement des formations...'}</p>
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
