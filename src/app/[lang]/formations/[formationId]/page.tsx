import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { db } from '@/firebase/server';
import { doc, getDoc } from 'firebase/firestore';
import type { Formation } from '@/components/providers/cart-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FormationDetailClient from '@/components/shop/formation-detail-client';

async function getFormation(id: string): Promise<Formation | null> {
    const docRef = doc(db, 'formations', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    return { id: docSnap.id, ...docSnap.data() } as Formation;
}


export default async function FormationDetailPage({ params: { lang, formationId } }: { params: { lang: Locale, formationId: string } }) {
    const dict = await getDictionary(lang);
    const formation = await getFormation(formationId);

    if (!formation) {
        notFound();
    }

    const localizedName = formation.name?.[lang] || formation.name?.fr;
    const localizedDescription = formation.description?.[lang] || formation.description?.fr;
    const localizedPageContent = formation.pageContent?.[lang] || formation.pageContent?.fr;

    return (
        <div className="container mx-auto p-4 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader className="p-0">
                            <div className="relative aspect-video">
                                <Image 
                                    src={formation.imageUrl} 
                                    alt={localizedName} 
                                    fill 
                                    className="object-cover rounded-t-lg"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <h1 className="text-4xl font-headline mb-4">{localizedName}</h1>
                            <p className="text-lg text-muted-foreground">{localizedDescription}</p>
                            {localizedPageContent && (
                                <div className="prose dark:prose-invert mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: localizedPageContent.replace(/\n/g, '<br />') }} />
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1">
                    <FormationDetailClient formation={formation} dict={dict} lang={lang} />
                </div>
            </div>
        </div>
    );
}
