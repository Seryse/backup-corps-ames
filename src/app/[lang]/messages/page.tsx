'use client';

import { useState, useEffect, use } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Dictionary, getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Message {
  id: string;
  subject: string;
  createdAt: Timestamp;
  status: 'new' | 'read' | 'replied';
  read: boolean;
}

export default function UserMessagesPage({ params }: { params: Promise<{ lang: Locale }> }) {
  // ICI c'est la liste, on n'a besoin que de la langue
  const { lang } = use(params);

  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);

  useEffect(() => {
    getDictionary(lang).then(d => setDictionary(d));
  }, [lang]);

  useEffect(() => {
    if (isUserLoading || !user || !firestore) {
        if(!isUserLoading && !user){
            router.push(`/${lang}/login`);
        }
        return;
    }

    setLoading(true);
    // On cherche TOUS les messages de l'utilisateur
    const messagesQuery = query(
      collection(firestore, 'contact_messages'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(fetchedMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user, isUserLoading, lang, router]);

  if (loading || isUserLoading || !dictionary) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-accent" /></div>;
  }

  const messagesDict = (dictionary as any).messages;
  
  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
        new: messagesDict?.status_new || "Nouveau",
        read: messagesDict?.status_read || "Lu", 
        replied: messagesDict?.status_replied || "Répondu", 
    };
    return statusMap[status] || status;
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>{messagesDict?.user_title || "Mes Messages"}</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold">{messagesDict?.no_messages_title || "Aucun message"}</h3>
              <p className="text-muted-foreground mt-2">{messagesDict?.no_messages_description_user || "Vous n'avez pas encore envoyé de message."}</p>
              <Button asChild className="mt-4">
                <Link href={`/${lang}/contact`}>Contacter le support</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {messages.map(message => (
                <li key={message.id} className="p-4 hover:bg-muted/50 transition-colors">
                  {/* Le lien pointe vers le dossier [id] qu'on va remplir juste après */}
                  <Link href={`/${lang}/messages/${message.id}`} className="block">
                    <div className="flex justify-between items-center">
                        <div className="flex-1">
                            <p className="font-semibold truncate">{message.subject}</p>
                            <p className="text-sm text-muted-foreground">
                                {message.createdAt?.seconds 
                                  ? new Date(message.createdAt.seconds * 1000).toLocaleDateString(lang) 
                                  : '...'}
                            </p>
                        </div>
                        <div className="ml-4">
                             <span className={`px-2 py-1 text-xs font-semibold rounded-full ${message.status === 'replied' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {getStatusLabel(message.status)}
                            </span>
                        </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}