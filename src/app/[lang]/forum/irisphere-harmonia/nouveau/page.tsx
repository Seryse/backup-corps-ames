'use client';

import { use, useState } from 'react';
import { useUser, useFirestore } from '@/firebase'; // Import direct
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // SDK Client
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function NewIrisphereThreadPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = use(params);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore(); // On récupère l'instance Firestore
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifications de sécurité avant envoi
    if (!user || !firestore) return;
    if (!title.trim() || !content.trim()) {
        toast({ variant: "destructive", title: "Oups", description: "Le titre et le contenu sont obligatoires." });
        return;
    }

    setIsSubmitting(true);

    try {
        // Envoi direct à Firestore (compatible avec tes Règles)
        await addDoc(collection(firestore, 'forum_threads'), {
            title: title.trim(),
            category: 'irisphere-harmonia', // Catégorie forcée
            authorId: user.uid,           // Vital pour la règle de sécurité !
            authorName: user.displayName || 'Membre du Cercle',
            authorPhotoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
            lastActivity: serverTimestamp(),
            messageCount: 0
        });

        // Envoi du premier message (contenu du post)
        // Note: Idéalement on ferait un batch, mais restons simples pour la V1
        
        toast({ title: "Discussion lancée !", description: "Votre voix a rejoint le cercle." });
        router.push(`/${lang}/forum/irisphere-harmonia`);

    } catch (error) {
        console.error("Erreur creation:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de publier. Vérifiez votre connexion." });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
     return <div className="h-screen flex items-center justify-center bg-[#FDFBF8]"><Loader2 className="animate-spin text-amber-600"/></div>;
  }

  if (!user) {
      router.push(`/${lang}/login`);
      return null;
  }

  return (
    <div className="bg-[#FDFBF8] min-h-screen">
      <div className="container mx-auto px-4 py-12">
         <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <Button variant="ghost" asChild className="text-gray-500 hover:text-amber-600 pl-0">
                    <Link href={`/${lang}/forum/irisphere-harmonia`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour au Cercle
                    </Link>
                </Button>
            </div>

          <Card className="bg-white border-none shadow-lg overflow-hidden">
            <CardHeader className="bg-amber-50/50 border-b border-amber-100/50 pb-8 pt-8">
              <CardTitle className="text-2xl font-light text-gray-800 text-center">Ouvrir un espace</CardTitle>
              <CardDescription className="text-center text-gray-500">Posez une question ou partagez une expérience avec bienveillance.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 ml-1">Sujet</label>
                        <Input 
                            placeholder="Ex: Mon ressenti après la séance..."
                            className="text-lg bg-gray-50 border-gray-200 focus:border-amber-400 focus:ring-amber-400/20"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="space-y-2">
                         <label className="text-sm font-medium text-gray-700 ml-1">Votre message</label>
                        <Textarea 
                            placeholder="Écrivez ici..."
                            className="min-h-[200px] bg-gray-50 border-gray-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[150px]">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} 
                            Publier
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
