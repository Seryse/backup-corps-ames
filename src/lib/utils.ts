import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** * Utilitaire pour fusionner les classes Tailwind (Code d'origine)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** * Machine à fabriquer les codes secrets (Parrainage)
 * Elle prend le début de l'identifiant et ajoute des chiffres au hasard.
 */
export const generateReferralCode = (uid: string) => {
  if (!uid) return "SOUL-GUEST" + Math.floor(Math.random() * 1000);

  // On prend les 4 premières lettres de l'identifiant secret
  const shortId = uid.substring(0, 4).toUpperCase();
  
  // On invente un chiffre entre 1000 et 9999
  const random = Math.floor(1000 + Math.random() * 9000);
  
  // On assemble le tout pour la carte de fidélité
  return `SOUL-${shortId}${random}`;
};

/** * Conversion Euro -> Prana
 * Basé sur ton calcul : 600€ dépensés doivent remplir l'Arbre (1000 Prana).
 * Le taux est donc de 1.67 Prana par Euro.
 */
export const calculatePranaReward = (price: number) => {
  const rate = 1.67;
  return Math.floor(price * rate);
};