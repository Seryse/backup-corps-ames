'use client';

import { use, useState } from 'react';
import { useUser, useFirestore } from '@/firebase'; // On importe le hook Firestore
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // SDK Client
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = use(params);
  const { user } = useUser();
  const firestore = useFirestore(); // Accès à la base de données
  const router = useRouter();
  const { toast } = useToast();

  // On pré-remplit si l'utilisateur est connecté, sinon vide
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firestore) return; // Sécurité si Firestore n'est pas prêt

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
        toast({ variant: "destructive", title: "Champs requis", description: "Veuillez remplir tous les champs." });
        return;
    }

    setIsSubmitting(true);
    
    try {
        // Envoi direct à Firestore dans la collection 'contact_messages'
        await addDoc(collection(firestore, 'contact_messages'), {
            name,
            email,
            subject,
            message,
            userId: user?.uid || null, // On garde l'ID si connecté, sinon null
            createdAt: serverTimestamp(),
            status: 'new', // Pour ton dashboard admin plus tard
            read: false
        });

        toast({ title: "Message envoyé !", description: "Merci. Nous vous répondrons sous peu." });
        
        // Reset du formulaire
        setSubject('');
        setMessage('');
        // On ne reset pas nom/email pour le confort utilisateur
        
        // Optionnel : Redirection ou rester sur la page
        // router.push(`/${lang}`); 

    } catch (error: any) {
        console.error("Erreur envoi contact:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'envoyer le message. Réessayez." });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FDFBF8] min-h-screen py-12 md:py-24">
      <div className="container mx-auto px-4">
         <div className="max-w-2xl mx-auto">
          <Card className="bg-white border-none shadow-lg overflow-hidden">
            <CardHeader className="bg-amber-50/50 border-b border-amber-100/50 pt-8 pb-8">
              <CardTitle className="text-3xl font-light text-gray-800 text-center">Nous Contacter</CardTitle>
              <CardDescription className="text-center text-gray-500 mt-2">Une question ? Une remarque ? Nous sommes à votre écoute.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 ml-1">Votre Nom</label>
                            <Input 
                                placeholder="Ex: Jane Doe"
                                className="text-base bg-gray-50 border-gray-200 focus:border-amber-400 focus:ring-amber-400/20"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 ml-1">Votre Email</label>
                            <Input 
                                type="email"
                                placeholder="Ex: jane.doe@email.com"
                                className="text-base bg-gray-50 border-gray-200 focus:border-amber-400 focus:ring-amber-400/20"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 ml-1">Sujet</label>
                        <Input 
                            placeholder="Ex: Question sur une formation"
                            className="text-base bg-gray-50 border-gray-200 focus:border-amber-400 focus:ring-amber-400/20"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="space-y-2">
                         <label className="text-sm font-medium text-gray-700 ml-1">Votre message</label>
                        <Textarea 
                            placeholder="Écrivez votre message ici..."
                            className="min-h-[150px] bg-gray-50 border-gray-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[150px]">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} 
                            Envoyer
                        </Button>
                    </div>
                </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}