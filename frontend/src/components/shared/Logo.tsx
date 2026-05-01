import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'white';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ variant = 'full', className, size = 'md' }: LogoProps) {
  const sizeMap = {
    sm: variant === 'icon' ? 'w-12 h-12' : 'h-14',
    md: variant === 'icon' ? 'w-16 h-16' : 'h-20',
    lg: variant === 'icon' ? 'w-24 h-24' : 'h-28',
    xl: variant === 'icon' ? 'w-40 h-40' : 'h-48',
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
