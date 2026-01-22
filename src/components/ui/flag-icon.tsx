import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FlagIconProps {
  code: string;
  className?: string;
}

export function FlagIcon({ code, className }: FlagIconProps) {
    // some countries have different codes for i18n and flags, e.g. en -> gb
    const flagCode = code === 'en' ? 'gb' : code;
    return (
        <Image
            src={`https://flagcdn.com/w40/${flagCode}.png`}
            width={20}
            height={15}
            alt={`${code} flag`}
            className={cn('shrink-0 rounded-[2px]', className)}
        />
    );
}
