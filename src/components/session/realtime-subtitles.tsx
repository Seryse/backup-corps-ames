'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Languages, Loader2 } from 'lucide-react';
import { Locale } from '@/i18n-config';
import { realTimeSubtitlesWithTranslation } from '@/ai/flows/real-time-subtitles-translation';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { LiveSession } from '@/lib/types';

interface RealtimeSubtitlesProps {
    dictionary: any;
    lang: Locale;
    isAdmin: boolean;
    sessionId: string;
    sessionState: LiveSession | null;
}

interface SubtitleData {
    original: string;
    translations: { en: string; es: string; fr: string; };
    timestamp: number;
}

export default function RealtimeSubtitles({
    dictionary, lang, isAdmin, sessionId, sessionState
}: RealtimeSubtitlesProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false); // Ref pour éviter les closures stale
    const firestore = useFirestore();

    const subtitle = sessionState?.subtitle;
    const canBroadcast = isAdmin && (
        sessionState?.sessionStatus === 'INTRO' ||
        sessionState?.sessionStatus === 'OUTRO'
    );

    const handleTranscript = useCallback(async (transcript: string) => {
        if (!firestore || !sessionId || !transcript.trim()) return;

        setIsProcessing(true);
        try {
            const targetLang = isAdmin ? 'en' : 'fr' as string;

            const result = await realTimeSubtitlesWithTranslation({
                text: transcript,
                targetLanguage: targetLang,
                sessionId: sessionId,
                speaker: isAdmin ? 'Therapist' : 'Patient'
            });

            const newSubtitle: SubtitleData = {
                original: transcript,
                translations: {
                    en: targetLang === 'en' ? result.translatedText : "",
                    es: targetLang === 'es' ? result.translatedText : "",
                    fr: targetLang === 'fr' ? result.translatedText : "",
                },
                timestamp: Date.now(),
            };

            await updateDoc(doc(firestore, "sessions", sessionId), {
                subtitle: newSubtitle,
            });

        } catch (error) {
            console.error("Translation error:", error);
        } finally {
            setIsProcessing(false);
        }
    }, [firestore, sessionId, isAdmin]);

    // ── Gestion de la reconnaissance vocale ───────────────────────────────
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        isListeningRef.current = isListening;

        if (isListening && !recognitionRef.current) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = isAdmin ? 'fr-FR' : (lang === 'fr' ? 'fr-FR' : 'en-US');

            let debounceTimer: NodeJS.Timeout;

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        handleTranscript(finalTranscript.trim());
                    }, 500);
                }
            };

            recognition.onerror = (event: any) => {
                // 'aborted' est une erreur normale (changement d'onglet, perte de focus)
                // On ne la traite pas comme une erreur fatale
                if (event.error === 'aborted') return;
                // 'no-speech' est aussi normal — on ignore silencieusement
                if (event.error === 'no-speech') return;
                // Pour les vraies erreurs, on arrête
                console.warn('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                // Auto-restart seulement si on est toujours en mode écoute
                // et que ce n'est pas un arrêt volontaire
                if (isListeningRef.current) {
                    try {
                        recognition.start();
                    } catch (e) {
                        // Ignore — peut arriver si on démarre trop vite
                    }
                }
            };

            try {
                recognition.start();
                recognitionRef.current = recognition;
            } catch (e) {
                console.warn('Could not start speech recognition:', e);
            }

        } else if (!isListening && recognitionRef.current) {
            isListeningRef.current = false;
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        return () => {
            if (recognitionRef.current && !isListening) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
        };
    }, [isListening, handleTranscript, isAdmin, lang]);

    // Arrêt propre au démontage
    useEffect(() => {
        return () => {
            isListeningRef.current = false;
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
        };
    }, []);

    const toggleListening = () => setIsListening(prev => !prev);

    const showOriginal = isAdmin;
    const displayText = showOriginal
        ? subtitle?.original
        : (subtitle?.translations as any)?.[lang] || subtitle?.original;

    return (
        <Card className="border-t shadow-inner bg-background/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base font-medium">
                    <div className="flex items-center gap-2">
                        <Languages className="h-4 w-4 text-primary" />
                        {dictionary?.subtitles || 'Sous-titres & Transcription'}
                    </div>
                    {isProcessing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button
                    onClick={toggleListening}
                    className={`w-full justify-center gap-2 transition-all ${isListening ? 'animate-pulse' : ''}`}
                    variant={isListening ? 'destructive' : 'outline'}
                    size="sm"
                >
                    {isListening
                        ? <><MicOff className="h-4 w-4" /> {dictionary?.stopRecognition || 'Arrêter'}</>
                        : <><Mic className="h-4 w-4" /> {dictionary?.startRecognition || 'Activer la transcription'}</>
                    }
                </Button>

                <div className="min-h-[80px] p-3 bg-muted/30 rounded-md border text-center flex flex-col items-center justify-center">
                    {displayText ? (
                        <>
                            <p className="text-lg font-medium leading-tight animate-in fade-in slide-in-from-bottom-1">
                                {displayText}
                            </p>
                            {subtitle?.original !== displayText && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                    "{subtitle?.original}"
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">
                            {isListening ? "En écoute..." : "Transcription inactive"}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}