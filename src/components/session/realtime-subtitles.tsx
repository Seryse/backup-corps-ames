'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Languages } from 'lucide-react';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { realTimeSubtitlesWithTranslation } from '@/ai/flows/real-time-subtitles-translation';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface RealtimeSubtitlesProps {
    dictionary: any;
    lang: Locale;
    isAdmin: boolean;
}

interface SubtitleData {
    original: string;
    translated: string;
    timestamp: number;
}

const SESSION_ID = 'current_session'; // In a real app, this would be dynamic

export default function RealtimeSubtitles({ dictionary, lang, isAdmin }: RealtimeSubtitlesProps) {
    const [isListening, setIsListening] = useState(false);
    const [subtitle, setSubtitle] = useState<SubtitleData | null>(null);
    const recognitionRef = useRef<any>(null);
    const firestore = useFirestore();

    // Listen for subtitles from Firestore
    useEffect(() => {
        if (!firestore) return;
        const unsub = onSnapshot(doc(firestore, "subtitles", SESSION_ID), (doc) => {
            if (doc.exists()) {
                setSubtitle(doc.data() as SubtitleData);
            }
        });
        return () => unsub();
    }, [firestore]);

    const handleTranscript = useCallback(async (transcript: string) => {
        if (!firestore) return;
        try {
            const translationResult = await realTimeSubtitlesWithTranslation({
                text: transcript,
                targetLanguage: lang,
            });
            const newSubtitle: SubtitleData = {
                original: transcript,
                translated: translationResult.translatedText,
                timestamp: Date.now(),
            };
            // Update Firestore
            await setDoc(doc(firestore, "subtitles", SESSION_ID), newSubtitle);
        } catch (error) => {
            console.error("Translation error:", error);
        }
    }, [lang, firestore]);

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
            recognition.lang = 'fr-FR'; // Admin's language

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
                setIsListening(false); // Stop on error
            };
            
            recognition.onend = () => {
                if (isListening) {
                    recognition.start(); // Restart if it stops automatically and we're still supposed to be listening
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
                        {subtitle?.translated || "..."}
                    </p>
                    {!isAdmin && subtitle && (
                        <p className="text-sm text-muted-foreground">
                           ({subtitle.original})
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
