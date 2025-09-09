// types/property.ts

export interface Location {
  city: string;
  street?: string;
  number?: string;
  floor?: string;
}

export interface Property {
  id: string;
  title: string;
  price: number;
  location: Location;  
  description?: string;
  images: string[];
  occupancy?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  kitchen?: boolean;
  washingmachine?: boolean;
  wifi?: boolean;
  tv?: boolean;
  publictransportnearby?: boolean;
  parking?: boolean;
  checkintime?: string;
  checkouttime?: string;
  minstaydays?: number;
  type?: string;
  [key: string]: any; // מאפשר להוסיף שדות חדשים בקלות
}
