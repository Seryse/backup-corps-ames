'use server';

/**
 * @fileOverview A utility flow to translate text from French to English and Spanish.
 *
 * - translateText: A function that takes a French text and returns its English and Spanish translations.
 * - TranslateTextInput: The input type for the translateText function.
 * - TranslateTextOutput: The output type for the translateText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const TranslateTextInputSchema = z.object({
  text: z.string().describe('The French text to be translated.'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

export const TranslateTextOutputSchema = z.object({
  en: z.string().describe('The English translation.'),
  es: z.string().describe('The Spanish translation.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

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
