'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Languages } from 'lucide-react';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { translateTextAction } from '@/app/actions';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, DocumentReference } from 'firebase/firestore';

interface RealtimeSubtitlesProps {
    dictionary: any;
    lang: Locale;
    isAdmin: boolean;
    sessionId: string;
}

interface SubtitleData {
    original: string;
    translations: {
        en: string;
        es: string;
    };
    timestamp: number;
}

interface LiveSession {
    subtitle?: SubtitleData;
}

export default function RealtimeSubtitles({ dictionary, lang, isAdmin, sessionId }: RealtimeSubtitlesProps) {
    const [isListening, setIsListening] = useState(isAdmin);
    const recognitionRef = useRef<any>(null);
    const firestore = useFirestore();

    const sessionRef = useMemoFirebase(() => {
        if (!firestore || !sessionId) return null;
        return doc(firestore, 'sessions', sessionId) as DocumentReference<LiveSession>;
    }, [firestore, sessionId]);
    
    const { data: sessionState } = useDoc<LiveSession>(sessionRef);
    const subtitle = sessionState?.subtitle;

    const handleTranscript = useCallback(async (transcript: string) => {
        if (!firestore || !sessionId || !transcript.trim()) return;
        try {
            const translations = await translateTextAction({ text: transcript });
            
            const newSubtitle: SubtitleData = {
                original: transcript,
                translations: {
                    en: translations.en,
                    es: translations.es,
                },
                timestamp: Date.now(),
            };

            await updateDoc(doc(firestore, "sessions", sessionId), {
                subtitle: newSubtitle,
            });

        } catch (error) {
            console.error("Translation or Firestore update error:", error);
        }
    }, [firestore, sessionId]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser.');
            return;
        }

        if (isListening && !recognitionRef.current) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'fr-FR'; // Admin's language is French

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    handleTranscript(finalTranscript.trim());
                }
            };
            
            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };
            
            recognition.onend = () => {
                if (isListening) {
                    recognition.start();
                }
            };

            recognition.start();
            recognitionRef.current = recognition;
        } else if (!isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    }, [isListening, handleTranscript]);

    const toggleListening = () => {
        setIsListening(prev => !prev);
    };
    
    // Display logic based on user role and language
    const mainText = (isAdmin || lang === 'fr')
        ? subtitle?.original
        : subtitle?.translations?.[lang] || subtitle?.original;

    // Show secondary text ONLY if the translation was successful and we are a client
    const wasTranslationSuccessful = !(isAdmin || lang === 'fr') && subtitle?.translations?.[lang];
    const secondaryText = wasTranslationSuccessful ? `(${subtitle.original})` : null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-headline">
                    <Languages className="h-5 w-5"/>
                    {dictionary.subtitles || 'Subtitles'}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isAdmin && (
                    <Button onClick={toggleListening} className="w-full justify-start gap-2" variant={isListening ? 'destructive' : 'default'}>
                        {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        {isListening ? (dictionary.stopRecognition || 'Stop Recognition') : (dictionary.startRecognition || 'Start Recognition')}
                    </Button>
                )}
                <div className="min-h-[100px] p-4 bg-muted/50 rounded-md space-y-2">
                    <p className="text-lg font-semibold text-foreground">
                        {mainText || "..."}
                    </p>
                    {secondaryText && (
                        <p className="text-sm text-muted-foreground">
                           {secondaryText}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
