'use server';

/**
 * @fileOverview Ce fichier gère la traduction en temps réel ET l'archivage pour le résumé.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// --- INITIALISATION FIREBASE ADMIN (Pour écrire dans la DB) ---
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

// --- SCHÉMAS ---

// On ajoute sessionId et speaker pour savoir QUI parle et DANS QUELLE séance
const RealTimeSubtitlesWithTranslationInputSchema = z.object({
  text: z.string().describe('The text to be translated.'),
  targetLanguage: z.string().describe('The target language for translation.'),
  sessionId: z.string().describe('The ID of the current session.'),
  speaker: z.string().describe('Who is speaking (Therapist or Patient).'),
});

export type RealTimeSubtitlesWithTranslationInput =
  z.infer<typeof RealTimeSubtitlesWithTranslationInputSchema>;

const RealTimeSubtitlesWithTranslationOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});

export type RealTimeSubtitlesWithTranslationOutput =
  z.infer<typeof RealTimeSubtitlesWithTranslationOutputSchema>;


// --- FONCTION 1 : TRADUCTION & SAUVEGARDE ---

const realTimeSubtitlesPrompt = ai.definePrompt({
  name: 'realTimeSubtitlesPrompt',
  input: {schema: RealTimeSubtitlesWithTranslationInputSchema},
  output: {schema: RealTimeSubtitlesWithTranslationOutputSchema},
  prompt: `Translate the following text into {{{targetLanguage}}}. Context: Therapy session. Keep it natural.\n\n"{{{text}}}"`,
});

const realTimeSubtitlesWithTranslationFlow = ai.defineFlow(
  {
    name: 'realTimeSubtitlesWithTranslationFlow',
    inputSchema: RealTimeSubtitlesWithTranslationInputSchema,
    outputSchema: RealTimeSubtitlesWithTranslationOutputSchema,
  },
  async input => {
    if (!input.text.trim()) {
      return { translatedText: '' };
    }

    // 1. Traduction via IA
    const {output} = await realTimeSubtitlesPrompt(input);
    const translated = output?.translatedText || '';

    // 2. Sauvegarde silencieuse dans Firestore (Le Scribe)
    if (input.sessionId) {
        try {
            await db.collection('sessions').doc(input.sessionId).collection('transcripts').add({
                original: input.text,
                translated: translated,
                speaker: input.speaker, // 'Therapist' ou 'Patient'
                language: input.targetLanguage,
                timestamp: new Date(),
            });
        } catch (e) {
            console.error("Erreur sauvegarde transcript:", e);
        }
    }

    return { translatedText: translated };
  }
);

export async function realTimeSubtitlesWithTranslation(
  input: RealTimeSubtitlesWithTranslationInput
): Promise<RealTimeSubtitlesWithTranslationOutput> {
  return realTimeSubtitlesWithTranslationFlow(input);
}


// --- FONCTION 2 : GÉNÉRATION DE RÉSUMÉ (NOUVEAU) ---

const SummaryInputSchema = z.object({
    sessionId: z.string(),
});

const SummaryOutputSchema = z.object({
    summary: z.string().describe("Un résumé narratif de la séance."),
    keyPoints: z.array(z.string()).describe("Liste des points clés."),
    mood: z.string().describe("L'ambiance générale."),
});

export const generateSessionSummary = ai.defineFlow(
    {
        name: 'generateSessionSummary',
        inputSchema: SummaryInputSchema,
        outputSchema: SummaryOutputSchema,
    },
    async (input) => {
        // 1. Récupérer l'historique
        const snapshot = await db.collection('sessions').doc(input.sessionId)
            .collection('transcripts')
            .orderBy('timestamp', 'asc')
            .get();

        if (snapshot.empty) {
            throw new Error("Aucune transcription trouvée.");
        }

        // 2. Préparer le texte pour l'IA
        const conversationLog = snapshot.docs.map(doc => {
            const data = doc.data();
            return `${data.speaker}: ${data.translated || data.original}`;
        }).join('\n');

        // 3. Prompt pour le résumé
        const promptText = `
            Analyse cette séance de thérapie et génère un rapport JSON :
            - summary: Résumé global (5-10 lignes).
            - keyPoints: 3 à 5 points clés.
            - mood: État émotionnel du patient.
            
            TRANSCRIPTION:
            ${conversationLog}
        `;

        // Appel générique à l'IA
        const result = await ai.generate({
            prompt: promptText,
            output: { schema: SummaryOutputSchema }
        });

        if (!result.output) throw new Error("Échec du résumé.");

        // 4. Sauvegarder le résultat
        await db.collection('sessions').doc(input.sessionId).update({
            aiSummary: result.output,
            lastSummaryDate: new Date()
        });

        return result.output;
    }
);