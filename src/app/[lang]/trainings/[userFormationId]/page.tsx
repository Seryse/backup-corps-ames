'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, DocumentReference } from 'firebase/firestore';
import { updateFormationProgress } from '@/app/actions';
import { Formation, FormationChapter } from '@/components/providers/cart-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Award, BookOpen, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

// Type for the user's specific enrollment in a formation
type UserFormation = {
  id: string;
  userId: string;
  formationId: string;
  enrollmentDate: any;
  completedChapters?: string[];
  certificationUrl?: string;
};

// Simplified user profile type for this page
type UserProfile = {
    id: string;
    certificateName?: string;
};

export default function TrainingPage({ params }: { params: Promise<{ lang: Locale; userFormationId: string }> }) {
  const { lang, userFormationId } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [certNameInput, setCertNameInput] = useState('');
  const [isSavingCertName, setIsSavingCertName] = useState(false);

  // Fetch dictionary
  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);

  // Memoized reference to the UserFormation document
  const userFormationRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'formations', userFormationId) as DocumentReference<UserFormation>;
  }, [firestore, user, userFormationId]);
  
  const { data: userFormation, isLoading: isLoadingUserFormation } = useDoc<UserFormation>(userFormationRef);

  // Memoized reference to the main Formation document, dependent on userFormation data
  const formationRef = useMemoFirebase(() => {
    if (!firestore || !userFormation) return null;
    return doc(firestore, 'formations', userFormation.formationId) as DocumentReference<Formation>;
  }, [firestore, userFormation]);

  const { data: formation, isLoading: isLoadingFormation } = useDoc<Formation>(formationRef);

  // Memoized reference to the UserProfile document
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid) as DocumentReference<UserProfile>;
  }, [firestore, user]);
  
  const { data: userProfile, isLoading: isLoadingUserProfile } = useDoc<UserProfile>(userProfileRef);

  // Prefill cert name input if it exists in the profile
  useEffect(() => {
    if (userProfile?.certificateName) {
      setCertNameInput(userProfile.certificateName);
    }
  }, [userProfile]);

  // Handler for marking a chapter as complete/incomplete
  const handleChapterToggle = async (chapterId: string, currentState: boolean) => {
    if (!user) return;
    const result = await updateFormationProgress(user.uid, userFormationId, chapterId, !currentState);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error,
      });
    }
  };
  
  const handleSaveCertName = async () => {
    if (!userProfileRef || !certNameInput) return;
    setIsSavingCertName(true);
    try {
        await setDoc(userProfileRef, { certificateName: certNameInput }, { merge: true });
        toast({ title: dict?.training_page.name_saved_success || "Name saved!" });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: dict?.error.generic || 'An error occurred.',
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

  // If user is not the owner of the enrollment, or data is missing, show error/redirect
  if (!user || !userFormation || !formation) {
    if(!isUserLoading) notFound(); // Or a more graceful error page
    return null; // or loader
  }

  const trainingDict = dict.training_page;
  const chapters = formation.chapters || [];
  const completedChapters = userFormation.completedChapters || [];
  const progress = chapters.length > 0 ? (completedChapters.length / chapters.length) * 100 : 0;
  const allChaptersCompleted = chapters.length > 0 && completedChapters.length === chapters.length;

  return (
    <div className="container mx-auto p-4 sm:p-8 max-w-4xl">
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

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{trainingDict.progress}</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2 text-center">{Math.round(progress)}% {trainingDict.completed}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{trainingDict.chapters}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chapters.map((chapter) => {
              const isCompleted = completedChapters.includes(chapter.id);
              const contentUrl = chapter.contentUrl?.[lang] || chapter.contentUrl?.fr;
              return (
                <div key={chapter.id} className="flex items-center gap-4 rounded-md border p-4">
                  <Checkbox
                    id={`chapter-${chapter.id}`}
                    checked={isCompleted}
                    onCheckedChange={() => handleChapterToggle(chapter.id, isCompleted)}
                  />
                  <div className="grid gap-1.5 leading-none flex-1">
                    <Label htmlFor={`chapter-${chapter.id}`} className="text-base font-medium">
                      {chapter.title?.[lang] || chapter.title?.fr}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {chapter.description?.[lang] || chapter.description?.fr}
                    </p>
                  </div>
                  {contentUrl && (
                    <Button variant="outline" size="sm" asChild>
                        <a href={contentUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {trainingDict.open_chapter || 'Open Chapter'}
                        </a>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {allChaptersCompleted && (
        <Card className="mt-8 bg-accent/20 border-accent">
          <CardHeader className="items-center text-center">
            <Award className="h-12 w-12 text-accent mb-2" />
            <CardTitle>{trainingDict.congratulations}</CardTitle>
            <CardDescription>{trainingDict.all_chapters_completed}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {userFormation.certificationUrl ? (
                <Button asChild>
                    <a href={userFormation.certificationUrl} target="_blank" rel="noopener noreferrer">
                    {trainingDict.download_certificate}
                    </a>
                </Button>
            ) : userProfile?.certificateName ? (
                 <p className="text-muted-foreground">{trainingDict.certificate_being_prepared.replace('{name}', userProfile.certificateName)}</p>
            ) : (
                <div className="mt-4 space-y-4 max-w-sm mx-auto">
                    <p className="text-muted-foreground">{trainingDict.certificate_almost_ready}</p>
                    <div className="grid gap-2 text-left">
                        <Label htmlFor="certName">{trainingDict.certificate_name_label}</Label>
                        <Input 
                            id="certName" 
                            value={certNameInput}
                            onChange={(e) => setCertNameInput(e.target.value)}
                            placeholder={trainingDict.certificate_name_placeholder}
                        />
                    </div>
                    <Button onClick={handleSaveCertName} disabled={isSavingCertName || !certNameInput}>
                        {isSavingCertName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {trainingDict.save_name_and_generate}
                    </Button>
                    <p className="text-xs text-muted-foreground">{trainingDict.certificate_generation_info}</p>
                </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    