'use server';

import { ai } from '@/ai/genkit';
import {
  TranslateTextInputSchema,
  TranslateTextOutputSchema,
  type TranslateTextInput,
  type TranslateTextOutput,
} from '@/ai/types';

// 1. LE PROMPT
const translationPrompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: { schema: TranslateTextInputSchema },
  output: { schema: TranslateTextOutputSchema },
  prompt: `Translate the following French text into English and Spanish.

French text:
"{{{text}}}"

Provide only the JSON object with the 'en' and 'es' translations.`,
});

// 2. LE FLOW (Défini AVANT l'export qui l'utilise)
const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    const { output } = await translationPrompt(input);
    return output!;
  }
);

// 3. L'EXPORT
export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  // Sécurité : si pas de texte, on renvoie vide sans appeler l'IA
  if (!input || !input.text || !input.text.trim()) {
    return { en: '', es: '' };
  }
  return translateTextFlow(input);
}