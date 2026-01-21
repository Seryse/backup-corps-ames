'use client';

import React, { useState } from 'react';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, where, Query, DocumentReference, writeBatch } from 'firebase/firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Trash2, CalendarDays, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Locale } from '@/i18n-config';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { fr, es } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { SessionType } from './session-type-manager';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  recurrence: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']).default('none'),
  repeatCount: z.coerce.number().int().min(1, 'Must be at least 1').default(1),
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
});

type TimeSlotFormData = z.infer<typeof timeSlotSchema>;

export default function TimeSlotManager({ sessionTypeId, dictionary, lang }: TimeSlotManagerProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { register, handleSubmit, formState: { errors }, reset, control, watch } = useForm<TimeSlotFormData>({
        resolver: zodResolver(timeSlotSchema),
        defaultValues: {
            startTime: '',
            endTime: '',
            recurrence: 'none',
            repeatCount: 1,
        }
    });

    const recurrenceValue = watch('recurrence', 'none');
    
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

        const { startTime, endTime, recurrence, repeatCount } = data;
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        const duration = endDate.getTime() - startDate.getTime();

        const slotsToAdd: Omit<TimeSlot, 'id' | 'startTime' | 'endTime'>[] = [];
        const effectiveRepeatCount = recurrence === 'none' ? 1 : repeatCount;

        for (let i = 0; i < effectiveRepeatCount; i++) {
            let newStartDate: Date;
            switch (recurrence) {
                case 'daily':
                    newStartDate = addDays(startDate, i);
                    break;
                case 'weekly':
                    newStartDate = addWeeks(startDate, i);
                    break;
                case 'biweekly':
                    newStartDate = addWeeks(startDate, i * 2);
                    break;
                case 'monthly':
                    newStartDate = addMonths(startDate, i);
                    break;
                case 'none':
                default:
                    newStartDate = startDate;
                    if (i > 0) continue; // Ensure only one loop for 'none'
            }

            const newEndDate = new Date(newStartDate.getTime() + duration);
            slotsToAdd.push({
                sessionTypeId,
                startTime: newStartDate,
                endTime: newEndDate,
                bookedParticipantsCount: 0,
            } as any);
        }

        try {
            const batch = writeBatch(firestore);
            slotsToAdd.forEach(slot => {
                const docRef = doc(collection(firestore, 'timeSlots'));
                batch.set(docRef, slot);
            });
            await batch.commit();

            toast({ title: dictionary.success.slotsAdded });
            reset();
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
                    <form onSubmit={handleSubmit(handleAddSlot)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startTime">{dictionary.startTime}</Label>
                                <Input id="startTime" type="datetime-local" {...register('startTime')} />
                                {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endTime">{dictionary.endTime}</Label>
                                <Input id="endTime" type="datetime-local" {...register('endTime')} />
                                {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{dictionary.recurrence}</Label>
                                <Controller
                                    control={control}
                                    name="recurrence"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={dictionary.recurrenceOptions.none} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{dictionary.recurrenceOptions.none}</SelectItem>
                                                <SelectItem value="daily">{dictionary.recurrenceOptions.daily}</SelectItem>
                                                <SelectItem value="weekly">{dictionary.recurrenceOptions.weekly}</SelectItem>
                                                <SelectItem value="biweekly">{dictionary.recurrenceOptions.biweekly}</SelectItem>
                                                <SelectItem value="monthly">{dictionary.recurrenceOptions.monthly}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            {recurrenceValue !== 'none' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="repeatCount">{dictionary.repeatCount}</Label>
                                    <Input id="repeatCount" type="number" min="1" {...register('repeatCount')} />
                                    {errors.repeatCount && <p className="text-sm text-destructive">{errors.repeatCount.message}</p>}
                                </div>
                            )}
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                            <span className="ml-2">{dictionary.addSlotsButton}</span>
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
