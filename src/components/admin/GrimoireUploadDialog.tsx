'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useStorage } from '@/firebase';
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
import { cn } from '@/lib/utils';

interface GrimoireUploadDialogProps {
  booking: MergedBooking;
  dictionary: any;
  className?: string;
}

export function GrimoireUploadDialog({ booking, dictionary, className }: GrimoireUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  
  const hasExistingReport = booking.reportStatus === 'available' && booking.pdfUrl;

  const schema = z.object({
    pdfFile: z.any().optional(),
    pdfThumbnailFile: z.any().optional(),
  }).refine(data => {
      // If there is no existing report, a new PDF file is mandatory.
      if (!hasExistingReport) {
          return data.pdfFile && data.pdfFile.length === 1;
      }
      return true;
  }, {
      message: dictionary.admin.grimoire.pdf_required_error || 'A PDF file is required for the initial upload.',
      path: ['pdfFile'],
  });

  type GrimoireFormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GrimoireFormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: GrimoireFormData) => {
    if (!firestore || !storage || !booking) return;

    const pdfFile = data.pdfFile?.[0];
    const thumbnailFile = data.pdfThumbnailFile?.[0];

    if (!pdfFile && !thumbnailFile) {
        toast({
            title: dictionary.admin.grimoire.nothing_to_update_title || "Nothing to Update",
            description: dictionary.admin.grimoire.nothing_to_update_desc || "Please select a PDF or an image file to update.",
        });
        return;
    }

    setIsSubmitting(true);
    try {
        const updatePayload: { pdfUrl?: string; pdfThumbnail?: string; reportStatus: 'available' } = {
            reportStatus: 'available',
        };

        if (thumbnailFile) {
            const thumbnailPath = `reports/${booking.userId}/${booking.id}_thumb.jpg`;
            const thumbnailFileRef = ref(storage, thumbnailPath);
            await uploadBytes(thumbnailFileRef, thumbnailFile);
            updatePayload.pdfThumbnail = await getDownloadURL(thumbnailFileRef);
        }

        if (pdfFile) {
            const filePath = `reports/${booking.userId}/${booking.id}.pdf`;
            const fileRef = ref(storage, filePath);
            await uploadBytes(fileRef, pdfFile);
            updatePayload.pdfUrl = await getDownloadURL(fileRef);
        }
        
        const bookingRef = doc(firestore, 'users', booking.userId, 'bookings', booking.id);
        await updateDoc(bookingRef, updatePayload);
    
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
        <Button className={cn("w-full", className)} variant={hasExistingReport ? "outline" : "secondary"}>
          <BookHeart className="mr-2 h-4 w-4" />
          {hasExistingReport ? dictionary.admin.grimoire.edit_button : dictionary.admin.grimoire.manage_button}
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

           {booking.pdfThumbnail && (
             <div className="grid gap-2">
                <Label>{dictionary.admin.grimoire.current_thumbnail_label}</Label>
                <div className="relative aspect-[3/4] w-28 mt-1 bg-muted rounded-md flex items-center justify-center">
                  <Image src={booking.pdfThumbnail} alt="Current Grimoire thumbnail" fill className="object-cover rounded-md" />
                </div>
            </div>
           )}

          <div className="grid gap-2">
            <Label htmlFor="pdfFile">{dictionary.admin.grimoire.file_label} {hasExistingReport && "(Optionnel)"}</Label>
            <Input id="pdfFile" type="file" accept=".pdf" {...register('pdfFile')} />
            {errors.pdfFile && <p className="text-sm text-destructive">{errors.pdfFile?.message?.toString()}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pdfThumbnailFile">{dictionary.admin.grimoire.thumbnail_label}</Label>
            <Input id="pdfThumbnailFile" type="file" accept="image/*" {...register('pdfThumbnailFile')} />
            {errors.pdfThumbnailFile && <p className="text-sm text-destructive">{errors.pdfThumbnailFile?.message?.toString()}</p>}
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
