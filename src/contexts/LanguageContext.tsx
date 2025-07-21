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
  
  // Dashboard specific
  'સેન્ટરિંગ પ્લેટ્સ ભાડા': { gu: 'સેન્ટરિંગ પ્લેટ્સ ભાડા', en: 'Centering Plates Rental' },
  'ઉધાર ચાલતી છે': { gu: 'ઉધાર ચાલતી છે', en: 'Active Udhar' },
  'બાકી જમા': { gu: 'બાકી જમા', en: 'Pending Returns' },
  'ભાડે પ્લેટ્સ': { gu: 'ભાડે પ્લેટ્સ', en: 'On-Rent Plates' },
  'કુલ ગ્રાહકો': { gu: 'કુલ ગ્રાહકો', en: 'Total Clients' },
  'કમસ્ટોક પ્લેટ્સ': { gu: 'કમસ્ટોક પ્લેટ્સ', en: 'Low Stock Plates' },
  'ઝડપી ક્રિયાઓ': { gu: 'ઝડપી ક્રિયાઓ', en: 'Quick Actions' },
  'ઉધાર ચલણ બનાવો': { gu: 'ઉધાર ચલણ બનાવો', en: 'Create Udhar Challan' },
  'જમા ચલણ બનાવો': { gu: 'જમા ચલણ બનાવો', en: 'Create Jama Challan' },
  'નવો ગ્રાહક': { gu: 'નવો ગ્રાહક', en: 'Add Client' },
  'સ્ટોક સુધારો': { gu: 'સ્ટોક સુધારો', en: 'Edit Stock' },
  'તાજેતરની પ્રવૃત્તિ': { gu: 'તાજેતરની પ્રવૃત્તિ', en: 'Recent Activity' },
  'ચલતી છે': { gu: 'ચલતી છે', en: 'Active' },
  'પરત': { gu: 'પરત', en: 'Returned' },
  'બધી પ્રવૃત્તિ જુઓ': { gu: 'બધી પ્રવૃત્તિ જુઓ', en: 'View All Activity' },
  'મુદત વીતી ગઈ છે': { gu: 'મુદત વીતી ગઈ છે', en: 'Overdue' },
  'પ્લેટ્સ પરત કરવાનો સમય થયો છે': { gu: 'પ્લેટ્સ પરત કરવાનો સમય થયો છે', en: 'Time to return plates' },
  'સ્ટોક ઓછો છે': { gu: 'સ્ટોક ઓછો છે', en: 'Stock is low' },
  'માત્ર': { gu: 'માત્ર', en: 'Only' },
  'પ્લેટ્સ બાકી છે': { gu: 'પ્લેટ્સ બાકી છે', en: 'plates remaining' },
  'હમણાં જ': { gu: 'હમણાં જ', en: 'Just now' },
  'કલાક પહેલાં': { gu: 'કલાક પહેલાં', en: 'hours ago' },
  'દિવસ પહેલાં': { gu: 'દિવસ પહેલાં', en: 'days ago' },
  'કોઈ તાજેતરની પ્રવૃત્તિ નથી': { gu: 'કોઈ તાજેતરની પ્રવૃત્તિ નથી', en: 'No recent activity' },
  'નવું ચલણ બનાવવા માટે શરૂ કરો': { gu: 'નવું ચલણ બનાવવા માટે શરૂ કરો', en: 'Start by creating a new challan' },
  'મેનુ': { gu: 'મેનુ', en: 'Menu' },
  'વપરાશકર્તા': { gu: 'વપરાશકર્તા', en: 'User' },
  'ઇમેઇલ બતાવો': { gu: 'ઇમેઇલ બતાવો', en: 'Show Email' },
  'સેટિંગ્સ': { gu: 'સેટિંગ્સ', en: 'Settings' },
  'સાઇન આઉટ': { gu: 'સાઇન આઉટ', en: 'Sign Out' },
  
  // Challan Management
  'Challan Management': { gu: 'ચલણ વ્યવસ્થાપન', en: 'Challan Management' },
  'Udhar Challans': { gu: 'ઉધાર ચલણ', en: 'Udhar Challans' },
  'Jama Challans': { gu: 'જમા ચલણ', en: 'Jama Challans' },
  'Challan Number': { gu: 'ચલણ નંબર', en: 'Challan Number' },
  'Challan Date': { gu: 'ચલણ તારીખ', en: 'Challan Date' },
  'Client Name': { gu: 'ગ્રાહકનું નામ', en: 'Client Name' },
  'Client Details': { gu: 'ગ્રાહક વિગતો', en: 'Client Details' },
  'Plate Details': { gu: 'પ્લેટ વિગતો', en: 'Plate Details' },
  'plates': { gu: 'પ્લેટ્સ', en: 'plates' },
  'Downloading...': { gu: 'ડાઉનલોડ થઈ રહ્યું છે...', en: 'Downloading...' },
  
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
  'Menu': { gu: 'મેનુ', en: 'Menu' },
  'Settings': { gu: 'સેટિંગ્સ', en: 'Settings' },
  'Sign Out': { gu: 'સાઇન આઉટ', en: 'Sign Out' },
  'Show Email': { gu: 'ઇમેઇલ બતાવો', en: 'Show Email' },
  'User': { gu: 'વપરાશકર્તા', en: 'User' },
  
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
    return (saved as Language) || 'gu'; // Default to Gujarati
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