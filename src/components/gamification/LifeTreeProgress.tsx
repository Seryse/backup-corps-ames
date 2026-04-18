'use client'

import { motion, useSpring } from 'framer-motion';
import { useMemo } from 'react';

interface LifeTreeProgressProps {
  seeds: number;
  totalAccumulated: number;
}

// --- Configuration de l'arbre ---
const MAX_SEEDS = 1000;

// --- Définitions des parties de l'arbre (à remplacer par vos propres SVG) ---
// Ces SVGs sont des exemples basiques. Vous pouvez les exporter depuis Figma ou Illustrator.
const TreeParts = {
  // Racines visibles de 0 à 1000 graines
  roots: (
    <path
      d="M50 85 Q40 95 30 95 T10 85 M50 85 Q60 95 70 95 T90 85"
      stroke="#8B4513" // Marron terreux
      strokeWidth="2"
      fill="none"
    />
  ),
  // Tronc visible à partir de 250 graines accumulées
  trunk: (
    <path
      d="M50 85 V 40"
      stroke="#A0522D" // Marron plus chaud
      strokeWidth="4"
      fill="none"
    />
  ),
  // Feuillage visible à partir de 500 graines accumulées
  foliage: (
    <path
      d="M50 40 C 20 40, 20 10, 50 10 C 80 10, 80 40, 50 40 Z"
      stroke="#228B22" // Vert
      strokeWidth="2"
      fill="none"
    />
  ),
};

export function LifeTreeProgress({ seeds, totalAccumulated }: LifeTreeProgressProps) {
  const normalizedSeeds = Math.min(seeds, MAX_SEEDS);
  const progress = normalizedSeeds / MAX_SEEDS;

  // Animation fluide du remplissage
  const animatedProgress = useSpring(progress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Détermine quelles parties de l'arbre afficher en fonction du total accumulé
  const visibleParts = useMemo(() => {
    const parts = [TreeParts.roots];
    if (totalAccumulated >= 250) parts.push(TreeParts.trunk);
    if (totalAccumulated >= 500) parts.push(TreeParts.foliage);
    return parts;
  }, [totalAccumulated]);

  const isGolden = totalAccumulated >= 1000;

  return (
    <div className="relative w-full max-w-xs mx-auto text-center">
      <h3 className="font-bold text-lg mb-2">Arbre de Vie</h3>
      <svg viewBox="0 0 100 100" className="w-full h-auto">
        {/* ID unique pour le masque et le dégradé */}
        <defs>
          <mask id="treeMask">
            {/* Le masque est l'ensemble des parties visibles de l'arbre, en blanc */}
            <g stroke="white" strokeWidth="4" fill="white">
                {TreeParts.roots}
                {TreeParts.trunk}
                {TreeParts.foliage}
            </g>
          </mask>
          <linearGradient id="goldenGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFF7E1" />
          </linearGradient>
        </defs>

        {/* Étape 1: Dessin de l'arbre de base (les contours) */}
        <g opacity={isGolden ? 0.5 : 1}>
            {visibleParts.map((part, index) => <g key={index}>{part}</g>)}
        </g>

        {/* Étape 2: Remplissage énergétique doré qui monte */}
        {/* On applique le masque à un rectangle qui contient notre dégradé doré */}
        <g mask="url(#treeMask)">
            <motion.rect 
                x="0" 
                y="0" 
                width="100" 
                height="100" 
                fill="url(#goldenGradient)" 
                initial={{ transform: 'translateY(100%)' }}
                style={{ transform: `translateY(${(1 - animatedProgress.get()) * 100}%)` }}
            />
        </g>

        {/* Étape 3 (Optionnel): Effet de scintillement si l'arbre est doré */}
        {isGolden && (
            <motion.g
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <path
                    d="M50 10 L 52 8 L 54 10 L 52 12 Z"
                    fill="white"
                    filter="url(#glow)"
                />
            </motion.g>
        )}

      </svg>
      <div className="mt-4">
        <p className="text-xl font-bold text-yellow-600">{normalizedSeeds} / {MAX_SEEDS} Graines</p>
      </div>
    </div>
  );
}
