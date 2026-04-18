'use client';

import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
// --- FIX IMPORTANT : On utilise Firestore Client-Side uniquement ---
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove, DocumentReference } from 'firebase/firestore';

import { Formation } from '@/components/providers/cart-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Award, BookOpen, ExternalLink, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

type UserFormation = {
  id: string;
  userId: string;
  formationId: string;
  enrollmentDate: any;
  completedChapters?: string[];
  certificationUrl?: string;
};

type UserProfile = {
    id: string;
    certificateName?: string;
};

export default function TrainingPage({ params }: { params: Promise<{ lang: Locale; userFormationId: string }> }) {
  const { lang, userFormationId } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [certNameInput, setCertNameInput] = useState('');
  const [isSavingCertName, setIsSavingCertName] = useState(false);

  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);

  // 1. Référence à l'inscription de l'utilisateur
  const userFormationRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'formations', userFormationId) as DocumentReference<UserFormation>;
  }, [firestore, user, userFormationId]);
  
  const { data: userFormation, isLoading: isLoadingUserFormation } = useDoc<UserFormation>(userFormationRef);

  // 2. Référence à la formation globale (pour avoir les titres des chapitres)
  const formationRef = useMemoFirebase(() => {
    if (!firestore || !userFormation) return null;
    return doc(firestore, 'formations', userFormation.formationId) as DocumentReference<Formation>;
  }, [firestore, userFormation]);

  const { data: formation, isLoading: isLoadingFormation } = useDoc<Formation>(formationRef);

  // 3. Référence au profil (pour le nom sur le certificat)
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid) as DocumentReference<UserProfile>;
  }, [firestore, user]);
  
  const { data: userProfile, isLoading: isLoadingUserProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (userProfile?.certificateName) {
      setCertNameInput(userProfile.certificateName);
    }
  }, [userProfile]);

  // --- LOGIQUE CLIENT-SIDE (Plus d'appel serveur ici) ---
  const handleChapterToggle = async (chapterId: string, isCurrentlyCompleted: boolean) => {
    if (!userFormationRef) return;

    try {
        await updateDoc(userFormationRef, {
            completedChapters: isCurrentlyCompleted 
                ? arrayRemove(chapterId) 
                : arrayUnion(chapterId)
        });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible de mettre à jour la progression.",
      });
    }
  };
  
  const handleSaveCertName = async () => {
    if (!userProfileRef || !certNameInput) return;
    setIsSavingCertName(true);
    try {
        await setDoc(userProfileRef, { certificateName: certNameInput }, { merge: true });
        toast({ title: dict?.training_page.name_saved_success || "Nom sauvegardé !" });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: dict?.error.generic || 'Erreur',
            description: error.message,
        });
    } finally {
        setIsSavingCertName(false);
    }
  };

  const isLoading = isUserLoading || isLoadingUserFormation || isLoadingFormation || isLoadingUserProfile || !dict;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || !userFormation || !formation) {
    if(!isUserLoading) notFound(); 
    return null; 
  }

  const trainingDict = dict.training_page;
  const chapters = formation.chapters || [];
  const completedChapters = userFormation.completedChapters || [];
  // Calcul du pourcentage
  const progress = chapters.length > 0 ? (completedChapters.length / chapters.length) * 100 : 0;
  const allChaptersCompleted = chapters.length > 0 && completedChapters.length === chapters.length;

  return (
    <div className="container mx-auto p-4 sm:p-8 max-w-4xl">
      {/* HEADER */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/${lang}/trainings`}>
            <ArrowLeft className="mr-2" />
            {trainingDict.back_to_trainings}
          </Link>
        </Button>
        <h1 className="text-4xl font-headline mb-2 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-accent"/>
          {formation.name?.[lang] || formation.name.fr}
        </h1>
        <p className="text-lg text-muted-foreground">{formation.description?.[lang] || formation.description.fr}</p>
      </div>

      {/* BARRE DE PROGRESSION */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{trainingDict.progress}</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2 text-center">{Math.round(progress)}% {trainingDict.completed}</p>
        </CardContent>
      </Card>

      {/* LISTE DES CHAPITRES */}
      <Card>
        <CardHeader>
          <CardTitle>{trainingDict.chapters}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chapters.map((chapter, index) => {
              const isCompleted = completedChapters.includes(chapter.id);
              const contentUrl = chapter.contentUrl?.[lang] || chapter.contentUrl?.fr;

              // --- LOGIQUE DE VERROUILLAGE (Cadenas) ---
              // On vérifie si le chapitre précédent est fini
              const previousChapterId = index > 0 ? chapters[index - 1].id : null;
              const isLocked = previousChapterId ? !completedChapters.includes(previousChapterId) : false;

              return (
                <div key={chapter.id} className={`flex items-center gap-4 rounded-md border p-4 transition-colors ${isLocked ? 'bg-muted/50 opacity-70' : 'hover:bg-accent/5'}`}>
                  
                  {isLocked ? (
                      <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                      <Checkbox
                        id={`chapter-${chapter.id}`}
                        checked={isCompleted}
                        onCheckedChange={() => handleChapterToggle(chapter.id, isCompleted)}
                      />
                  )}

                  <div className="grid gap-1.5 leading-none flex-1">
                    <Label 
                        htmlFor={`chapter-${chapter.id}`} 
                        className={`text-base font-medium ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {chapter.title?.[lang] || chapter.title?.fr}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {chapter.description?.[lang] || chapter.description?.fr}
                    </p>
                  </div>

                  {contentUrl && !isLocked && (
                    <Button variant="outline" size="sm" asChild>
                        <a href={contentUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {trainingDict.open_chapter || 'Voir le cours'}
                        </a>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SECTION FINALE : CERTIFICAT + APPEL AU MENTORAT */}
      {allChaptersCompleted && (
        <Card className="mt-8 bg-accent/10 border-accent animate-in fade-in slide-in-from-bottom-4">
          <CardHeader className="items-center text-center">
            <Award className="h-12 w-12 text-accent mb-2" />
            <CardTitle>{trainingDict.congratulations}</CardTitle>
            <CardDescription>{trainingDict.all_chapters_completed}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            
            {/* PARTIE 1 : Le Certificat (Théorique) */}
            <div className="p-4 bg-background rounded-lg border shadow-sm">
                <h3 className="font-semibold mb-2">Votre Attestation de Réussite</h3>
                {userFormation.certificationUrl ? (
                    <Button asChild className="w-full sm:w-auto">
                        <a href={userFormation.certificationUrl} target="_blank" rel="noopener noreferrer">
                        {trainingDict.download_certificate}
                        </a>
                    </Button>
                ) : userProfile?.certificateName ? (
                     <p className="text-muted-foreground">{trainingDict.certificate_being_prepared.replace('{name}', userProfile.certificateName)}</p>
                ) : (
                    <div className="mt-2 space-y-3 max-w-sm mx-auto">
                        <p className="text-sm text-muted-foreground">{trainingDict.certificate_almost_ready}</p>
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="certName">{trainingDict.certificate_name_label}</Label>
                            <Input 
                                id="certName" 
                                value={certNameInput}
                                onChange={(e) => setCertNameInput(e.target.value)}
                                placeholder="Nom Prénom"
                            />
                        </div>
                        <Button onClick={handleSaveCertName} disabled={isSavingCertName || !certNameInput} className="w-full">
                            {isSavingCertName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {trainingDict.save_name_and_generate}
                        </Button>
                    </div>
                )}
            </div>

            {/* PARTIE 2 : L'Upsell (Mentorat) - Placeholder visuel */}
            <div className="border-t pt-6">
                <h3 className="font-headline text-xl mb-2">Vous souhaitez devenir Praticien Certifié ?</h3>
                <p className="text-muted-foreground mb-4">
                    Passez de la théorie à la pratique. Réservez votre mentorat pour valider vos acquis et rejoindre le réseau professionnel.
                </p>
                <Button variant="outline" asChild>
                    <Link href={`/${lang}/book`}>
                        Réserver mon Mentorat
                    </Link>
                </Button>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}