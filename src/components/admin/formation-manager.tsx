'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, Query } from 'firebase/firestore';
import type { Formation } from '@/components/providers/cart-provider';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { BookOpenCheck, Loader2, PlusCircle, Trash2, Edit, ImageOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Locale } from '@/i18n-config';

const FormationForm = dynamic(() => import('./formation-form'), {
  loading: () => <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});


interface FormationManagerProps {
  dictionary: any;
  lang: Locale;
}

export default function FormationManager({ dictionary, lang }: FormationManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formationToEdit, setFormationToEdit] = useState<Formation | undefined>(undefined);

  const formationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'formations') as Query<Formation>;
  }, [firestore]);

  const { data: formations, isLoading } = useCollection<Formation>(formationsQuery);

  const handleAddNew = () => {
    setFormationToEdit(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (formation: Formation) => {
    setFormationToEdit(formation);
    setIsFormOpen(true);
  };

  const handleDelete = async (formationId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'formations', formationId);
    try {
        await deleteDoc(docRef);
        toast({ title: dictionary.success.formationDeleted });
    } catch (e: any) {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: `formations/${formationId}`,
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

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <BookOpenCheck className="h-8 w-8 text-accent" />
          <h2 className="text-3xl font-headline">{dictionary.manageFormations}</h2>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {dictionary.addFormation}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {formations?.map((formation) => {
            const localizedName = formation.name?.[lang] || formation.name?.en || '...';
            return (
              <Card key={formation.id} className="flex flex-col">
                <CardHeader>
                    <div className="relative aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                        {formation.imageUrl ? (
                            <Image
                                src={formation.imageUrl}
                                alt={localizedName}
                                fill
                                className="object-cover rounded-t-lg"
                            />
                        ) : (
                            <ImageOff className="h-12 w-12 text-muted-foreground" />
                        )}
                    </div>
                  <CardTitle className="pt-4">{localizedName}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-lg font-semibold">
                    {new Intl.NumberFormat(lang, { style: 'currency', currency: formation.currency }).format(formation.price / 100)}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(formation)}>
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
                        <AlertDialogTitle>{dictionary.deleteFormationConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{dictionary.deleteFormationConfirmDescription}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(formation.id)}>Continue</AlertDialogAction>
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
              {formationToEdit ? dictionary.editFormation : dictionary.addFormation}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FormationForm
              formationToEdit={formationToEdit}
              onClose={() => setIsFormOpen(false)}
              dictionary={dictionary}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
