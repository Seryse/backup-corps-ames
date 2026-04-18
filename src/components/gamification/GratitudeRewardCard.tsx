'use client'

import { useState, useRef } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { Dictionary } from '@/lib/dictionaries';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Gift, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface GratitudeRewardCardProps {
  dictionary: Dictionary;
  gamificationData: {
    seeds: number;           
    totalAccumulated: number; // Correspond à tree_score
    rank: string;    // AJOUTE ÇA
    badges: any[];
    walletBalance?: number;    
  };
  onExchangeSuccess: () => void;
}

export default function GratitudeRewardCard({ dictionary, gamificationData, onExchangeSuccess }: GratitudeRewardCardProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isExchanging, setIsExchanging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const TREE_FULL_LIMIT = 1000;
  const REWARD_AMOUNT_EUR = 40;

  // Accès sécurisé au dictionnaire avec fallbacks
  const d = dictionary.gamification || {};
  const cardDict = dictionary.gratitude_wallet_reward || {
    title: 'Récolte de Gratitude',
    description: `Votre Arbre de Vie est pleinement épanoui !`,
    offer: `Transformez l'énergie de votre arbre en une récompense de ${REWARD_AMOUNT_EUR}€.`,
    cta: `Récolter les fruits (${REWARD_AMOUNT_EUR}€)`,
    success_title: 'Félicitations !',
    success_description: `Votre gratitude a porté ses fruits. ${REWARD_AMOUNT_EUR}€ ont été ajoutés à votre compte.`,
    progression_label: "Progression de l'Arbre",
    growing_label: "Arbre en croissance...",
    error_not_full: "L'arbre n'est pas encore totalement épanoui.",
    error_generic: "Une erreur est survenue lors de la récolte."
  };

  const handleConfetti = () => {
    if (canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, { resize: true, useWorker: true });
      myConfetti({ particleCount: 150, spread: 160, origin: { y: 0.6 } });
    }
  };

  const handleExchange = async () => {
    if (!user) return;
    setIsExchanging(true);
    setError(null);

    try {
      const userRef = doc(firestore, 'users', user.uid);

      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");

        const userData = userDoc.data();
        
        // VÉRIFICATION DES CHAMPS EXACTS
        const currentTreeScore = userData.tree_score || 0;
        const currentEurBalance = userData.walletBalance || 0;

        if (currentTreeScore < TREE_FULL_LIMIT) {
          throw new Error(cardDict.error_not_full);
        }

        // --- LA RÉINITIALISATION SE FAIT ICI ---
        transaction.update(userRef, {
          'tree_score': 0, // Reset l'arbre à zéro
          'walletBalance': currentEurBalance + REWARD_AMOUNT_EUR,
        });
      });

      setIsSuccess(true);
      handleConfetti();
      
      // Callback pour prévenir le parent (qui va rafraîchir les props)
      if (onExchangeSuccess) onExchangeSuccess();
      
      setTimeout(() => setIsSuccess(false), 8000);

    } catch (e: any) {
      setError(e.message || cardDict.error_generic);
    } finally {
      setIsExchanging(false);
    }
  };

  const canRedeem = gamificationData.totalAccumulated >= TREE_FULL_LIMIT;

  return (
    <Card className="relative overflow-hidden border-gold/30 bg-gold/5">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
      
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold">
          {isSuccess ? <Sparkles className="animate-pulse"/> : <Gift />}
          {isSuccess ? cardDict.success_title : cardDict.title}
        </CardTitle>
        <CardDescription className="text-gold/70">
            {isSuccess ? cardDict.success_description : cardDict.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="text-center">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </motion.div>
          )}

          {!isSuccess ? (
            <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="my-4 p-6 bg-white/5 rounded-lg border border-gold/10">
              {/* TEXTE MULTILINGUE CORRIGÉ */}
              <p className="text-sm text-muted-foreground mb-2">{cardDict.progression_label}</p>
              <p className="text-2xl font-bold text-gold">{gamificationData.totalAccumulated} / 1000</p>
              {!canRedeem && (
                 <p className="text-xs text-muted-foreground mt-2 italic opacity-60">
                   {cardDict.offer}
                 </p>
              )}
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="my-4 p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Wallet className="w-12 h-12 text-green-500 mx-auto mb-2"/>
                <p className="text-lg font-bold text-green-500">+{REWARD_AMOUNT_EUR}€</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!isSuccess && (
            <Button 
              onClick={handleExchange} 
              disabled={!canRedeem || isExchanging} 
              size="lg" 
              className={`w-full mt-2 transition-all ${canRedeem ? 'bg-gold hover:bg-gold/80 text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-white/40'}`}
            >
                {isExchanging ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  canRedeem ? cardDict.cta : cardDict.growing_label
                )}
            </Button>
        )}
      </CardContent>
    </Card>
  );
}