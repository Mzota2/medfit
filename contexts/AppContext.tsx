/**
 * Application Context
 * Manages UI state, filters, modals, preferences, and current business ID
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { business } from '@/types/business';
import { getBusinesses } from '@/lib/businesses';

interface AppContextType {
  // Business
  currentBusiness: business | null;
  businessLoading: boolean;
  setCurrentBusiness: (business: business | null) => void;
  fetchCurrentBusiness: () => Promise<void>;
  
  // UI State
  filters: {
    products: {
      category: string;
      priceMin: number;
      priceMax: number;
      availability: string[];
      condition: string[];
    };
    services: {
      category: string;
      priceMin: number;
      priceMax: number;
      serviceType: string[];
      availability: string[];
    };
  };
  updateProductFilters: (filters: Partial<AppContextType['filters']['products']>) => void;
  updateServiceFilters: (filters: Partial<AppContextType['filters']['services']>) => void;
  resetProductFilters: () => void;
  resetServiceFilters: () => void;
  
  // Modal states
  modals: {
    [key: string]: boolean;
  };
  openModal: (modalName: string) => void;
  closeModal: (modalName: string) => void;
  closeAllModals: () => void;
  
  // Preferences (can be extended)
  preferences: {
    theme?: 'light' | 'dark';
    [key: string]: string | number | boolean | undefined;
  };
  updatePreferences: (prefs: Partial<AppContextType['preferences']>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultProductFilters = {
  category: 'all',
  priceMin: 0,
  priceMax: 10000,
  availability: ['in_stock'],
  condition: [],
};

const defaultServiceFilters = {
  category: 'all',
  priceMin: 0,
  priceMax: 10000,
  serviceType: ['online', 'in_person', 'group'],
  availability: ['available_now', 'next_24_hours'],
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBusiness, setCurrentBusinessState] = useState<business | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [filters, setFilters] = useState<AppContextType['filters']>({
    products: { ...defaultProductFilters },
    services: { ...defaultServiceFilters },
  });
  const [modals, setModals] = useState<{ [key: string]: boolean }>({});
  const [preferences, setPreferences] = useState<AppContextType['preferences']>({});

  // Load business from localStorage on mount
  useEffect(() => {
    const savedBusiness = localStorage.getItem('currentBusiness');
    if (savedBusiness) {
      try {
        setCurrentBusinessState(JSON.parse(savedBusiness));
      } catch (error) {
        console.error('Error loading business from localStorage:', error);
      }
    }
  }, []);

  // Save business to localStorage when it changes
  useEffect(() => {
    if (currentBusiness) {
      localStorage.setItem('currentBusiness', JSON.stringify(currentBusiness));
    } else {
      localStorage.removeItem('currentBusiness');
    }
  }, [currentBusiness]);

  // Fetch current business (typically the first/only business)
  const fetchCurrentBusiness = useCallback(async () => {
    setBusinessLoading(true);
    try {
      const businesses = await getBusinesses({ limit: 1 });
      if (businesses.length > 0) {
        setCurrentBusinessState(businesses[0]);
      }
    } catch (error) {
      console.error('Error fetching current business:', error);
    } finally {
      setBusinessLoading(false);
    }
  }, []);

  const setCurrentBusiness = useCallback((business: business | null) => {
    setCurrentBusinessState(business);
  }, []);

  // Filter management
  const updateProductFilters = useCallback((newFilters: Partial<AppContextType['filters']['products']>) => {
    setFilters((prev) => ({
      ...prev,
      products: { ...prev.products, ...newFilters },
    }));
  }, []);

  const updateServiceFilters = useCallback((newFilters: Partial<AppContextType['filters']['services']>) => {
    setFilters((prev) => ({
      ...prev,
      services: { ...prev.services, ...newFilters },
    }));
  }, []);

  const resetProductFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      products: { ...defaultProductFilters },
    }));
  }, []);

  const resetServiceFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      services: { ...defaultServiceFilters },
    }));
  }, []);

  // Modal management
  const openModal = useCallback((modalName: string) => {
    setModals((prev) => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName: string) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals({});
  }, []);

  // Preferences management
  const updatePreferences = useCallback((newPrefs: Partial<AppContextType['preferences']>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));
    // Save to localStorage
    const updated = { ...preferences, ...newPrefs };
    localStorage.setItem('appPreferences', JSON.stringify(updated));
  }, [preferences]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPrefs = localStorage.getItem('appPreferences');
    if (savedPrefs) {
      try {
        setPreferences(JSON.parse(savedPrefs));
      } catch (error) {
        console.error('Error loading preferences from localStorage:', error);
      }
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentBusiness,
        businessLoading,
        setCurrentBusiness,
        fetchCurrentBusiness,
        filters,
        updateProductFilters,
        updateServiceFilters,
        resetProductFilters,
        resetServiceFilters,
        modals,
        openModal,
        closeModal,
        closeAllModals,
        preferences,
        updatePreferences,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

