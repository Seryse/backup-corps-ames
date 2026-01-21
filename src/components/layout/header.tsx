import Link from 'next/link';
import { UserNav } from '@/components/auth/user-nav';
import LanguageSwitcher from './language-switcher';
import { Dictionary } from '@/lib/dictionaries';
import { Locale } from '@/i18n-config';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ShoppingBag, CalendarDays, GraduationCap, Home, Tv, Shield } from 'lucide-react';
import { CartNav } from './cart-nav';

const LotusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8.5 18c4.25-1.5 5.5-5.5 5.5-5.5s1.25 4 5.5 5.5" />
      <path d="M12 12.5a3.5 3.5 0 1 0-7 0" />
      <path d="M12 12.5a3.5 3.5 0 1 1 7 0" />
      <path d="M12 18v-5.5" />
      <path d="M8 8.83C8.42 7.06 9.56 6 12 6s3.58 1.06 4 2.83" />
      <path d="M12 2v4" />
    </svg>
);


export default function Header({ dictionary, lang }: { dictionary: Dictionary['header'], lang: Locale }) {
  const navLinks = [
      { href: `/${lang}/dashboard`, label: dictionary.home, icon: Home },
      { href: `/${lang}/shop`, label: dictionary.shop, icon: ShoppingBag },
      { href: `/${lang}/agenda`, label: dictionary.agenda, icon: CalendarDays },
      { href: `/${lang}/trainings`, label: dictionary.trainings, icon: GraduationCap },
      { href: `/${lang}/session`, label: dictionary.session, icon: Tv },
      { href: `/${lang}/admin`, label: dictionary.admin, icon: Shield },
  ]
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href={`/${lang}`} className="mr-6 flex items-center space-x-2">
            <LotusIcon className="h-6 w-6 text-accent-foreground" />
            <span className="font-bold font-headline text-lg">Corps et Âmes</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
             {navLinks.map(({href, label}) => (
                <Link key={href} href={href} className="text-foreground/60 transition-colors hover:text-foreground/80">{label}</Link>
            ))}
        </nav>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
            {/* Mobile Navigation */}
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="pt-12 flex flex-col">
                    <nav className="grid gap-4 flex-1">
                        {navLinks.map(({href, label, icon: Icon}) => (
                            <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                                <Icon className="h-5 w-5" />
                                {label}
                            </Link>
                        ))}
                    </nav>
                     <div className="flex flex-col gap-2">
                        <LanguageSwitcher lang={lang} />
                        <div className="flex items-center gap-2">
                            <UserNav dictionary={dictionary} lang={lang} />
                            <CartNav />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Desktop items */}
            <div className="hidden md:flex items-center space-x-2">
                <LanguageSwitcher lang={lang} />
                <CartNav />
                <UserNav dictionary={dictionary} lang={lang} />
            </div>
        </div>
      </div>
    </header>
  );
}
