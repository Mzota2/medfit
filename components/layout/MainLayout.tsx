/**
 * Main layout wrapper with Header and Footer
 */

import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

