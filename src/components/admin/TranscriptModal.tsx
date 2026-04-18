'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Sparkles, User, Stethoscope } from 'lucide-react';
import { useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
// Import de notre fonction serveur pour générer le résumé
import { generateSessionSummary } from '@/ai/flows/real-time-subtitles-translation';

export default function TranscriptModal({ 
    isOpen, 
    onClose, 
    sessionId 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    sessionId: string;
}) {
    const firestore = useFirestore();
    const [isGenerating, setIsGenerating] = useState(false);

    // 1. Récupérer la session (pour voir si un résumé existe déjà)
    const { data: session } = useDoc(firestore ? doc(firestore, 'sessions', sessionId) : null);

    // 2. Récupérer les transcripts (l'historique de chat)
    const transcriptsQuery = firestore ? query(
        collection(firestore, 'sessions', sessionId, 'transcripts'),
        orderBy('timestamp', 'asc')
    ) : null;
    const { data: transcripts } = useCollection(transcriptsQuery);

    const handleGenerateSummary = async () => {
        setIsGenerating(true);
        try {
            await generateSessionSummary({ sessionId });
            // L'affichage se mettra à jour tout seul grâce à useDoc
        } catch (error) {
            console.error("Erreur génération:", error);
            alert("Erreur lors de la génération du résumé.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-accent" /> Rapport de Séance
                    </DialogTitle>
                    <DialogDescription>
                        Historique complet et analyse IA.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="summary">Résumé & Analyse</TabsTrigger>
                        <TabsTrigger value="transcript">Transcription Complète</TabsTrigger>
                    </TabsList>

                    {/* ONGLET 1 : RÉSUMÉ */}
                    <TabsContent value="summary" className="flex-1 overflow-auto p-4 space-y-6">
                        {session?.aiSummary ? (
                            <div className="space-y-6 animate-in fade-in">
                                {/* Ambiance */}
                                <div className="bg-muted/30 p-4 rounded-lg border">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Ambiance</h4>
                                    <p className="text-lg font-medium text-accent">{session.aiSummary.mood}</p>
                                </div>

                                {/* Résumé */}
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Synthèse</h4>
                                    <p className="leading-relaxed bg-white dark:bg-zinc-900 p-4 rounded-md shadow-sm border whitespace-pre-wrap">
                                        {session.aiSummary.summary}
                                    </p>
                                </div>

                                {/* Points Clés */}
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Points Clés</h4>
                                    <ul className="space-y-2">
                                        {session.aiSummary.keyPoints?.map((point: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2 bg-accent/5 p-2 rounded-md">
                                                <Sparkles className="h-4 w-4 text-accent mt-1 shrink-0" />
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div className="pt-4 border-t">
                                    <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={isGenerating}>
                                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Sparkles className="h-4 w-4 mr-2"/>}
                                        Régénérer l'analyse
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">Aucun résumé disponible</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto">
                                        L'IA peut analyser la transcription pour extraire les points clés.
                                    </p>
                                </div>
                                <Button onClick={handleGenerateSummary} disabled={isGenerating || !transcripts?.length}>
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-4 w-4" /> Générer le Résumé IA
                                        </>
                                    )}
                                </Button>
                                {!transcripts?.length && (
                                    <p className="text-xs text-destructive">Aucune transcription disponible pour l'analyse.</p>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    {/* ONGLET 2 : TRANSCRIPTION */}
                    <TabsContent value="transcript" className="flex-1 overflow-hidden flex flex-col">
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {transcripts?.map((msg) => (
                                    <div key={msg.id} className={`flex gap-3 ${msg.speaker === 'Therapist' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                            msg.speaker === 'Therapist' ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {msg.speaker === 'Therapist' ? <Stethoscope className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                        </div>
                                        <div className={`rounded-lg p-3 max-w-[80%] ${
                                            msg.speaker === 'Therapist' 
                                                ? 'bg-accent/10 text-accent-foreground rounded-tr-none' 
                                                : 'bg-muted text-foreground rounded-tl-none'
                                        }`}>
                                            <p className="text-xs font-bold mb-1 opacity-50 uppercase">
                                                {msg.speaker === 'Therapist' ? 'Thérapeute' : 'Patient'}
                                            </p>
                                            <p>{msg.translated || msg.original}</p>
                                        </div>
                                    </div>
                                ))}
                                {!transcripts?.length && (
                                    <p className="text-center text-muted-foreground py-10">La transcription est vide.</p>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}