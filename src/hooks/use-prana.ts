'use client'

import { useFirestore } from "@/firebase";
import { 
  doc, 
  updateDoc, 
  increment, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { calculatePranaReward } from "@/lib/utils";

export function usePrana() {
  const firestore = useFirestore();

  /**
   * Cette fonction s'occupe de TOUT après un achat :
   * 1. Elle calcule le Prana gagné (1€ = 1.67 Prana)
   * 2. Elle l'ajoute au portefeuille de l'acheteur
   * 3. Elle vérifie si c'est son premier achat pour débloquer le bonus parrainage
   */
  const processPurchaseRewards = async (userId: string, amountPaid: number) => {
    const userRef = doc(firestore, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error("Utilisateur non trouvé dans la base");
      return;
    }

    const userData = userSnap.data();
    
    // 1. Calcul du gain selon le prix payé
    const pranaGagne = calculatePranaReward(amountPaid);

    // 2. Mise à jour du portefeuille "liquide" de l'utilisateur
    await updateDoc(userRef, {
      prana_wallet: increment(pranaGagne)
    });

    // 3. Gestion du parrainage (uniquement si c'est le TOUT PREMIER achat)
    if (userData.hasFirstPurchase === false) {
      
      // Si l'utilisateur a été parrainé (il y a un code stocké dans son profil)
      if (userData.referredByCode) {
        const usersRef = collection(firestore, "users");
        const q = query(usersRef, where("referralCode", "==", userData.referredByCode));
        const querySnapshot = await getDocs(q);

        // Si on trouve le parrain qui possède ce code
        if (!querySnapshot.empty) {
          const parrainDoc = querySnapshot.docs[0];
          const parrainRef = doc(firestore, "users", parrainDoc.id);

          // BONUS DE BIENVENUE : On offre 100 Prana à chacun (valeur ~4€)
          // Tu peux ajuster ce montant ici si tu veux être plus généreux
          const bonusAmount = 100; 

          await updateDoc(parrainRef, { prana_wallet: increment(bonusAmount) });
          await updateDoc(userRef, { prana_wallet: increment(bonusAmount) });
          
          console.log("Système : Bonus parrainage distribué au parrain et au filleul !");
        }
      }

      // Quoi qu'il arrive, on marque que le premier achat est fait.
      // Cela évite de redonner le bonus si la personne achète une 2ème fois.
      await updateDoc(userRef, { hasFirstPurchase: true });
    }

    return pranaGagne; // On renvoie le montant pour pouvoir l'afficher si besoin
  };

  return { processPurchaseRewards };
}