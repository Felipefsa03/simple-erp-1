import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'white';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ variant = 'full', className, size = 'md' }: LogoProps) {
  const sizeMap = {
    sm: variant === 'icon' ? 'w-10 h-10' : 'h-12',
    md: variant === 'icon' ? 'w-14 h-14' : 'h-16',
    lg: variant === 'icon' ? 'w-20 h-20' : 'h-24',
    xl: variant === 'icon' ? 'w-32 h-32' : 'h-40',
  };

  const logoSrc = 
    variant === 'icon' ? '/logo-icon.png' : 
    variant === 'white' ? '/logo-white.png' : 
    '/logo-full.png';

  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src={logoSrc} 
        alt="Clinxia Logo" 
        className={cn(
          "object-contain transition-all duration-300",
          sizeMap[size],
          variant === 'white' && "brightness-0 invert"
        )}
      />
    </div>
  );
}
