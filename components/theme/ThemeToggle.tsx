'use client';

import { Moon, Sun, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/Button';
import { useEffect, useState } from 'react';

export function ThemeToggle(): React.ReactNode {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Ensure we're on the client before rendering theme-dependent content
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setIsLoading(true);
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Reset loading state after a short delay to ensure smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  };

  // Don't render anything on the server
  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-9 p-0"
        disabled
        aria-label="Loading theme"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full p-1 relative overflow-hidden"
      onClick={toggleTheme}
      disabled={isLoading}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Sun 
            className={`h-4 w-4 transition-all duration-300 ${
              theme === 'dark' ? 'rotate-90 opacity-0 scale-0' : 'rotate-0 opacity-100 scale-100'
            }`} 
            aria-hidden="true"
          />
          <Moon 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-300 ${
              theme === 'dark' ? 'opacity-100 scale-100' : 'opacity-0 scale-0 -rotate-90'
            }`} 
            aria-hidden="true"
          />
          <span className="sr-only">
            {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          </span>
        </>
      )}
    </Button>
  );
}
