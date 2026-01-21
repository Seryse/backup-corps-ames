import { z } from 'genkit';

export const TranslateTextInputSchema = z.object({
  text: z.string().describe('The French text to be translated.'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

export const TranslateTextOutputSchema = z.object({
  en: z.string().describe('The English translation.'),
  es: z.string().describe('The Spanish translation.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;
