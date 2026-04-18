'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Gift, Video } from 'lucide-react';
// Imports Client-Side uniquement
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

interface TestimonialModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    userId: string;
}

export default function TestimonialModal({ isOpen, onClose, bookingId, userId }: TestimonialModalProps) {
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasClaimedReward, setHasClaimedReward] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();

    const handleSubmit = async () => {
        if (!feedback.trim()) {
            toast({ variant: 'destructive', title: 'Le message est vide.' });
            return;
        }
        
        if (!firestore) return;

        setIsSubmitting(true);
        try {
            // 1. Sauvegarde de l'avis
            await addDoc(collection(firestore, 'testimonials'), {
                bookingId,
                userId,
                feedbackText: feedback,
                createdAt: serverTimestamp(),
                status: 'pending',
                type: 'text_or_video_link'
            });

            // 2. RÉCOMPENSE : Ajout des 100 graines !
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, {
                'gamification.walletBalance': increment(100), 
                'gamification.totalAccumulated': increment(100)
            });

            setHasClaimedReward(true);
            toast({ title: 'Avis envoyé !', description: "+100 Graines ajoutées à votre compte." });

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'envoyer le message." });
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isOpen) {
            setFeedback('');
            setIsSubmitting(false);
            setHasClaimedReward(false);
            onClose();
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {hasClaimedReward ? (
                            <>🎉 Merci !</>
                        ) : (
                            <>
                                <Gift className="h-5 w-5 text-accent animate-bounce" /> 
                                Gagnez 100 Graines
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {hasClaimedReward 
                            ? "Votre avis a été enregistré et votre compte crédité."
                            : "Partagez votre expérience pour nous aider. Les témoignages vidéo (lien) sont très appréciés !"
                        }
                    </DialogDescription>
                </DialogHeader>
                
                {hasClaimedReward ? (
                    <div className="py-6 flex flex-col items-center justify-center text-center animate-in zoom-in-50 bg-accent/10 rounded-lg border border-accent/20">
                        <Gift className="h-16 w-16 text-accent mb-4" />
                        <h3 className="text-2xl font-bold text-accent">+100 Graines</h3>
                        <p className="text-muted-foreground mt-2">Ajoutées à votre porte-monnaie spirituel.</p>
                        <Button className="mt-6" onClick={handleClose}>Fermer</Button>
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground flex gap-2 items-start">
                            <Video className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>Astuce : Vous pouvez écrire un texte ou coller un lien vers une vidéo (YouTube, Loom, Drive...).</p>
                        </div>

                        <Textarea
                            placeholder="Comment s'est passée votre séance ? Qu'avez-vous ressenti ?"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={5}
                            className="resize-none"
                        />
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                            Envoyer et recevoir mes graines
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}