'use client';

import { useState, useEffect } from 'react';
import { list, getDownloadURL, ref } from 'firebase/storage';
import { useStorage } from '@/firebase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface FileItem {
    name: string;
    url: string;
}

export default function FileLister({ title, path, icon: Icon, noFilesFoundText }: { title: string, path: string, icon: React.ElementType, noFilesFoundText: string }) {
    const storage = useStorage();
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!storage) {
            return;
        };

        const listFiles = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const folderRef = ref(storage, path);
                const res = await list(folderRef);
                const fileItems = await Promise.all(res.items.map(async (itemRef) => {
                    const url = await getDownloadURL(itemRef);
                    return { name: itemRef.name, url };
                }));
                setFiles(fileItems);
            } catch (err: any) {
                console.error("Error listing files:", err);
                setError(err.message || 'Failed to list files.');
            } finally {
                setIsLoading(false);
            }
        };

        listFiles();
    }, [storage, path]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            );
        }
        if (error) {
            return (
                 <div className="flex justify-center items-center h-full">
                    <p className="text-destructive text-sm text-center">{error}</p>
                </div>
            );
        }
        if (files.length > 0) {
            return (
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
            );
        }
        return (
            <div className="flex justify-center items-center h-full">
                <p className="text-muted-foreground text-sm">{noFilesFoundText}</p>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-2">
                <Icon className="h-6 w-6 text-accent" />
                <h2 className="font-headline text-xl">{title}</h2>
            </CardHeader>
            <CardContent className="min-h-[120px]">
               {renderContent()}
            </CardContent>
        </Card>
    );
}
