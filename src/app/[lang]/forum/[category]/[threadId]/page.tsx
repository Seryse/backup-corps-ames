'use client';

import { use, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // <--- IL EST DE RETOUR !
import { Loader2, Send, CornerUpLeft, User } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ThreadPage({ params }: { params: Promise<{ lang: string, category: string, threadId: string }> }) {
  const { lang, category, threadId } = use(params);
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [newMessage, setNewMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  // États pour le thread unique
  const [thread, setThread] = useState<any>(null);
  const [isThreadLoading, setIsThreadLoading] = useState(true);

  // Récupération du Thread
  useEffect(() => {
    if (!firestore || !threadId) return;

    const unsubscribe = onSnapshot(doc(firestore, 'forum_threads', threadId), (docSnapshot) => {
        if (docSnapshot.exists()) {
            setThread({ id: docSnapshot.id, ...docSnapshot.data() });
        } else {
            setThread(null);
        }
        setIsThreadLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, threadId]);


  // Récupération des messages
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'forum_threads', threadId, 'messages'),
        orderBy('createdAt', 'asc')
    );
  }, [firestore, user, threadId]);

  const { data: messages } = useCollection(messagesQuery);


  // Action : Envoyer une réponse
  const handlePostReply = async () => {
    if (!newMessage.trim() || !user || !firestore) return;
    setIsPosting(true);
    try {
      await addDoc(collection(firestore, 'forum_threads', threadId, 'messages'), {
          content: newMessage,
          authorId: user.uid,
          authorName: user.displayName || 'Membre',
          authorPhotoURL: user.photoURL,
          createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Erreur envoi:", error);
    } finally {
      setIsPosting(false);
    }
  };


  if (isUserLoading || isThreadLoading) {
    return <div className="h-screen flex items-center justify-center bg-[#FDFBF8]"><Loader2 className="animate-spin text-amber-600"/></div>;
  }

  if (!user) { router.push(`/${lang}/login`); return null; }
  if (!thread) return <div className="text-center py-20">Discussion introuvable.</div>;

  return (
    <div className="bg-[#FDFBF8] min-h-screen">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            {/* Header Navigation */}
            <div className="mb-8">
                <Button asChild variant="ghost" className="pl-0 hover:bg-transparent hover:text-amber-600">
                    <Link href={`/${lang}/forum/${category}`}>
                        <CornerUpLeft className="mr-2 h-4 w-4" /> Retour aux discussions
                    </Link>
                </Button>
            </div>

            {/* Titre du Thread */}
            <div className="mb-10 border-b border-amber-100 pb-6">
                <h1 className="text-3xl font-light text-gray-800 tracking-wide mb-2">{thread.title}</h1>
                 <p className="text-sm text-gray-500">
                    Lancé par <span className="font-medium text-amber-700">{thread.authorName}</span>
                </p>
            </div>

            {/* Liste des Messages */}
            <div className="space-y-6 mb-12">
                {messages && messages.map((msg: any) => {
                    const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
                    return (
                        <div key={msg.id} className="flex gap-4 group">
                             {/* LE VRAI COMPOSANT AVATAR EST ICI 👇 */}
                            <Avatar className="h-10 w-10 border border-amber-100">
                                <AvatarImage src={msg.authorPhotoURL} alt={msg.authorName} />
                                <AvatarFallback className="bg-amber-100 text-amber-700">
                                    {msg.authorName ? msg.authorName[0].toUpperCase() : <User className="h-4 w-4"/>}
                                </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                                <div className="bg-white rounded-r-2xl rounded-bl-2xl shadow-sm p-5 border border-gray-50">
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className="font-medium text-gray-800 text-sm">{msg.authorName}</span>
                                        <span className="text-xs text-gray-400">{formatDistanceToNow(date, { addSuffix: true, locale: fr })}</span>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">{msg.content}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Zone de Réponse */}
            <div className="sticky bottom-6 z-10">
                <Card className="shadow-xl border-amber-100/50 backdrop-blur-sm bg-white/90">
                    <CardContent className="p-4 flex gap-4">
                        {/* Avatar de l'utilisateur courant */}
                        <Avatar className="h-8 w-8 hidden sm:flex">
                             <AvatarImage src={user.photoURL || ''} />
                             <AvatarFallback className="bg-gray-200 text-gray-500">
                                {user.displayName ? user.displayName[0].toUpperCase() : 'M'}
                             </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 flex gap-2">
                            <Textarea
                                placeholder="Participer à la discussion..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="min-h-[50px] max-h-[150px] resize-none border-gray-200 focus:border-amber-400 focus:ring-0 bg-transparent"
                            />
                            <Button 
                                onClick={handlePostReply} 
                                disabled={isPosting || !newMessage.trim()}
                                size="icon"
                                className="h-auto w-12 bg-amber-600 hover:bg-amber-700 shrink-0 rounded-lg"
                            >
                                {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
