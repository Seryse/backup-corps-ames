'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, GraduationCap, Tv, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Formation } from '@/components/providers/cart-provider';

type UserFormation = {
    id: string;
    userId: string;
    formationId: string;
    accessToken: string;
    enrollmentDate: any; // Firestore Timestamp
};

export default function TrainingsPage({ params: { lang } }: { params: { lang: Locale } }) {
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userFormationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'formations'), orderBy('enrollmentDate', 'desc')) as Query<UserFormation>;
  }, [firestore, user]);

  const allFormationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'formations') as Query<Formation>;
  }, [firestore]);

  const { data: userFormations, isLoading: isLoadingUserFormations } = useCollection<UserFormation>(userFormationsQuery);
  const { data: allFormations, isLoading: isLoadingAllFormations } = useCollection<Formation>(allFormationsQuery);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d));
  }, [lang]);

  const isLoading = isUserLoading || isLoadingUserFormations || isLoadingAllFormations || !dict;

  const mergedFormations = useMemo(() => {
    if (!userFormations || !allFormations) return [];
    return userFormations.map(uf => {
        const formationDetails = allFormations.find(f => f.id === uf.formationId);
        return {
            ...uf,
            details: formationDetails,
        };
    }).filter(f => f.details); // Filter out any user formations where the main formation was deleted
  }, [userFormations, allFormations]);


  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
            <GraduationCap className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-headline">{dict.trainings.title}</h1>
        </div>

        {mergedFormations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {mergedFormations.map(mf => {
                    if (!mf.details) return null;
                    const details = mf.details;
                    const localizedName = (details.name && typeof details.name === 'object') ? (details.name[lang] || details.name.en) : details.name;
                    const localizedDescription = (details.description && typeof details.description === 'object') ? (details.description[lang] || details.description.en) : details.description;
                    const enrollmentDate = mf.enrollmentDate?.toDate();

                    return (
                        <Card key={mf.id} className="flex flex-col">
                            <CardHeader>
                                <div className="relative aspect-video bg-muted rounded-t-lg">
                                    <Image src={details.imageUrl} alt={localizedName} fill className="object-cover rounded-t-lg" />
                                </div>
                                <CardTitle className="pt-4">{localizedName}</CardTitle>
                                {enrollmentDate && (
                                    <CardDescription>
                                        {dict.trainings.enrolled_on} {format(enrollmentDate, "d MMMM yyyy", { locale: lang === 'fr' ? fr : undefined })}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground">{localizedDescription}</p>
                            </CardContent>
                             <CardFooter className="bg-muted/50 p-4">
                                <Button asChild className="w-full">
                                    <Link href={`/${lang}/hub`}>
                                        <Users className="mr-2 h-4 w-4" />
                                        {dict.trainings.access_hub}
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        ) : (
             <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <GraduationCap className="mx-auto h-16 w-16 text-muted-foreground" />
                <h2 className="mt-6 text-2xl font-headline">{dict.trainings.no_formations_title}</h2>
                <p className="text-muted-foreground mt-2">{dict.trainings.no_formations_description}</p>
                <Button asChild className="mt-8">
                    <Link href={`/${lang}/shop`}>{dict.trainings.browse_shop}</Link>
                </Button>
            </div>
        )}
    </div>
  );
}
