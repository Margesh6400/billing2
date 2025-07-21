export interface PlateEntry {
  size: string;
  quantity: number;
  notes?: string;
  damaged_quantity?: number;
  lost_quantity?: number;
}

export interface Client {
  id: string;
  name: string;
  site: string;
  mobile: string;
}

export interface ChallanData {
  type: 'issue' | 'return';
  challan_number: string;
  date: string;
  client: Client;
  plates: PlateEntry[];
  total_quantity: number;
}

export const COMPANY_INFO = {
  name: 'NO WERE TECH',
  subtitle: 'Centering Plates Rental Service',
  address: 'Your Address Here',
  phone: 'Your Phone Number',
  email: 'your.email@example.com',
  website: 'www.nowheretech.com'
};
