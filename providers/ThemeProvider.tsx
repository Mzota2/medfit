'use client';

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';
import { useEffect } from 'react';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Prevent hydration mismatch and debug theme changes
  useEffect(() => {
    // Debug: Log the current theme
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('HTML class changed:', html.className);
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      enableColorScheme={true}
      storageKey="eshopcure-theme"
      disableTransitionOnChange={false}
      themes={['light', 'dark']}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
