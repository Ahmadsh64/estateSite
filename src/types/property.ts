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
  publicTransportNearby?: boolean;
  parking?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  minStayDays?: number;
  type?: string;
  has_pool?: boolean;             // בריכה
  has_private_pool?: boolean;      // בריכה פרטית
  hasJacuzzi?: boolean;          // ג'קוזי
  hasGrill?: boolean;            // מנגל
  suitableFor?: string[];        // מתאים ל: משפחות, דתיים, קבוצות
  nearby?: string[];             // בקרבת המקום: בית כנסת, מסעדות, תחבורה ציבורית
  rating?: number;               // דירוג
  reviewsCount?: number;         // מספר חוות דעת
  phone?: string;                // מספר טלפון
  whatsapp?: string;             // מספר WhatsApp
  [key: string]: any;            // מאפשר להוסיף שדות חדשים בקלות
}
