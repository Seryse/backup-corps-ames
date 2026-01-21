'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Query } from 'firebase/firestore';

type TimeSlot = {
    id: string;
    sessionTypeId: string;
    startTime: any; // Firestore Timestamp
    endTime: any; // Firestore Timestamp
    bookedParticipantsCount: number;
};

export default function AgendaPage({ params: { lang } }: { params: { lang: Locale } }) {
  const [dict, setDict] = useState<Dictionary['agenda'] | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const firestore = useFirestore();

  const timeSlotsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'timeSlots')) as Query<TimeSlot>;
  }, [firestore]);

  const { data: timeSlots, isLoading: isLoadingTimeSlots } = useCollection<TimeSlot>(timeSlotsQuery);

  const availableSlots = useMemo(() => {
    if (!timeSlots) return {};
    return timeSlots.reduce((acc, slot) => {
      const dateKey = format(slot.startTime.toDate(), 'yyyy-MM-dd');
      const time = format(slot.startTime.toDate(), 'HH:mm');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      if (!acc[dateKey].includes(time)) {
        acc[dateKey].push(time);
      }
      acc[dateKey].sort();
      return acc;
    }, {} as { [key: string]: string[] });
  }, [timeSlots]);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.agenda));
  }, [lang]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
  };
  
  const handleBooking = () => {
    const locales: { [key: string]: any } = { en: enUS, fr, es };
    alert(`Booking confirmed for ${date ? format(date, 'PPP', { locale: locales[lang] }) : ''} at ${selectedSlot}`);
  };

  const selectedDateString = date ? format(date, 'yyyy-MM-dd') : '';
  const slotsForSelectedDate = availableSlots[selectedDateString] || [];
  
  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang];

  if (isLoadingTimeSlots || !dict) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
            <CalendarDays className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-headline">{dict?.title || 'Agenda'}</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card>
                    <CardContent className="p-0 sm:p-4 flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            className="rounded-md"
                            disabled={(d) => {
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                return d < today || !availableSlots[format(d, 'yyyy-MM-dd')];
                            }}
                            locale={dateFnsLocale}
                        />
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl font-headline">
                           <Clock className="h-5 w-5" />
                           {dict?.availableSlots || 'Available Slots'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="min-h-[200px]">
                        {date ? (
                            slotsForSelectedDate.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-center font-semibold mb-4">{format(date, 'd MMMM yyyy', { locale: dateFnsLocale })}</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {slotsForSelectedDate.map(slot => (
                                            <Button
                                                key={slot}
                                                variant={selectedSlot === slot ? 'default' : 'outline'}
                                                onClick={() => handleSlotSelect(slot)}
                                            >
                                                {slot}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-muted-foreground text-center">{dict?.noSlots || 'No slots available for this date.'}</p>
                                </div>
                            )
                        ) : (
                             <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground text-center">{dict?.selectDate || 'Please select a date from the calendar.'}</p>
                            </div>
                        )}
                        {selectedSlot && date && (
                            <div className="mt-6 text-center">
                                <p className="text-sm mb-4">{dict?.confirmBooking || 'You are booking a session for'} <strong>{format(date, 'd MMMM yyyy', { locale: dateFnsLocale })}</strong> at <strong>{selectedSlot}</strong>.</p>
                                <Button onClick={handleBooking} className="w-full">{dict?.bookNow || 'Book Now'}</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
