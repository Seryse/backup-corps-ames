'use client';

import { use, useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Lock, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

// ✅ IDs des sessionTypes Irisphère — à mettre à jour avec tes vrais IDs Firestore
// Ces IDs correspondent aux documents dans la collection 'sessionTypes'
const IRISPHERE_SESSION_TYPE_IDS = [
  'bNIaBtKEoWR6k1OZyrHa', // Irisphère Harmonia — ton vrai ID Firestore
];

// ✅ Pour les Runes — on vérifie simplement qu'une formation existe
// pas besoin d'ID spécifique, toute formation achetée donne accès
// Si tu as plusieurs formations et que seule Runes donne accès au forum,
// remplace par l'ID Firestore de ta formation Runes
const RUNES_FORMATION_IDS: string[] = []; // Vide = toute formation donne accès

type ForumAccess = {
  canAccessIrisphere: boolean;
  canAccessRunes: boolean;
};

export default function ForumHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = use(params);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [access, setAccess] = useState<ForumAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) { router.push(`/${lang}/login`); return; }
    if (!firestore) { setIsLoading(false); return; }

    const checkAccess = async () => {
      try {
        // Admin — accès total
        const idTokenResult = await user.getIdTokenResult();
        if (idTokenResult.claims.admin === true) {
          setAccess({ canAccessIrisphere: true, canAccessRunes: true });
          return;
        }

        // Récupérer formations et séances achetées
        const [formationsSnap, sessionsSnap] = await Promise.all([
          getDocs(collection(firestore, 'users', user.uid, 'formations')),
          getDocs(collection(firestore, 'users', user.uid, 'userSessions')),
        ]);

        const userFormations = formationsSnap.docs.map(d => d.data());
        const userSessions = sessionsSnap.docs.map(d => d.data());

        // ✅ Accès Irisphère — a acheté une séance du bon type
        const hasIrisphereAccess = userSessions.some(s =>
          IRISPHERE_SESSION_TYPE_IDS.includes(s.sessionTypeId)
        );

        // ✅ Accès Runes — a acheté la formation
        // Si RUNES_FORMATION_IDS est vide → toute formation donne accès
        const hasRunesAccess = RUNES_FORMATION_IDS.length === 0
          ? userFormations.length > 0
          : userFormations.some(f => RUNES_FORMATION_IDS.includes(f.formationId));

        setAccess({ canAccessIrisphere: hasIrisphereAccess, canAccessRunes: hasRunesAccess });

      } catch (error) {
        console.error("Erreur accès forum:", error);
        setAccess({ canAccessIrisphere: false, canAccessRunes: false });
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [user, isUserLoading, firestore, lang, router]);

  if (isLoading || isUserLoading) {
    return (
      <div className="bg-[#FDFBF8] min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
      </div>
    );
  }

  const hasAnyAccess = access?.canAccessIrisphere || access?.canAccessRunes;

  return (
    <div className="bg-[#FDFBF8] min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-light text-gray-800 tracking-wider mt-2">
            Bienvenue dans votre Espace Sacré,{' '}
            <span className="font-semibold text-amber-700">
              {user?.displayName || 'Belle Âme'}
            </span>.
          </h1>
          <p className="text-lg text-gray-500 mt-2">Choisissez un cercle pour commencer l'échange.</p>
        </header>

        <div className="max-w-2xl mx-auto">
          {hasAnyAccess ? (
            <div className="space-y-6">
              {access?.canAccessIrisphere && (
                <Link href={`/${lang}/forum/irisphere-harmonia`}>
                  <Card className="bg-white/60 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-center space-x-4">
                      <Sun className="h-10 w-10 text-amber-500" />
                      <div>
                        <CardTitle className="text-xl font-normal text-gray-800">
                          Cercle Irisphère Harmonia
                        </CardTitle>
                        <CardDescription className="text-gray-500 pt-1">
                          Un espace pour les membres d'Irisphère Harmonia.
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              )}
              {access?.canAccessRunes && (
                <Link href={`/${lang}/forum/runes-de-sorcieres`}>
                  <Card className="bg-white/60 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-center space-x-4">
                      <Moon className="h-10 w-10 text-indigo-400" />
                      <div>
                        <CardTitle className="text-xl font-normal text-gray-800">
                          Sanctuaire des Runes
                        </CardTitle>
                        <CardDescription className="text-gray-500 pt-1">
                          Un sanctuaire pour les praticiennes des runes de sorcières.
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              )}
            </div>
          ) : (
            <Card className="bg-white/60 rounded-lg shadow-sm text-center py-10 px-6">
              <CardHeader>
                <div className="mx-auto bg-amber-100 rounded-full p-3 w-fit mb-4">
                  <Lock className="h-8 w-8 text-amber-600" />
                </div>
                <CardTitle className="text-2xl font-normal text-gray-800">
                  Un Cocon Sacré et Privé
                </CardTitle>
                <CardDescription className="text-gray-500 pt-2 max-w-md mx-auto leading-relaxed">
                  Afin de préserver la bienveillance et la qualité des échanges, nos cercles sont
                  des espaces intimes. L'accès est réservé aux membres qui partagent une expérience
                  commune à travers nos soins et formations.
                </CardDescription>
                <CardDescription className="text-gray-400 pt-4 text-sm max-w-md mx-auto">
                  Si vous pensez avoir déjà accès,{' '}
                  <Link href={`/${lang}/contact`} className="underline hover:text-amber-600">
                    contactez-nous
                  </Link>.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}