'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, Query } from 'firebase/firestore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CalendarClock, Loader2, PlusCircle, Trash2, Edit, ImageOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Locale } from '@/i18n-config';
import type { LocalizedString } from '@/components/providers/cart-provider';
import { Badge } from '../ui/badge';

const SessionTypeForm = dynamic(() => import('./session-type-form'), {
  loading: () => <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

export type SessionType = {
    id: string;
    name: LocalizedString;
    description: LocalizedString;
    sessionModel: 'private' | 'small_group' | 'large_group';
    maxParticipants: number;
    price: number;
    currency: string;
    tokenProductId: string;
    imageUrl?: string;
};

interface SessionTypeManagerProps {
  dictionary: any;
  lang: Locale;
}

export default function SessionTypeManager({ dictionary, lang }: SessionTypeManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sessionTypeToEdit, setSessionTypeToEdit] = useState<SessionType | undefined>(undefined);

  const sessionTypesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sessionTypes') as Query<SessionType>;
  }, [firestore]);

  const { data: sessionTypes, isLoading } = useCollection<SessionType>(sessionTypesQuery);

  const handleAddNew = () => {
    setSessionTypeToEdit(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (sessionType: SessionType) => {
    setSessionTypeToEdit(sessionType);
    setIsFormOpen(true);
  };

  const handleDelete = async (sessionTypeId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'sessionTypes', sessionTypeId);
    try {
        await deleteDoc(docRef);
        toast({ title: dictionary.success.sessionTypeDeleted });
    } catch (e: any) {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: `sessionTypes/${sessionTypeId}`,
                operation: 'delete',
            })
        );
        toast({
            variant: "destructive",
            title: dictionary.error.generic,
            description: e.message,
        });
    }
  };

  const getModelLabel = (model: string) => {
    const modelDict = dictionary.form.sessionModelOptions || {};
    return modelDict[model] || model;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <CalendarClock className="h-8 w-8 text-accent" />
          <h2 className="text-3xl font-headline">{dictionary.manageSessionTypes}</h2>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {dictionary.addSessionType}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {sessionTypes?.map((st) => {
            const localizedName = st.name?.[lang] || st.name?.en || 'Type de séance sans nom';
            return (
              <Card key={st.id} className="flex flex-col">
                <CardHeader>
                  <div className="relative aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                    {st.imageUrl ? (
                      <Image
                        src={st.imageUrl}
                        alt={localizedName}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                    ) : (
                      <ImageOff className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardTitle className="pt-4">{localizedName}</CardTitle>
                  <CardDescription>
                     <Badge variant="secondary">{getModelLabel(st.sessionModel)}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <p className="text-lg font-semibold">
                    {new Intl.NumberFormat(lang, { style: 'currency', currency: st.currency }).format(st.price / 100)}
                  </p>
                  <p className="text-sm text-muted-foreground">{dictionary.form.maxParticipants}: {st.maxParticipants}</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" disabled>
                    {dictionary.manageSlots}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleEdit(st)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{dictionary.deleteSessionTypeConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{dictionary.deleteSessionTypeConfirmDescription}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(st.id)}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {sessionTypeToEdit ? dictionary.editSessionType : dictionary.addSessionType}
            </DialogTitle>
            <DialogDescription className="sr-only">
                {sessionTypeToEdit ? 'Edit the details of this session type.' : 'Create a new session type by filling out the form.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <SessionTypeForm
              sessionTypeToEdit={sessionTypeToEdit}
              onClose={() => setIsFormOpen(false)}
              dictionary={dictionary}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
