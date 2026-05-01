import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'white';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ variant = 'full', className, size = 'md' }: LogoProps) {
  const sizeMap = {
    sm: variant === 'icon' ? 'w-7 h-7' : 'h-7',
    md: variant === 'icon' ? 'w-10 h-10' : 'h-10',
    lg: variant === 'icon' ? 'w-14 h-14' : 'h-14',
    xl: variant === 'icon' ? 'w-20 h-20' : 'h-20',
  };

  const version = 'v9';
  const logoSrc = 
    (variant === 'icon' ? '/official-clinxia-v9-icon.png' : 
    variant === 'white' ? '/official-clinxia-v9-white.png' : 
    '/official-clinxia-v9-logo.png') + `?v=${version}`;

  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src={logoSrc} 
        alt="Clinxia Logo" 
        className={cn(
          "object-contain",
          sizeMap[size],
          variant === 'white' && "brightness-0 invert"
        )}
      />
    </div>
  );
}
