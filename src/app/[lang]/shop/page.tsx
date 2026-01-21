'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { ShoppingBag, Loader2 } from 'lucide-react';
import type { Formation } from '@/components/providers/cart-provider';
import { FormationCard } from '@/components/shop/formation-card';

// This is a temporary list of formations for display purposes.
// We will connect this to Firestore in the next step.
const staticFormations: Formation[] = [
  {
    id: 'reiki-1',
    name: 'Reiki Niveau 1',
    description: 'Initiation au premier degré de Reiki, pour apprendre à canaliser l\'énergie universelle pour soi-même.',
    price: 15000,
    currency: 'eur',
    imageId: 'reiki-formation',
    tokenProductId: 'prod_reiki1'
  },
  {
    id: 'divination-mastery',
    name: 'Maîtrise de la Divination',
    description: 'Explorez différents arts divinatoires comme le tarot, les oracles et la géomancie.',
    price: 22000,
    currency: 'eur',
    imageId: 'divination-mastery',
    tokenProductId: 'prod_divination'
  },
  {
    id: 'rune-crafting',
    name: 'Fabrication de Runes',
    description: 'Apprenez à fabriquer et à consacrer votre propre jeu de runes pour la divination et la magie.',
    price: 18000,
    currency: 'eur',
    imageId: 'rune-crafting',
    tokenProductId: 'prod_runes'
  }
];


export default function ShopPage({ params: { lang } }: { params: { lang: Locale } }) {
  const [dict, setDict] = useState<Dictionary['shop'] | null>(null);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.shop));
  }, [lang]);
  
  if (!dict) {
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
        
        {staticFormations && staticFormations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {staticFormations.map(formation => (
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
