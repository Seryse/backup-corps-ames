
'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getDictionary, Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { useUser, useFirestore, useDoc, useMemoFirebase, useStorage } from '@/firebase';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, DocumentReference } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, KeyRound, Languages, Camera, Home, Award } from 'lucide-react';
import LanguageSwitcher from '@/components/layout/language-switcher';
import Cropper, { Area } from 'react-easy-crop';
import getCroppedImg from '@/lib/crop-image';

type BillingAddress = {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
};

type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  billingAddress?: BillingAddress;
  certificateName?: string;
};

// --- Zod Schemas for Validation ---
const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  certificateName: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from the current one.",
  path: ["newPassword"],
});

const billingAddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type BillingAddressFormData = z.infer<typeof billingAddressSchema>;

function AccountPageContent({ lang, dict, user }: { lang: Locale, dict: Dictionary, user: FirebaseUser }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // State for image cropping
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const accountDict = dict.account_page;

  // --- Data Fetching and Syncing ---
  const userProfileRef = useMemoFirebase(() => firestore ? doc(firestore, 'users', user.uid) as DocumentReference<UserProfile> : null, [firestore, user.uid]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    // If firestore profile doesn't exist, create it from auth data
    if (!isProfileLoading && !userProfile && firestore) {
      const initialProfile: UserProfile = {
        id: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
      };
      setDoc(userProfileRef!, initialProfile, { merge: true });
    }
  }, [isProfileLoading, userProfile, user, firestore, userProfileRef]);
  
  // --- Form Hooks ---
  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: { 
        displayName: userProfile?.displayName || user.displayName || '',
        certificateName: userProfile?.certificateName || '',
    },
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, reset: resetPasswordForm } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const { register: registerAddress, handleSubmit: handleSubmitAddress, formState: { errors: addressErrors } } = useForm<BillingAddressFormData>({
    resolver: zodResolver(billingAddressSchema),
    values: {
      street: userProfile?.billingAddress?.street || '',
      city: userProfile?.billingAddress?.city || '',
      postalCode: userProfile?.billingAddress?.postalCode || '',
      country: userProfile?.billingAddress?.country || '',
    },
  });

  // --- Submission Handlers ---
  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsUpdatingProfile(true);
    try {
      if (data.displayName !== user.displayName) {
        await updateProfile(user, { displayName: data.displayName });
      }
      if (userProfileRef) {
        await setDoc(userProfileRef, { 
            displayName: data.displayName, 
            certificateName: data.certificateName 
        }, { merge: true });
      }
      toast({ title: accountDict.success.profile_updated });
    } catch (error: any) {
      toast({ variant: 'destructive', title: accountDict.errors.update_failed, description: error.message });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!user.email) return;
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

  const onAddressSubmit = async (data: BillingAddressFormData) => {
    if (!userProfileRef) return;
    setIsUpdatingAddress(true);
    try {
        await setDoc(userProfileRef, { billingAddress: data }, { merge: true });
        toast({ title: accountDict.success.address_updated });
    } catch (error: any) {
        toast({ variant: 'destructive', title: accountDict.errors.update_failed, description: error.message });
    } finally {
        setIsUpdatingAddress(false);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
    }
  };

  const saveCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels || !storage) return;
    setIsUploading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error('Could not crop image.');

      const avatarRef = storageRef(storage, `avatars/${user.uid}`);
      await uploadBytes(avatarRef, croppedImageBlob);
      const downloadURL = await getDownloadURL(avatarRef);

      await updateProfile(user, { photoURL: downloadURL });
      if (userProfileRef) {
          await setDoc(userProfileRef, { photoURL: downloadURL }, { merge: true });
      }

      toast({ title: accountDict.success.avatar_updated });
      setImageSrc(null); // Close modal
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: accountDict.errors.update_failed, description: e.message });
    } finally {
      setIsUploading(false);
    }
  };

  if (isProfileLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
        </div>
      );
  }

  const currentPhotoURL = userProfile?.photoURL || user.photoURL;

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
               <div className="grid gap-2">
                <Label htmlFor="certificateName">{accountDict.profile.certificate_name_label}</Label>
                <Input id="certificateName" {...registerProfile('certificateName')} placeholder={accountDict.profile.certificate_name_placeholder} />
                {profileErrors.certificateName && <p className="text-sm text-destructive">{profileErrors.certificateName.message}</p>}
                <p className="text-xs text-muted-foreground">{accountDict.profile.certificate_name_desc}</p>
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

        {/* Avatar Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5"/>{accountDict.profile.picture_title}</CardTitle>
            <CardDescription>{accountDict.profile.picture_description}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={currentPhotoURL || ''} alt={user.displayName || 'User avatar'} />
              <AvatarFallback className="text-3xl">
                {user.displayName?.[0] || user.email?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button onClick={() => fileInputRef.current?.click()}>
                {accountDict.profile.change_picture_button}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
              />
            </div>
          </CardContent>
        </Card>

        {/* Billing Address Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5" />{accountDict.billing.title}</CardTitle>
            <CardDescription>{accountDict.billing.description}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmitAddress(onAddressSubmit)}>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="street">{accountDict.billing.street_label}</Label>
                    <Input id="street" {...registerAddress('street')} />
                    {addressErrors.street && <p className="text-sm text-destructive">{addressErrors.street.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="city">{accountDict.billing.city_label}</Label>
                        <Input id="city" {...registerAddress('city')} />
                        {addressErrors.city && <p className="text-sm text-destructive">{addressErrors.city.message}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="postalCode">{accountDict.billing.postal_code_label}</Label>
                        <Input id="postalCode" {...registerAddress('postalCode')} />
                        {addressErrors.postalCode && <p className="text-sm text-destructive">{addressErrors.postalCode.message}</p>}
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="country">{accountDict.billing.country_label}</Label>
                    <Input id="country" {...registerAddress('country')} />
                    {addressErrors.country && <p className="text-sm text-destructive">{addressErrors.country.message}</p>}
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={isUpdatingAddress}>
                {isUpdatingAddress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {accountDict.billing.save_button}
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
      
      <Dialog open={!!imageSrc} onOpenChange={(open) => !open && setImageSrc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{accountDict.profile_crop.title}</DialogTitle>
          </DialogHeader>
          <div className="relative h-80 bg-muted mt-4">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
              />
            )}
          </div>
          <div className="space-y-2 mt-4">
            <Label>Zoom</Label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(val) => setZoom(val[0])}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setImageSrc(null)} disabled={isUploading}>
              {dict.admin.form.cancel}
            </Button>
            <Button onClick={saveCroppedImage} disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accountDict.profile_crop.save_button}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AccountPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { user, isUserLoading } = useUser();

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

  return <AccountPageContent lang={lang} dict={dict} user={user} />;
}
