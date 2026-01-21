'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import type { CalendarProps } from 'react-calendar';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Loader2, Info, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, fr, es } from 'date-fns/locale';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, Query } from 'firebase/firestore';
import type { SessionType } from '@/components/admin/session-type-manager';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createBooking } from '@/lib/booking-actions';

type Value = CalendarProps['value'];

type TimeSlot = {
    id: string;
    sessionTypeId: string;
    startTime: any; // Firestore Timestamp
    endTime: any; // Firestore Timestamp
    bookedParticipantsCount: number;
};

export default function AgendaPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary['agenda'] | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [activeDate, setActiveDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();

  const timeSlotsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'timeSlots')) as Query<TimeSlot>;
  }, [firestore]);

  const sessionTypesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sessionTypes') as Query<SessionType>;
  }, [firestore]);

  const { data: timeSlots, isLoading: isLoadingTimeSlots } = useCollection<TimeSlot>(timeSlotsQuery);
  const { data: sessionTypes, isLoading: isLoadingSessionTypes } = useCollection<SessionType>(sessionTypesQuery);

  const dayData = useMemo(() => {
    if (!timeSlots || !sessionTypes) return {};

    const data: { [key: string]: { status: 'available' | 'full', slots: TimeSlot[] } } = {};
    const sessionTypeMap = new Map(sessionTypes.map(st => [st.id, st]));
    
    const slotsByDate = timeSlots.reduce((acc, slot) => {
        const dateKey = format(slot.startTime.toDate(), 'yyyy-MM-dd');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(slot);
        return acc;
    }, {} as { [key: string]: TimeSlot[] });

    for (const dateKey in slotsByDate) {
        const slotsOnDate = slotsByDate[dateKey];
        let isDayAvailable = false;
        for (const slot of slotsOnDate) {
            const sessionType = sessionTypeMap.get(slot.sessionTypeId);
            if (sessionType && slot.bookedParticipantsCount < sessionType.maxParticipants) {
                isDayAvailable = true;
                break;
            }
        }
        data[dateKey] = {
            status: isDayAvailable ? 'available' : 'full',
            slots: slotsOnDate.sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis()),
        };
    }
    return data;
  }, [timeSlots, sessionTypes]);

  useEffect(() => {
    getDictionary(lang).then(d => setDict(d.agenda));
  }, [lang]);

  useEffect(() => {
    const today = new Date();
    setDate(today);
    setActiveDate(today);
  }, []);

  const DayContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayInfo = dayData[dateKey];
        if (dayInfo) {
            return (
                <div className="flex justify-center items-center">
                    <div
                        className={cn('h-1.5 w-1.5 rounded-full mt-1.5', {
                            'bg-green-500': dayInfo.status === 'available',
                            'bg-red-500': dayInfo.status === 'full',
                        })}
                    />
                </div>
            );
        }
    }
    return <div className="h-[7px]" />;
  };

  const handleDateSelect = (selectedDate: Value) => {
    if (selectedDate instanceof Date) {
        setDate(selectedDate);
        setActiveDate(selectedDate);
    } else if (Array.isArray(selectedDate) && selectedDate[0] instanceof Date) {
        setDate(selectedDate[0]);
        setActiveDate(selectedDate[0]);
    } else {
        setDate(undefined);
    }
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot | null) => {
    setSelectedSlot(slot);
  };
  
  const handleBooking = async () => {
    if (!selectedSlot || !firestore) return;
    if (!user) {
        router.push(`/${lang}/login`);
        return;
    }

    setIsBooking(true);
    const result = await createBooking(firestore, user.uid, selectedSlot.id, selectedSlot.sessionTypeId);
    setIsBooking(false);

    if (result.success) {
        toast({
            title: dict?.bookingSuccessTitle,
            description: dict?.bookingSuccessDescription,
        });
        setSelectedSlot(null);
    } else {
        toast({
            variant: 'destructive',
            title: dict?.bookingErrorTitle,
            description: result.error === "This time slot is now full." ? dict?.bookingErrorFull : result.error || dict?.bookingErrorGeneric,
        });
    }
  };

  const selectedDateString = date ? format(date, 'yyyy-MM-dd') : '';
  const slotsForSelectedDate = date && dayData[selectedDateString] ? dayData[selectedDateString].slots : [];
  const selectedSessionType = selectedSlot ? sessionTypes?.find(st => st.id === selectedSlot.sessionTypeId) : null;
  
  const localesDateFns: { [key: string]: any } = { en: enUS, fr, es };
  const dateFnsLocale = localesDateFns[lang];

  if (isLoadingTimeSlots || isLoadingSessionTypes || !dict || !date || !activeDate) {
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
                    <CardContent className="p-0">
                         <Calendar
                            onChange={handleDateSelect}
                            value={date}
                            locale={lang}
                            tileDisabled={({date}) => date < new Date(new Date().setHours(0,0,0,0))}
                            tileContent={({ date, view }) => <DayContent date={date} view={view} />}
                            activeStartDate={activeDate}
                            onActiveStartDateChange={({ activeStartDate }) => activeStartDate && setActiveDate(activeStartDate)}
                            view="month"
                            prevLabel={<ChevronLeft className="h-5 w-5" aria-label={dict?.previousMonth || 'Previous month'} />}
                            nextLabel={<ChevronRight className="h-5 w-5" aria-label={dict?.nextMonth || 'Next month'} />}
                            prev2Label={null}
                            next2Label={null}
                            navigationLabel={({ date: navDate }) => (
                                <span className="font-headline text-lg capitalize">
                                    {format(navDate, 'MMMM yyyy', { locale: dateFnsLocale })}
                                </span>
                            )}
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
                         {date && <p className="text-sm font-medium text-muted-foreground pt-2">{format(date, 'd MMMM yyyy', { locale: dateFnsLocale })}</p>}
                    </CardHeader>
                    <CardContent className="min-h-[300px]">
                        {!date ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground text-center">{dict?.selectDate || 'Please select a date from the calendar.'}</p>
                            </div>
                        ) : slotsForSelectedDate.length > 0 ? (
                            <div className="space-y-4" onMouseLeave={() => handleSlotSelect(null)}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {slotsForSelectedDate.map(slot => {
                                        const sessionType = sessionTypes?.find(st => st.id === slot.sessionTypeId);
                                        const isFull = sessionType ? slot.bookedParticipantsCount >= sessionType.maxParticipants : true;
                                        return (
                                            <Button
                                                key={slot.id}
                                                variant={selectedSlot?.id === slot.id ? 'default' : 'outline'}
                                                onMouseEnter={() => handleSlotSelect(slot)}
                                                onClick={() => setSelectedSlot(slot)}
                                                disabled={isFull}
                                            >
                                                {format(slot.startTime.toDate(), 'HH:mm')}
                                            </Button>
                                        )
                                    })}
                                </div>
                                {selectedSlot && selectedSessionType && (
                                    <div className="mt-6 border-t pt-4 space-y-4">
                                        <h3 className="font-headline text-lg flex items-center gap-2"><Info className="h-5 w-5 text-accent"/>{dict.sessionDetails}</h3>
                                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                            <h4 className="font-semibold">{selectedSessionType.name?.[lang] || selectedSessionType.name?.en}</h4>
                                            <p className="text-sm text-muted-foreground">{selectedSessionType.description?.[lang] || selectedSessionType.description?.en}</p>
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <User className="h-4 w-4" />
                                                    <span>
                                                        {selectedSlot.bookedParticipantsCount} / {selectedSessionType.maxParticipants}
                                                    </span>
                                                </div>
                                                <span className="font-semibold">{new Intl.NumberFormat(lang, { style: 'currency', currency: selectedSessionType.currency }).format(selectedSessionType.price / 100)}</span>
                                            </div>
                                        </div>
                                        <Button onClick={handleBooking} className="w-full" disabled={isBooking}>
                                            {isBooking ? <Loader2 className="animate-spin" /> : (user ? dict.bookThisSlot : dict.loginToBook)}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground text-center">{dict?.noSlots || 'No slots available for this date.'}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
