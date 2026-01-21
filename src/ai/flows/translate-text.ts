'use server';

/**
 * @fileOverview A utility flow to translate text from French to English and Spanish.
 *
 * - translateText: A function that takes a French text and returns its English and Spanish translations.
 */

import {ai} from '@/ai/genkit';
import {
  TranslateTextInputSchema,
  TranslateTextOutputSchema,
  type TranslateTextInput,
  type TranslateTextOutput,
} from '@/ai/types';

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  if (!input.text.trim()) {
    return { en: '', es: '' };
  }
  return translateTextFlow(input);
}

const translationPrompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: {schema: TranslateTextInputSchema},
  output: {schema: TranslateTextOutputSchema},
  prompt: `Translate the following French text into English and Spanish.

French text:
"{{{text}}}"

Provide only the JSON object with the 'en' and 'es' translations.`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async input => {
    const {output} = await translationPrompt(input);
    return output!;
  }
);
