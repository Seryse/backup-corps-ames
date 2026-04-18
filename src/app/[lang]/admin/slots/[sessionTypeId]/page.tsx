import { getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import TimeSlotManager from '@/components/admin/time-slot-manager';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default async function ManageSlotsPage({ params: { lang, sessionTypeId } }: { params: { lang: Locale, sessionTypeId: string } }) {
    const dict = await getDictionary(lang);

    return (
        <div className="container mx-auto p-4 sm:p-8">
             <div className="flex items-center gap-4 mb-8">
                <Button variant="outline" size="icon" asChild>
                    <Link href={`/${lang}/admin/session-types`}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-4xl font-headline">{dict.admin.manageSlotsTitle}</h1>
            </div>
            <Separator className="mb-8" />
            <TimeSlotManager sessionTypeId={sessionTypeId} dictionary={dict.admin} lang={lang} />
        </div>
    );
}
