/**
 * Theme configuration and utilities
 * Centralized theme management
 */

/**
 * Theme colors as CSS variable names
 */
export const themeColors = {
  background: 'var(--color-background)',
  foreground: 'var(--color-foreground)',
  card: 'var(--color-card)',
  cardForeground: 'var(--color-card-foreground)',
  primary: 'var(--color-primary)',
  primaryForeground: 'var(--color-primary-foreground)',
  primaryHover: 'var(--color-primary-hover)',
  secondary: 'var(--color-secondary)',
  secondaryForeground: 'var(--color-secondary-foreground)',
  destructive: 'var(--color-destructive)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  border: 'var(--color-border)',
} as const;

/**
 * Get CSS variable value
 */
export const getThemeColor = (colorName: keyof typeof themeColors): string => {
  return themeColors[colorName];
};

/**
 * Apply theme to element (for dynamic theming in the future)
 */
export const applyTheme = (theme: Record<string, string>) => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }
};

