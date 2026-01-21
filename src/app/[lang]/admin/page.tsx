import { getDictionary } from '@/lib/dictionaries';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { list, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase/server';
import { ref } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { File, Music } from 'lucide-react';
import { Locale } from '@/i18n-config';
import FormationManager from '@/components/admin/formation-manager';
import { Separator } from '@/components/ui/separator';
import NewsManager from '@/components/admin/news-manager';
import SessionTypeManager from '@/components/admin/session-type-manager';

async function listFiles(path: string) {
  try {
    const folderRef = ref(storage, path);
    const res = await list(folderRef);
    return await Promise.all(res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return { name: itemRef.name, url };
    }));
  } catch (error) {
    console.error("Error listing files:", error);
    return [];
  }
}

async function FileList({ title, path, icon: Icon }: { title: string, path: string, icon: React.ElementType }) {
    const files = await listFiles(path);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-2">
                <Icon className="h-6 w-6 text-accent" />
                <h2 className="font-headline text-xl">{title}</h2>
            </CardHeader>
            <CardContent>
                {files.length > 0 ? (
                    <ul className="space-y-2">
                        {files.map(file => (
                            <li key={file.name} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                <span className="font-mono text-sm">{file.name}</span>
                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-foreground underline">
                                    Listen
                                </a>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground text-sm">No files found.</p>
                )}
            </CardContent>
        </Card>
    )
}

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
        <div className="grid md:grid-cols-2 gap-8">
            <FileList title={dict.admin.introFiles} path="/intros" icon={File} />
            <FileList title={dict.admin.playlistFiles} path="/playlists" icon={Music} />
        </div>
        <Separator />
        <NewsManager dictionary={dict.admin} lang={lang} />
        <Separator />
        <FormationManager dictionary={dict.admin} lang={lang} />
        <Separator />
        <SessionTypeManager dictionary={dict.admin} lang={lang} />
      </div>
    </div>
  );
}
