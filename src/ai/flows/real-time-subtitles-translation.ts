'use server';

/**
 * @fileOverview This file defines a Genkit flow for real-time subtitles and translation.
 *
 * It provides the following functionalities:
 * - realTimeSubtitlesWithTranslation: A function to generate real-time subtitles and translation.
 * - RealTimeSubtitlesWithTranslationInput: The input type for the realTimeSubtitlesWithTranslation function.
 * - RealTimeSubtitlesWithTranslationOutput: The output type for the realTimeSubtitlesWithTranslation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RealTimeSubtitlesWithTranslationInputSchema = z.object({
  text: z.string().describe('The text to be translated.'),
  targetLanguage: z.string().describe('The target language for translation.'),
});

export type RealTimeSubtitlesWithTranslationInput =
  z.infer<typeof RealTimeSubtitlesWithTranslationInputSchema>;

const RealTimeSubtitlesWithTranslationOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});

export type RealTimeSubtitlesWithTranslationOutput =
  z.infer<typeof RealTimeSubtitlesWithTranslationOutputSchema>;

export async function realTimeSubtitlesWithTranslation(
  input: RealTimeSubtitlesWithTranslationInput
): Promise<RealTimeSubtitlesWithTranslationOutput> {
  return realTimeSubtitlesWithTranslationFlow(input);
}

const realTimeSubtitlesPrompt = ai.definePrompt({
  name: 'realTimeSubtitlesPrompt',
  input: {schema: RealTimeSubtitlesWithTranslationInputSchema},
  output: {schema: RealTimeSubtitlesWithTranslationOutputSchema},
  prompt: `Translate the following text into {{{targetLanguage}}}:\n\n{{text}}`,
});

const realTimeSubtitlesWithTranslationFlow = ai.defineFlow(
  {
    name: 'realTimeSubtitlesWithTranslationFlow',
    inputSchema: RealTimeSubtitlesWithTranslationInputSchema,
    outputSchema: RealTimeSubtitlesWithTranslationOutputSchema,
  },
  async input => {
    const {output} = await realTimeSubtitlesPrompt(input);
    return output!;
  }
);
