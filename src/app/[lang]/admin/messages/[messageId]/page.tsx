'use client';

import { useState, useEffect, use } from 'react';
import { useFirestore, useStorage } from '@/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Dictionary, getDictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Paperclip, Gift } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import CouponGeneratorDialog from '@/components/admin/CouponGeneratorDialog';

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
}

interface Product {
  id: string;
  name: string;
  type: 'soin' | 'formation';
}

export default function MessageConversationPage({ params }: { params: Promise<{ messageId: string, lang: Locale }> }) {
  // 1. CORRECTION ERREUR CONSOLE : On utilise use()
  const { messageId, lang } = use(params);

  const router = useRouter();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  
  const [originalMessage, setOriginalMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [response, setResponse] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);

  useEffect(() => {
    getDictionary(lang).then(d => setDictionary(d));
  }, [lang]);

  useEffect(() => {
    if (!firestore) return;
    const msgRef = doc(firestore, 'contact_messages', messageId);
    
    const fetchMessage = async () => {
      const docSnap = await getDoc(msgRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const messageData: Message = {
          id: docSnap.id,
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          createdAt: data.createdAt,
          userId: data.userId,
          status: data.status,
          read: data.read
        };
        setOriginalMessage(messageData);

        if (messageData.status === 'new') {
            await updateDoc(msgRef, { status: 'read', read: true });
        }
      } else {
        console.error("Message non trouvé");
      }
      setLoading(false);
    };
    fetchMessage();
  }, [firestore, messageId]);

  useEffect(() => {
    if (!firestore) return;
    const repliesCol = collection(firestore, 'contact_messages', messageId, 'replies');
    const q = query(repliesCol, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedReplies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reply));
        setReplies(fetchedReplies);
    });

    return () => unsubscribe();
  }, [firestore, messageId]);

  const handleSendResponse = async () => {
    if (!response.trim() || !firestore) return;
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
            author: 'admin',
            content: response,
            createdAt: serverTimestamp(),
        };
        
        if (attachmentUrl) {
            replyData.attachmentUrl = attachmentUrl;
            replyData.attachmentName = attachmentName;
        }

        await addDoc(repliesCol, replyData);

        const msgRef = doc(firestore, 'contact_messages', messageId);
        await updateDoc(msgRef, { status: 'replied' });

        setResponse('');
        setAttachment(null);
        toast({ title: (dictionary as any).messages.response_sent_success });

    } catch (error) {
        console.error("Erreur lors de l'envoi de la réponse: ", error);
        toast({ variant: 'destructive', title: (dictionary as any).error.generic });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleGenerateCoupon = async (discount: number, product: Product) => {
      if (!firestore || !originalMessage?.userId) {
          toast({ variant: 'destructive', title: 'Erreur', description: 'Informations utilisateur manquantes pour créer un coupon.' });
          return;
      }

      try {
          const couponCode = `CORPSAMES-${product.type.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          
          await addDoc(collection(firestore, 'coupons'), {
              code: couponCode,
              discountPercentage: discount,
              productId: product.id,
              productType: product.type,
              productName: product.name,
              userId: originalMessage.userId,
              createdAt: serverTimestamp(),
              used: false
          });

          const couponText = (dictionary as any).messages.coupons.response_text
              .replace('{discount}', discount.toString())
              .replace('{productName}', product.name)
              .replace('{couponCode}', couponCode);

          setResponse(prev => prev ? `${prev}\n\n${couponText}` : couponText);
          toast({ title: (dictionary as any).messages.coupons.success_title, description: (dictionary as any).messages.coupons.success_description });

      } catch (error) {
          console.error("Erreur lors de la génération du coupon:", error);
          toast({ variant: 'destructive', title: (dictionary as any).messages.coupons.error_title, description: (dictionary as any).messages.coupons.error_description });
      }
  }

  if (loading || !dictionary) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-accent" /></div>;
  }
  
  const messagesDict = (dictionary as any).messages;

  if (!originalMessage) {
    return <div>Message non trouvé.</div>;
  }

  return (
    <>
      <CouponGeneratorDialog 
        open={isCouponDialogOpen}
        onOpenChange={setIsCouponDialogOpen}
        onGenerate={handleGenerateCoupon}
        dictionary={dictionary}
      />
      <div className="container mx-auto p-4 md:p-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {messagesDict.back_to_inbox}
        </Button>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{messagesDict.conversation_with.replace('{name}', originalMessage.name)}</CardTitle>
              <CardDescription>{originalMessage.subject}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                      {messagesDict.your_message} - {originalMessage.createdAt ? originalMessage.createdAt.toDate().toLocaleString(lang) : ''}
                  </p>
                  <p className="whitespace-pre-wrap">{originalMessage.message}</p>
              </div>

              {replies.map(reply => (
                <div key={reply.id} className={`flex flex-col gap-2 rounded-md p-4 ${reply.author === 'admin' ? 'bg-primary/10' : 'bg-muted/50'}`}>
                  <p className="text-sm text-muted-foreground">
                      {reply.author === 'admin' ? messagesDict.admin_response : messagesDict.your_message} - {reply.createdAt?.toDate().toLocaleString(lang)}
                  </p>
                  <p className="whitespace-pre-wrap">{reply.content}</p>
                  
                  {/* 2. CORRECTION BOUTON : On utilise un vrai lien <a> stylisé comme un bouton */}
                  {reply.attachmentUrl && (
                      <div className="mt-2">
                        <a 
                            href={reply.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                        >
                            <Paperclip className="mr-2 h-4 w-4" /> {reply.attachmentName || "Pièce jointe"}
                        </a>
                      </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>{messagesDict.respond_title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <Textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder={messagesDict.response_placeholder}
                      className="min-h-[150px]"
                      disabled={isSubmitting}
                  />
                  <div className="flex flex-col sm:flex-row gap-4">
                      <Button variant="outline" asChild>
                          <label htmlFor="attachment-upload" className="cursor-pointer">
                              <Paperclip className="mr-2 h-4 w-4" />
                              {attachment ? attachment.name : "Joindre un fichier"}
                              <input id="attachment-upload" type="file" className="sr-only" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
                          </label>
                      </Button>
                      <Button variant="secondary" onClick={() => setIsCouponDialogOpen(true)} disabled={!originalMessage.userId}>
                          <Gift className="mr-2 h-4 w-4" />
                          {messagesDict.coupons.create_coupon_button}
                      </Button>
                  </div>
                  <div className="flex justify-end">
                      <Button onClick={handleSendResponse} disabled={isSubmitting || !response.trim()}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                          {messagesDict.send_response}
                      </Button>
                  </div>
              </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}