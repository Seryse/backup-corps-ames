'use client';

import { useState, useEffect, use } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useAuth } from '@/firebase';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, KeyRound, Languages } from 'lucide-react';
import LanguageSwitcher from '@/components/layout/language-switcher';

export default function AccountPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    getDictionary(lang).then(setDict);
  }, [lang]);
  
  if (isUserLoading || !dict || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  const accountDict = dict.account_page;

  // --- Profile Form ---
  const profileSchema = z.object({
    displayName: z.string().min(1, accountDict.errors.name_required),
  });
  type ProfileFormData = z.infer<typeof profileSchema>;
  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: { displayName: user?.displayName || '' },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      await updateProfile(user, { displayName: data.displayName });
      toast({ title: accountDict.success.profile_updated });
    } catch (error: any) {
      toast({ variant: 'destructive', title: accountDict.errors.update_failed, description: error.message });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // --- Password Form ---
  const passwordSchema = z.object({
    currentPassword: z.string().min(6, accountDict.errors.password_min_length),
    newPassword: z.string().min(6, accountDict.errors.password_min_length),
  }).refine((data) => data.currentPassword !== data.newPassword, {
      message: accountDict.errors.password_must_be_different,
      path: ["newPassword"],
  });
  type PasswordFormData = z.infer<typeof passwordSchema>;
  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, reset: resetPasswordForm } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!user || !user.email) return;
    setIsUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);
      toast({ title: accountDict.success.password_updated });
      resetPasswordForm();
    } catch (error: any) {
      let errorMessage = error.message;
      if (error.code === 'auth/wrong-password') {
          errorMessage = accountDict.errors.wrong_current_password;
      }
      toast({ variant: 'destructive', title: accountDict.errors.update_failed, description: errorMessage });
    } finally {
      setIsUpdatingPassword(false);
    }
  };


  return (
    <div className="container mx-auto p-4 sm:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-headline mb-2">{accountDict.title}</h1>
        <p className="text-lg text-muted-foreground">{accountDict.subtitle}</p>
      </div>
      <div className="space-y-8">
        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5"/>{accountDict.profile.title}</CardTitle>
            <CardDescription>{accountDict.profile.description}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmitProfile(onProfileSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="displayName">{accountDict.profile.name_label}</Label>
                <Input id="displayName" {...registerProfile('displayName')} />
                {profileErrors.displayName && <p className="text-sm text-destructive">{profileErrors.displayName.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{accountDict.profile.email_label}</Label>
                <Input id="email" type="email" value={user.email || ''} readOnly disabled />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {accountDict.profile.save_button}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Change Password Card */}
        {user.providerData.some(p => p.providerId === 'password') && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5"/>{accountDict.password.title}</CardTitle>
                    <CardDescription>{accountDict.password.description}</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="currentPassword">{accountDict.password.current_password_label}</Label>
                            <Input id="currentPassword" type="password" {...registerPassword('currentPassword')} />
                            {passwordErrors.currentPassword && <p className="text-sm text-destructive">{passwordErrors.currentPassword.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="newPassword">{accountDict.password.new_password_label}</Label>
                            <Input id="newPassword" type="password" {...registerPassword('newPassword')} />
                            {passwordErrors.newPassword && <p className="text-sm text-destructive">{passwordErrors.newPassword.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isUpdatingPassword}>
                        {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {accountDict.password.save_button}
                    </Button>
                    </CardFooter>
                </form>
            </Card>
        )}
        
        {/* Language Card */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Languages className="h-5 w-5"/>{accountDict.language.title}</CardTitle>
                <CardDescription>{accountDict.language.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <LanguageSwitcher lang={lang} />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
