'use client';

import React, { useState } from 'react';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, deleteDoc, query, where, Query, DocumentReference } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Trash2, CalendarDays, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Locale } from '@/i18n-config';
import { format } from 'date-fns';
import { fr, es } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { SessionType } from './session-type-manager';
import { Label } from '../ui/label';

// Define the shape of a time slot
type TimeSlot = {
    id: string;
    sessionTypeId: string;
    startTime: any; // Firestore Timestamp
    endTime: any; // Firestore Timestamp
    bookedParticipantsCount: number;
};

interface TimeSlotManagerProps {
  sessionTypeId: string;
  dictionary: any;
  lang: Locale;
}

const timeSlotSchema = z.object({
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
});

type TimeSlotFormData = z.infer<typeof timeSlotSchema>;

export default function TimeSlotManager({ sessionTypeId, dictionary, lang }: TimeSlotManagerProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { register, handleSubmit, formState: { errors }, reset } = useForm<TimeSlotFormData>({
        resolver: zodResolver(timeSlotSchema)
    });
    
    const locales = { fr, es };
    const locale = locales[lang as keyof typeof locales];

    // Get Session Type details
    const sessionTypeRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'sessionTypes', sessionTypeId) as DocumentReference<SessionType>;
    }, [firestore, sessionTypeId]);
    const { data: sessionType, isLoading: isLoadingSessionType } = useDoc<SessionType>(sessionTypeRef);

    // Get existing time slots for this session type
    const timeSlotsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'timeSlots'), where('sessionTypeId', '==', sessionTypeId)) as Query<TimeSlot>;
    }, [firestore, sessionTypeId]);
    const { data: timeSlots, isLoading: isLoadingTimeSlots } = useCollection<TimeSlot>(timeSlotsQuery);

    const handleAddSlot = async (data: TimeSlotFormData) => {
        if (!firestore) return;
        setIsSubmitting(true);

        const newSlot = {
            sessionTypeId,
            startTime: new Date(data.startTime),
            endTime: new Date(data.endTime),
            bookedParticipantsCount: 0,
        };

        try {
            await addDoc(collection(firestore, 'timeSlots'), newSlot);
            toast({ title: dictionary.success.slotAdded });
            reset({ startTime: '', endTime: '' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: dictionary.error.generic, description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSlot = async (slotId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'timeSlots', slotId));
            toast({ title: dictionary.success.slotDeleted });
        } catch (e: any) {
            toast({ variant: 'destructive', title: dictionary.error.generic, description: e.message });
        }
    };

    const isLoading = isLoadingSessionType || isLoadingTimeSlots;

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-12 w-12 animate-spin text-accent" /></div>;
    }

    const localizedSessionName = sessionType?.name?.[lang] || sessionType?.name?.en || '...';

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>{dictionary.addSlot}</CardTitle>
                    <CardDescription>{dictionary.addSlotFor.replace('{sessionName}', localizedSessionName)}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(handleAddSlot)} className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="grid gap-2 w-full">
                            <Label htmlFor="startTime">{dictionary.startTime}</Label>
                            <Input id="startTime" type="datetime-local" {...register('startTime')} />
                            {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
                        </div>
                         <div className="grid gap-2 w-full">
                            <Label htmlFor="endTime">{dictionary.endTime}</Label>
                            <Input id="endTime" type="datetime-local" {...register('endTime')} />
                            {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto sm:self-end">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                            <span className="ml-2">{dictionary.addSlotButton}</span>
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays />
                        {dictionary.existingSlots}
                    </CardTitle>
                    <CardDescription>{dictionary.existingSlotsFor.replace('{sessionName}', localizedSessionName)}</CardDescription>
                </CardHeader>
                <CardContent>
                    {timeSlots && timeSlots.length > 0 ? (
                        <ul className="space-y-3">
                            {timeSlots.sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis()).map(slot => (
                                <li key={slot.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Clock className="text-accent" />
                                        <div>
                                            <p className="font-medium">{format(slot.startTime.toDate(), 'PPP p', { locale })}</p>
                                            <p className="text-sm text-muted-foreground">{`→ ${format(slot.endTime.toDate(), 'p', { locale })}`}</p>
                                        </div>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{dictionary.deleteSlotConfirmTitle}</AlertDialogTitle>
                                                <AlertDialogDescription>{dictionary.deleteSlotConfirmDescription}</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{dictionary.form.cancel}</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteSlot(slot.id)}>{dictionary.delete}</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">{dictionary.noSlotsForSession}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
