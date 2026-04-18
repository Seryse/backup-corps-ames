import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()],
  // On utilise le modèle "flash" qui est bien dans la liste de l'API et qui a un quota gratuit plus généreux
  model: 'googleai/gemini-2.5-flash',
});
