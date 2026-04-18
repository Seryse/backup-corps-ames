# **App Name**: Corps et Âmes

## Core Features:

- Authentication and Account Management: Implement Google Login and Email/Password authentication with account merging functionality. Configuration uses provided firebaseConfig.
- Internationalization (i18next): Set up i18next for French, Spanish, and English with automatic language detection.
- Session Access Control: Verify session status and date in Firestore before granting video access. Redirect to dashboard if session is invalid.
- Anti-Ducking Audio Mixing (Background Music): Admin mixes microphone input with background MP3 from `/playlists` into a single MediaStream for call.
- Anti-Ducking Audio Mixing (Localized Intro): Trigger localized intro playback via Firestore. Client-side audio context mixing to prevent ducking.
- Admin Console File Listing: List files from Storage folders `/intros` and `/playlists` in the admin console.
- Real-time Subtitles and Translation: Provide Real-time subtitles using Web Speech API. Display translated output to clients.

## Style Guidelines:

- Primary color: Soft Lavender (#E6E6FA) for tranquility and spirituality.
- Background color: Light beige (#F5F5DC), offering a subtle contrast to the primary color while maintaining a calm environment.
- Accent color: Pale gold (#E6BE8A) to highlight interactive elements.
- Font pairing: 'Alegreya', a serif (headlines), with 'PT Sans', a sans-serif (body).
- Code font: 'Source Code Pro' for displaying configuration details.
- Use minimalist icons that are inspired by Yoga and Spirituality to reflect the application's themes.
- Implement subtle and smooth transitions across the application for a fluid user experience.