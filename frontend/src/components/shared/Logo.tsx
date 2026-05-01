import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'white';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ variant = 'full', className, size = 'md' }: LogoProps) {
  const sizeMap = {
    sm: variant === 'icon' ? 'w-6 h-6' : 'h-6',
    md: variant === 'icon' ? 'w-8 h-8' : 'h-8',
    lg: variant === 'icon' ? 'w-12 h-12' : 'h-12',
    xl: variant === 'icon' ? 'w-16 h-16' : 'h-16',
  };

  const version = 'v7';
  const logoSrc = 
    (variant === 'icon' ? '/clinxia-brand-icon.png' : 
    variant === 'white' ? '/clinxia-brand-white.png' : 
    '/clinxia-brand-logo.png') + `?v=${version}`;

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
