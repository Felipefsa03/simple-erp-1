import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'white';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ variant = 'full', className, size = 'md' }: LogoProps) {
  const sizeMap = {
    sm: variant === 'icon' ? 'w-8 h-8' : 'h-8',
    md: variant === 'icon' ? 'w-10 h-10' : 'h-10',
    lg: variant === 'icon' ? 'w-12 h-12' : 'h-12',
    xl: variant === 'icon' ? 'w-16 h-16' : 'h-16',
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
          sizeMap[size]
        )}
      />
    </div>
  );
}
