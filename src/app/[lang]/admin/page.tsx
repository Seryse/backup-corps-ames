import { getDictionary } from '@/lib/dictionaries';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { File, Music } from 'lucide-react';
import { Locale } from '@/i18n-config';
// import FormationManager from '@/components/admin/formation-manager';
import { Separator } from '@/components/ui/separator';
// import NewsManager from '@/components/admin/news-manager';
// import SessionTypeManager from '@/components/admin/session-type-manager';
// import FileLister from '@/components/admin/file-lister';

export default async function AdminPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang);
  const adminImage = PlaceHolderImages.find(p => p.id === 'admin-console');

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="relative rounded-lg overflow-hidden mb-8">
        {adminImage && (
            <Image
                src={adminImage.imageUrl}
                alt={adminImage.description}
                width={1200}
                height={400}
                className="w-full h-48 object-cover"
                data-ai-hint={adminImage.imageHint}
            />
        )}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <h1 className="text-4xl font-headline text-white drop-shadow-lg">{dict.admin.title}</h1>
        </div>
      </div>
      
      <div className="space-y-8">
        <p>Debugging: Admin page content placeholder. If you see this, the page shell is working.</p>
        {/*
        <div className="grid md:grid-cols-2 gap-8">
            <FileLister title={dict.admin.introFiles} path="/intros" icon={File} noFilesFoundText={dict.admin.noFiles} />
            <FileLister title={dict.admin.playlistFiles} path="/playlists" icon={Music} noFilesFoundText={dict.admin.noFiles} />
        </div>
        <Separator />
        <NewsManager dictionary={dict.admin} lang={lang} />
        <Separator />
        <FormationManager dictionary={dict.admin} lang={lang} />
        <Separator />
        <SessionTypeManager dictionary={dict.admin} lang={lang} />
        */}
      </div>
    </div>
  );
}
