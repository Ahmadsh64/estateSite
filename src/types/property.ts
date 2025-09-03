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
  washingMachine?: boolean;
  wifi?: boolean;
  tv?: boolean;
  publicTransportNearby?: boolean;
  parking?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  minStayDays?: number;
  type?: string;
  [key: string]: any; // מאפשר להוסיף שדות חדשים בקלות
}
