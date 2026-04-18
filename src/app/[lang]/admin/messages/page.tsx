'use client';

import { useState, useEffect, use } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { Dictionary, getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Inbox } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Définition du type pour un message de contact
interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  createdAt: Timestamp;
  status: 'new' | 'read' | 'replied';
  read: boolean;
}

export default function AdminMessagesPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const router = useRouter();
  const firestore = useFirestore();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);

  useEffect(() => {
    getDictionary(lang).then(d => setDictionary(d));
  }, [lang]);

  useEffect(() => {
    if (!firestore) return;

    const messagesCol = collection(firestore, 'contact_messages');
    const q = query(messagesCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ContactMessage));
      setMessages(fetchedMessages);
      setLoading(false);
    }, (error) => {
      console.error("Erreur lors de la récupération des messages: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  const handleRowClick = (messageId: string) => {
    // Bientôt, ceci naviguera vers la vue détaillée de la conversation
    router.push(`/${lang}/admin/messages/${messageId}`);
  };

  if (loading || !dictionary) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const messagesDict = (dictionary as any).messages;

  const getStatusBadge = (status: string, isRead: boolean) => {
    const currentStatus = status || (isRead ? 'read' : 'new');
    switch (currentStatus) {
      case 'new':
        return <Badge variant="destructive">{messagesDict.status_new}</Badge>;
      case 'read':
        return <Badge variant="secondary">{messagesDict.status_read}</Badge>;
      case 'replied':
        return <Badge className="bg-green-600">{messagesDict.status_replied}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>{messagesDict.admin_title}</CardTitle>
          <CardDescription>{messagesDict.admin_subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
                <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">{messagesDict.no_messages_title}</h3>
                <p className="text-muted-foreground">{messagesDict.no_messages_description_admin}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">{messagesDict.status}</TableHead>
                  <TableHead>{messagesDict.from}</TableHead>
                  <TableHead>{messagesDict.subject}</TableHead>
                  <TableHead className="text-right">{messagesDict.date}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => (
                  <TableRow key={msg.id} onClick={() => handleRowClick(msg.id)} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>{getStatusBadge(msg.status, msg.read)}</TableCell>
                    <TableCell className="font-medium">{msg.name}</TableCell>
                    <TableCell>{msg.subject}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {msg.createdAt?.toDate().toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
