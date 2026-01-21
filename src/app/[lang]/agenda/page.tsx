'use client';

import React, { useState, useEffect } from 'react';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Mock data for available time slots for specific dates
const availableSlots: { [key: string]: string[] } = {
  [format(addDays(new Date(), 2), 'yyyy-MM-dd')]: ['10:00', '11:00', '14:00'],
  [format(addDays(new Date(), 5), 'yyyy-MM-dd')]: ['09:00', '10:00', '15:00', '16:00'],
  [format(addDays(new Date(), 7), 'yyyy-MM-dd')]: ['11:00', '12:00'],
};

export default function AgendaPage({ params: { lang } }: { params: { lang: Locale } }) {
  const [dict, setDict] = useState<Dictionary['agenda'] | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.agenda));
  }, [lang]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setSelectedSlot(null); // Reset selected slot when date changes
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
  };
  
  const handleBooking = () => {
    // In a future step, this will add the session to the cart and proceed to checkout
    // For now, it's just a placeholder action
    alert(`Booking confirmed for ${date ? format(date, 'PPP', { locale: lang === 'fr' ? fr : undefined }) : ''} at ${selectedSlot}`);
  };

  const selectedDateString = date ? format(date, 'yyyy-MM-dd') : '';
  const slotsForSelectedDate = availableSlots[selectedDateString] || [];

  return (
    <div className="container mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
            <CalendarDays className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-headline">{dict?.title || 'Agenda'}</h1>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
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
                            locale={lang === 'fr' ? fr : undefined}
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
                                    <p className="text-center font-semibold mb-4">{format(date, 'd MMMM yyyy', { locale: lang === 'fr' ? fr : undefined })}</p>
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
                                <p className="text-sm mb-4">{dict?.confirmBooking || 'You are booking a session for'} <strong>{format(date, 'd MMMM yyyy', { locale: lang === 'fr' ? fr : undefined })}</strong> at <strong>{selectedSlot}</strong>.</p>
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
