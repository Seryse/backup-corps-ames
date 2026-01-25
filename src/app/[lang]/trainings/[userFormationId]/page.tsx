'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { updateFormationProgress } from '@/app/actions';
import { Formation, FormationChapter } from '@/components/providers/cart-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Award, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Type for the user's specific enrollment in a formation
type UserFormation = {
  id: string;
  userId: string;
  formationId: string;
  enrollmentDate: any;
  completedChapters?: string[];
  certificationUrl?: string;
};

export default function TrainingPage({ params }: { params: Promise<{ lang: Locale; userFormationId: string }> }) {
  const { lang, userFormationId } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // Fetch dictionary
  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);

  // Memoized reference to the UserFormation document
  const userFormationRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'formations', userFormationId) as DocumentReference<UserFormation>;
  }, [firestore, user, userFormationId]);
  
  const { data: userFormation, isLoading: isLoadingUserFormation, error: userFormationError } = useDoc<UserFormation>(userFormationRef);

  // Memoized reference to the main Formation document, dependent on userFormation data
  const formationRef = useMemoFirebase(() => {
    if (!firestore || !userFormation) return null;
    return doc(firestore, 'formations', userFormation.formationId) as DocumentReference<Formation>;
  }, [firestore, userFormation]);

  const { data: formation, isLoading: isLoadingFormation } = useDoc<Formation>(formationRef);

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

  const isLoading = isUserLoading || isLoadingUserFormation || isLoadingFormation || !dict;

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
          {formation.name[lang]}
        </h1>
        <p className="text-lg text-muted-foreground">{formation.description[lang]}</p>
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
              return (
                <div key={chapter.id} className="flex items-center gap-4 rounded-md border p-4">
                  <Checkbox
                    id={`chapter-${chapter.id}`}
                    checked={isCompleted}
                    onCheckedChange={() => handleChapterToggle(chapter.id, isCompleted)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={`chapter-${chapter.id}`} className="text-base font-medium">
                      {chapter.title}
                    </Label>
                    <p className="text-sm text-muted-foreground">{chapter.description}</p>
                  </div>
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
            ) : (
              <p className="text-muted-foreground">{trainingDict.certificate_not_ready}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
