'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useStorage, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookHeart, Upload } from 'lucide-react';
import type { MergedBooking } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface GrimoireUploadDialogProps {
  booking: MergedBooking;
  dictionary: any;
}

const grimoireSchema = z.object({
  pdfFile: z.any().refine((files) => files?.length == 1, 'PDF file is required.'),
});

type GrimoireFormData = z.infer<typeof grimoireSchema>;

export function GrimoireUploadDialog({ booking, dictionary }: GrimoireUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GrimoireFormData>({
    resolver: zodResolver(grimoireSchema),
  });

  const onSubmit = async (data: GrimoireFormData) => {
    if (!firestore || !storage || !booking) return;

    setIsSubmitting(true);
    try {
      const file = data.pdfFile[0];
      const filePath = `reports/${booking.userId}/${booking.id}.pdf`;
      const fileRef = ref(storage, filePath);

      await uploadBytes(fileRef, file);
      const pdfUrl = await getDownloadURL(fileRef);
      
      const thumbnail = PlaceHolderImages.find(p => p.id === 'grimoire-thumbnail');
      
      const bookingRef = doc(firestore, 'users', booking.userId, 'bookings', booking.id);
      await updateDoc(bookingRef, {
        pdfUrl: pdfUrl,
        pdfThumbnail: thumbnail?.imageUrl || '',
        reportStatus: 'available',
      });
      
      toast({ title: dictionary.admin.grimoire.upload_success_title });
      setIsOpen(false);
      reset();

    } catch (error: any) {
      console.error("Error uploading Grimoire:", error);
      toast({
        variant: 'destructive',
        title: dictionary.admin.grimoire.upload_error_title,
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="secondary">
          <BookHeart className="mr-2 h-4 w-4" />
          {dictionary.admin.grimoire.manage_button}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dictionary.admin.grimoire.title}</DialogTitle>
          <DialogDescription>
            {dictionary.admin.grimoire.description.replace('{userName}', booking.userId.substring(0,8))}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="pdfFile">{dictionary.admin.grimoire.file_label}</Label>
            <Input id="pdfFile" type="file" accept=".pdf" {...register('pdfFile')} />
            {errors.pdfFile && <p className="text-sm text-destructive">{errors.pdfFile?.message?.toString()}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              {dictionary.admin.form.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4"/>
              {dictionary.admin.grimoire.upload_button}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
