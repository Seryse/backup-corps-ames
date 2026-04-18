'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Query } from 'firebase/firestore';
import type { SessionType } from '@/components/admin/session-type-manager';
import { Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const categoriesOrder: (SessionType['category'])[] = [
    'irisphere-harmonia',
    'guidances',
    'energetic-treatments',
    'dialogue-space',
    'combined-treatments'
];

export default function SoinsPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = use(params);
    const [dict, setDict] = useState<Dictionary | null>(null);
    const firestore = useFirestore();

    useEffect(() => {
        getDictionary(lang).then(setDict);
    }, [lang]);

    const sessionTypesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'sessionTypes')) as Query<SessionType>;
    }, [firestore]);

    const { data: sessionTypes, isLoading } = useCollection<SessionType>(sessionTypesQuery);

    const groupedSoins = useMemo(() => {
        if (!sessionTypes) return {};
        return sessionTypes.reduce((acc, soin) => {
            const category = soin.category || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(soin);
            return acc;
        }, {} as Record<string, SessionType[]>);
    }, [sessionTypes]);

    if (isLoading || !dict) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-accent" />
                <p className="mt-4 text-lg font-semibold">{dict?.soins_page?.loading || 'Chargement des soins...'}</p>
            </div>
        );
    }
    
    const soinsDict = dict.soins_page;

    return (
        <div className="container mx-auto p-4 sm:p-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto">
                <h1 className="text-5xl font-headline mb-4 flex items-center justify-center gap-4"><Sparkles className="h-10 w-10 text-accent" />{soinsDict.title}</h1>
                <p className="text-lg text-muted-foreground">{soinsDict.intro}</p>
            </div>

            {categoriesOrder.map((categoryKey, index) => {
                const categorySoins = groupedSoins[categoryKey];
                if (!categorySoins || categorySoins.length === 0) {
                    return null;
                }
                const categoryInfo = soinsDict.categories[categoryKey];
                return (
                    <section key={categoryKey} className="space-y-8">
                        {index > 0 && <Separator />}
                        <div className="text-center max-w-3xl mx-auto">
                            <h2 className="text-4xl font-headline">{categoryInfo.title}</h2>
                            <p className="mt-4 text-muted-foreground">{categoryInfo.intro}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {categorySoins.map(soin => {
                                const localizedName = soin.name?.[lang] || soin.name.en;
                                return (
                                    <Link key={soin.id} href={`/${lang}/session-types/${soin.id}`} className="flex">
                                        <Card className="w-full flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
                                            <CardHeader className="p-0">
                                                <div className="relative aspect-[4/3] bg-muted">
                                                    {soin.imageUrl && <Image src={soin.imageUrl} alt={localizedName} fill className="object-cover"/>}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4 flex-1">
                                                <h3 className="text-xl font-headline font-semibold">{localizedName}</h3>
                                                <p className="text-lg font-bold mt-2">{new Intl.NumberFormat(lang, { style: 'currency', currency: soin.currency }).format(soin.price / 100)}</p>
                                            </CardContent>
                                            <div className="p-4 pt-0">
                                                <Button className="w-full">{soinsDict.book_now}</Button>
                                            </div>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
