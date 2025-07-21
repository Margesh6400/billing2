import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'gu' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translate: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations = {
  // Navigation
  'Dashboard': { gu: 'ડેશબોર્ડ', en: 'Dashboard' },
  'Issue': { gu: 'ઉધાર', en: 'Issue' },
  'Return': { gu: 'જમા', en: 'Return' },
  'Clients': { gu: 'ગ્રાહકો', en: 'Clients' },
  'Stock': { gu: 'સ્ટોક', en: 'Stock' },
  'Challans': { gu: 'ચલણો', en: 'Challans' },
  'Bills': { gu: 'બિલ', en: 'Bills' },
  'Ledger': { gu: 'ખાતાવહી', en: 'Ledger' },
  
  // Dashboard
  'Total Clients': { gu: 'કુલ ગ્રાહકો', en: 'Total Clients' },
  'Active Rentals': { gu: 'સક્રિય ભાડા', en: 'Active Rentals' },
  'Pending Returns': { gu: 'બાકી વળતર', en: 'Pending Returns' },
  'Total Stock': { gu: 'કુલ સ્ટોક', en: 'Total Stock' },
  'Low Stock Items': { gu: 'ઓછા સ્ટોક વસ્તુઓ', en: 'Low Stock Items' },
  'Pending Bills': { gu: 'બાકી બિલ', en: 'Pending Bills' },
  'Quick Actions': { gu: 'ઝડપી ક્રિયાઓ', en: 'Quick Actions' },
  'Recent Activity': { gu: 'તાજેતરની પ્રવૃત્તિ', en: 'Recent Activity' },
  
  // Forms
  'Client ID': { gu: 'ગ્રાહક ID', en: 'Client ID' },
  'Name': { gu: 'નામ', en: 'Name' },
  'Site': { gu: 'સાઇટ', en: 'Site' },
  'Mobile Number': { gu: 'મોબાઇલ નંબર', en: 'Mobile Number' },
  'Challan Number': { gu: 'ચલણ નંબર', en: 'Challan Number' },
  'Date': { gu: 'તારીખ', en: 'Date' },
  'Quantity': { gu: 'જથ્થો', en: 'Quantity' },
  'Notes': { gu: 'નોંધ', en: 'Notes' },
  'Save': { gu: 'સેવ કરો', en: 'Save' },
  'Cancel': { gu: 'રદ કરો', en: 'Cancel' },
  'Submit': { gu: 'સબમિટ કરો', en: 'Submit' },
  'Search': { gu: 'શોધો', en: 'Search' },
  'Add New': { gu: 'નવું ઉમેરો', en: 'Add New' },
  
  // Issue Challan
  'Issue Challan': { gu: 'ઉધાર ચલણ', en: 'Issue Challan' },
  'Select Client': { gu: 'ગ્રાહક પસંદ કરો', en: 'Select Client' },
  'Plate Size': { gu: 'પ્લેટ સાઇઝ', en: 'Plate Size' },
  'Quantity to Borrow': { gu: 'ઉધાર લેવાનો જથ્થો', en: 'Quantity to Borrow' },
  'Partner Stock Notes': { gu: 'પાર્ટનર સ્ટોક નોંધ', en: 'Partner Stock Notes' },
  'Create Challan': { gu: 'ચલણ બનાવો', en: 'Create Challan' },
  
  // Return Challan
  'Return Challan': { gu: 'જમા ચલણ', en: 'Return Challan' },
  'Return Date': { gu: 'વળતર તારીખ', en: 'Return Date' },
  'Quantity Returned': { gu: 'વળતર જથ્થો', en: 'Quantity Returned' },
  'Damage Notes': { gu: 'નુકસાન નોંધ', en: 'Damage Notes' },
  'Process Return': { gu: 'વળતર પ્રક્રિયા', en: 'Process Return' },
  
  // Stock
  'Available': { gu: 'ઉપલબ્ધ', en: 'Available' },
  'On Rent': { gu: 'ભાડે', en: 'On Rent' },
  'Total Quantity': { gu: 'કુલ જથ્થો', en: 'Total Quantity' },
  'Update Stock': { gu: 'સ્ટોક અપડેટ કરો', en: 'Update Stock' },
  
  // Status
  'Active': { gu: 'સક્રિય', en: 'Active' },
  'Completed': { gu: 'પૂર્ણ', en: 'Completed' },
  'Pending': { gu: 'બાકી', en: 'Pending' },
  'Paid': { gu: 'ચૂકવેલ', en: 'Paid' },
  'Overdue': { gu: 'મુદત વીતી', en: 'Overdue' },
  
  // Common
  'Loading': { gu: 'લોડ થઈ રહ્યું છે', en: 'Loading' },
  'Error': { gu: 'ભૂલ', en: 'Error' },
  'Success': { gu: 'સફળતા', en: 'Success' },
  'Warning': { gu: 'ચેતવણી', en: 'Warning' },
  'Confirm': { gu: 'પુષ્ટિ કરો', en: 'Confirm' },
  'Delete': { gu: 'ડિલીટ કરો', en: 'Delete' },
  'Edit': { gu: 'સંપાદિત કરો', en: 'Edit' },
  'View': { gu: 'જુઓ', en: 'View' },
  'Download': { gu: 'ડાઉનલોડ કરો', en: 'Download' },
  
  // Company
  'NO WERE TECH': { gu: 'NO WERE TECH', en: 'NO WERE TECH' },
  'Centering Plates Rental Service': { gu: 'સેન્ટરિંગ પ્લેટ્સ ભાડા સેવા', en: 'Centering Plates Rental Service' },
  
  // Weather
  'Weather': { gu: 'હવામાન', en: 'Weather' },
  'Temperature': { gu: 'તાપમાન', en: 'Temperature' },
  'Humidity': { gu: 'ભેજ', en: 'Humidity' },
  'Wind Speed': { gu: 'પવનની ઝડપ', en: 'Wind Speed' },
  
  // Custom overrides (always show Gujarati)
  'challan': { gu: 'ચલણ', en: 'ચલણ' },
  'udhar': { gu: 'ઉધાર', en: 'ઉધાર' },
  'jama': { gu: 'જમા', en: 'જમા' },
  'પતરા': { gu: 'પતરા', en: 'પતરા' }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'gu';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language === 'gu' ? 'gu-IN' : 'en-US';
  }, [language]);

  const translate = (key: string): string => {
    const translation = translations[key as keyof typeof translations];
    if (!translation) return key;
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

// Translation component for JSX
interface TProps {
  children: string;
  className?: string;
}

export function T({ children, className }: TProps) {
  const { translate } = useTranslation();
  return <span className={className}>{translate(children)}</span>;
}