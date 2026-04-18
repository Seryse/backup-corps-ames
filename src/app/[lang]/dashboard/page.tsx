'use client'

import { useEffect, useState, useMemo, use } from 'react';
import Link from 'next/link';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardTitle } from '@/components/ui/card';
import { User, GraduationCap, CalendarCheck, ChevronRight, Shield, BookHeart } from 'lucide-react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { adminEmails } from '@/lib/config';
// On remplace LifeTreeProgress par RitualTree
import { RitualTree } from '@/components/gamification/RitualTree';
import GratitudeRewardCard from '@/components/gamification/GratitudeRewardCard';
import { doc } from 'firebase/firestore';

export default function DashboardPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    return user ? doc(firestore, 'users', user.uid) : null;
  }, [user, firestore]);

  const { data: enrichedUser, isLoading: isEnrichedUserLoading } = useDoc(userDocRef);

  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);

  const handleExchangeSuccess = () => {
      console.log("Échange réussi ! Rafraîchissement des données en cours...");
  }

  // 1. GESTION DU CHARGEMENT (Mise à jour pour vérifier l'existence des données de base)
  const isLoading = isUserLoading || isEnrichedUserLoading || !dict || !enrichedUser;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="ml-4 text-muted-foreground">Chargement de votre espace...</p>
      </div>
    );
  }

  if (!user) {
     return null; 
  }

  const dashboardDict = dict.dashboard_page;
  const isAdmin = user.email && adminEmails.includes(user.email);
  const greeting = dashboardDict.subtitle.replace('{name}', user.displayName || 'Belle Âme');

  const dashboardItems = [
    { href: `/${lang}/account`, title: dashboardDict.account.title, icon: User },
    { href: `/${lang}/trainings`, title: dashboardDict.trainings.title, icon: GraduationCap },
    { href: `/${lang}/bookings`, title: dashboardDict.bookings.title, icon: CalendarCheck },
    { href: `/${lang}/grimoire`, title: dashboardDict.grimoire.title, icon: BookHeart },
  ];

  if (isAdmin) {
    dashboardItems.push({ href: `/${lang}/admin`, title: dashboardDict.admin.title, icon: Shield });
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="mb-8">
            <h1 className="text-4xl font-headline mb-2">{dashboardDict.title}</h1>
            <p className="text-lg text-muted-foreground">{greeting}</p>
        </div>

        <div className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight mb-4">Votre Jardin Secret</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                    {/* --- BRANCHEMENT DE L'ARBRE PICASSO --- */}
                    <RitualTree 
                        userId={user.uid}
                        wallet={enrichedUser.prana_wallet || 0}
                        score={enrichedUser.tree_score || 0}
                    />
                </div>
                <div>
                    <GratitudeRewardCard 
                        dictionary={dict}
                        // On simule l'ancienne structure pour ne pas casser GratitudeRewardCard tout de suite
                        gamificationData={{
                            seeds: enrichedUser.prana_wallet || 0,
                            totalAccumulated: enrichedUser.tree_score || 0,
                            rank: enrichedUser.gamification?.rank || "Racines",
                            badges: enrichedUser.gamification?.badges || []
                        }}
                        onExchangeSuccess={handleExchangeSuccess}
                    />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dashboardItems.map((item) => (
                <Link href={item.href} key={item.href} className="flex">
                    <Card className="w-full flex flex-row items-center justify-between transition-transform transform hover:-translate-y-1 hover:shadow-lg p-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-accent/20 p-3 rounded-full">
                                <item.icon className="h-6 w-6 text-accent" />
                            </div>
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Card>
                </Link>
            ))}
        </div>
    </div>
  );
}