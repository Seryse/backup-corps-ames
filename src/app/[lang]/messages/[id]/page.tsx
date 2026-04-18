'use client';

import { useState, useEffect, use } from 'react';
import { useFirestore, useUser, useStorage } from '@/firebase';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Dictionary, getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Paperclip } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Timestamp;
  userId?: string;
  status: 'new' | 'read' | 'replied';
  read: boolean;
}

interface Reply {
  id: string;
  author: 'admin' | 'user';
  content: string;
  createdAt: Timestamp;
  attachmentUrl?: string;
  attachmentName?: string;
  read: boolean;
}

// CORRECTION : On s'attend à recevoir 'id' car ton dossier s'appelle [id]
export default function UserMessageConversationPage({ params }: { params: Promise<{ id: string, lang: Locale }> }) {
  
  // 1. On récupère 'id' (car le dossier est [id])
  const { id, lang } = use(params);
  
  // 2. On le renomme en 'messageId' pour que tout le reste du code fonctionne sans modif
  const messageId = id;

  const router = useRouter();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [originalMessage, setOriginalMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [response, setResponse] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    getDictionary(lang).then(d => setDictionary(d));
  }, [lang]);

  useEffect(() => {
    if (isUserLoading || !user || !firestore) return;

    const msgRef = doc(firestore, 'contact_messages', messageId);
    
    const checkAccessAndFetch = async () => {
      try {
        const docSnap = await getDoc(msgRef);
        if (docSnap.exists() && docSnap.data().userId === user.uid) {
          setHasAccess(true);
          const data = docSnap.data();
          setOriginalMessage({ ...data, id: docSnap.id } as Message);

          // Marquer les réponses de l'admin comme lues
          const repliesRef = collection(firestore, 'contact_messages', messageId, 'replies');
          const q = query(repliesRef, where('author', '==', 'admin'), where('read', '==', false));
          const querySnapshot = await getDocs(q);
          
          const updates = querySnapshot.docs.map(replyDoc => 
             updateDoc(doc(repliesRef, replyDoc.id), { read: true })
          );
          await Promise.all(updates);

        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error("Erreur chargement message:", error);
      }
      setLoading(false);
    };
    
    checkAccessAndFetch();
  }, [firestore, messageId, user, isUserLoading]);

  useEffect(() => {
    if (!firestore || !hasAccess) return;

    const repliesCol = collection(firestore, 'contact_messages', messageId, 'replies');
    const q = query(repliesCol, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedReplies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reply));
        setReplies(fetchedReplies);
    });

    return () => unsubscribe();
  }, [firestore, messageId, hasAccess]);

  const handleSendResponse = async () => {
    if (!response.trim() || !firestore || !user) return;
    setIsSubmitting(true);

    try {
        let attachmentUrl = '';
        let attachmentName = '';

        if (attachment && storage) {
            const storageRef = ref(storage, `contact_attachments/${messageId}/${attachment.name}`);
            const uploadResult = await uploadBytes(storageRef, attachment);
            attachmentUrl = await getDownloadURL(uploadResult.ref);
            attachmentName = attachment.name;
        }

        const repliesCol = collection(firestore, 'contact_messages', messageId, 'replies');
        
        const replyData: any = {
            author: 'user',
            content: response,
            createdAt: serverTimestamp(),
            read: false, 
        };

        if (attachmentUrl) {
            replyData.attachmentUrl = attachmentUrl;
            replyData.attachmentName = attachmentName;
        }

        await addDoc(repliesCol, replyData);

        const msgRef = doc(firestore, 'contact_messages', messageId);
        await updateDoc(msgRef, { status: 'new', read: false });

        setResponse('');
        setAttachment(null);
        toast({ title: (dictionary as any)?.messages?.response_sent_success || "Réponse envoyée" });

    } catch (error) {
        console.error("Erreur envoi réponse: ", error);
        toast({ variant: 'destructive', title: (dictionary as any)?.error?.generic || "Erreur" });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading || isUserLoading || !dictionary) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-accent" /></div>;
  }
  
  if (!user) {
    router.push(`/${lang}/login`);
    return null;
  }

  if (!hasAccess) {
    return (
        <div className="container mx-auto p-4 md:p-8 text-center">
            <h1 className="text-2xl font-bold">Accès non autorisé</h1>
            <p className="text-muted-foreground mt-2">Vous n'avez pas la permission de voir cette conversation.</p>
            <Button asChild className="mt-4"><Link href={`/${lang}/messages`}>Retour à mes messages</Link></Button>
        </div>
    );
  }

  const messagesDict = (dictionary as any).messages;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Button variant="ghost" onClick={() => router.push(`/${lang}/messages`)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {messagesDict?.back_to_inbox || "Retour"}
      </Button>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{originalMessage?.subject}</CardTitle>
            <CardDescription>
                Conversation initiée le {originalMessage?.createdAt ? new Date(originalMessage.createdAt.seconds * 1000).toLocaleString(lang) : '...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">{messagesDict?.your_message || "Votre message"}</p>
                <p className="whitespace-pre-wrap">{originalMessage?.message}</p>
            </div>

            {replies.map(reply => (
              <div key={reply.id} className={`flex flex-col gap-2 rounded-md p-4 ${reply.author === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted/50 mr-8'}`}>
                <p className="text-sm text-muted-foreground font-semibold">
                    {reply.author === 'admin' ? (messagesDict?.admin_response || "Réponse Admin") : (messagesDict?.your_message || "Vous")}
                </p>
                <p className="whitespace-pre-wrap">{reply.content}</p>
                {reply.attachmentUrl && (
                    <Button variant="outline" asChild className="mt-2 w-fit">
                        <a href={reply.attachmentUrl} target="_blank" rel="noopener noreferrer">
                            <Paperclip className="mr-2 h-4 w-4" /> {reply.attachmentName || "Pièce jointe"}
                        </a>
                    </Button>
                )}
                <p className="text-xs text-right opacity-50">
                    {reply.createdAt ? new Date(reply.createdAt.seconds * 1000).toLocaleString(lang) : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>{messagesDict?.respond_title || "Répondre"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder={messagesDict?.response_placeholder || "Votre réponse..."}
                    className="min-h-[150px]"
                    disabled={isSubmitting}
                />
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <Button variant="outline" asChild disabled={isSubmitting}>
                        <label htmlFor="attachment-upload" className="cursor-pointer">
                            <Paperclip className="mr-2 h-4 w-4" />
                            {attachment ? attachment.name : "Joindre un fichier"}
                            <input id="attachment-upload" type="file" className="sr-only" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
                        </label>
                    </Button>

                    <Button onClick={handleSendResponse} disabled={isSubmitting || !response.trim()}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                        {messagesDict?.send_response || "Envoyer"}
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}