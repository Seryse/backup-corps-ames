'use client'

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dictionary } from "@/lib/dictionaries";
import { Locale } from "@/i18n-config";
import { Loader2 } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "signup";
  dictionary: Dictionary['auth'];
  lang: Locale;
}

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof formSchema>;

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 76.2C324.7 112.3 289.6 96 248 96c-94.2 0-170.9 76.7-170.9 160s76.7 160 170.9 160c109.8 0 142.3-81.8 148.2-124.6H248v-93.5h239.8c.2 12.3.2 24.7.2 37.3z"></path>
    </svg>
);

export function AuthForm({ mode, dictionary, lang }: AuthFormProps) {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormData) => {
    setIsLoading(true);
    const promise = mode === "signup"
        ? createUserWithEmailAndPassword(auth, data.email, data.password)
        : signInWithEmailAndPassword(auth, data.email, data.password);

    promise
        .then(() => {
            router.push(`/${lang}/dashboard`);
        })
        .catch((error: any) => {
            toast({
                variant: "destructive",
                title: dictionary.loginErrorTitle || "Authentication Error",
                description: error.message,
            });
        })
        .finally(() => {
            setIsLoading(false);
        });
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    
    signInWithPopup(auth, provider)
        .then(() => {
            router.push(`/${lang}/dashboard`);
        })
        .catch((error: any) => {
            if (error.code === 'auth/account-exists-with-different-credential') {
                 toast({
                    variant: "destructive",
                    title: "Compte existant",
                    description: "Un compte existe déjà avec cet e-mail. Veuillez vous connecter avec votre méthode d'origine.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Google Sign-In Error",
                    description: error.message,
                });
            }
        })
        .finally(() => {
            setIsLoading(false);
        });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          {mode === "login" ? dictionary.loginTitle : dictionary.signupTitle}
        </CardTitle>
        <CardDescription>
          {mode === "login" ? dictionary.loginSubtitle : dictionary.signupSubtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{dictionary.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{dictionary.passwordLabel}</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? dictionary.loginButton : dictionary.signupButton}
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {dictionary.or}
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
             {dictionary.googleButton}
        </Button>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-center w-full">
            {mode === "login" ? dictionary.noAccount : dictionary.hasAccount}{" "}
            <Link
                href={mode === "login" ? `/${lang}/signup` : `/${lang}/login`}
                className="underline text-accent-foreground"
            >
                {mode === "login" ? dictionary.signupLink : dictionary.loginLink}
            </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
