'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Gift } from 'lucide-react';
import { submitTestimonial } from '@/app/actions';

interface TestimonialModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    userId: string;
}

export default function TestimonialModal({ isOpen, onClose, bookingId, userId }: TestimonialModalProps) {
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [coupon, setCoupon] = useState<string | null>(null);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!feedback.trim()) {
            toast({ variant: 'destructive', title: 'Feedback cannot be empty.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await submitTestimonial({ bookingId, userId, feedbackText: feedback });
            if (result.success && result.couponCode) {
                setCoupon(result.couponCode);
                toast({ title: 'Thank you for your feedback!' });
            } else {
                throw new Error(result.error || 'Failed to submit feedback.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
            setIsSubmitting(false);
        }
    };
    
    const handleCloseAndReset = () => {
        setFeedback('');
        setIsSubmitting(false);
        setCoupon(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleCloseAndReset}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{coupon ? 'Thank You!' : 'Share Your Experience'}</DialogTitle>
                    <DialogDescription>
                        {coupon 
                            ? "As a thank you, here is a 10% discount coupon for your next session."
                            : "Your feedback helps us grow. Please share your thoughts on the session."
                        }
                    </DialogDescription>
                </DialogHeader>
                
                {coupon ? (
                    <div className="mt-4 text-center p-6 bg-accent/20 rounded-lg border-2 border-dashed border-accent">
                        <Gift className="mx-auto h-12 w-12 text-accent mb-4" />
                        <p className="text-muted-foreground mb-2">Your coupon code:</p>
                        <p className="text-2xl font-bold font-mono bg-background p-2 rounded-md">{coupon}</p>
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        <Textarea
                            placeholder="Type your feedback here..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={6}
                        />
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                            <span className="ml-2">Submit Feedback</span>
                        </Button>
                    </div>
                )}

            </DialogContent>
        </Dialog>
    );
}
