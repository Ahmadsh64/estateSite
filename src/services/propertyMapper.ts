// services/propertyMapper.ts
import { Property } from "../types/property";

export function mapDbToProperty(dbRow: any): Property {
  return {
    id: dbRow.id,
    title: dbRow.title,
    price: Number(dbRow.price),
    location: {
      city: dbRow.city,
      street: dbRow.street,
      number: dbRow.number,
      floor: dbRow.floor,
    },
    description: dbRow.description,
    images: dbRow.images || [],
    occupancy: dbRow.occupancy,
    bedrooms: dbRow.bedrooms,
    beds: dbRow.beds,
    bathrooms: dbRow.bathrooms,
    kitchen: dbRow.kitchen,
    washingMachine: dbRow.washingmachine,
    wifi: dbRow.wifi,
    tv: dbRow.tv,
    publictransportnearby: dbRow.publictransportnearby,
    parking: dbRow.parking,
    checkInTime: dbRow.checkintime,
    checkOutTime: dbRow.checkouttime,
    minStayDays: dbRow.minstaydays,
    type: dbRow.type,
    is_active: dbRow.is_active,
    created_at: dbRow.created_at,
    has_pool: dbRow.has_pool, // בריכה
    has_private_pool: dbRow.has_private_pool, // בריכה פרטית
    has_jacuzzi: dbRow.has_jacuzzi, // ג'קוזי
    has_grill: dbRow.has_grill, // מנגל
    suitable_for: dbRow.suitable_for || [], // מתאים ל
    nearby: dbRow.nearby || [], // בקרבת המקום
    rating: dbRow.rating || 0, // דירוג
    reviews_count: dbRow.reviews_count || 0, // חוות דעת
    phone: dbRow.phone || "", // טלפון
    whatsapp: dbRow.whatsapp || "", // WhatsApp
  };
}

export function mapPropertyToDb(property: Property) {
  return {
    id: property.id,
    title: property.title,
    price: property.price,
    city: property.location.city,
    street: property.location.street,
    number: property.location.number,
    floor: property.location.floor,
    description: property.description,
    images: property.images,
    occupancy: property.occupancy,
    bedrooms: property.bedrooms,
    beds: property.beds,
    bathrooms: property.bathrooms,
    kitchen: property.kitchen,
    washingmachine: property.washingMachine,
    wifi: property.wifi,
    tv: property.tv,
    publictransportnearby: property.publictransportnearby,
    parking: property.parking,
    checkintime: property.checkInTime,
    checkouttime: property.checkOutTime,
    minstaydays: property.minStayDays,
    type: property.type,
    is_active: property.is_active ?? true,
    has_pool: property.has_pool, // בריכה
    has_private_pool: property.has_private_pool, // בריכה פרטית
    has_jacuzzi: property.has_jacuzzi, // ג'קוזי
    has_grill: property.has_grill, // מנגל
    suitable_for: property.suitable_for, // מתאים ל
    nearby: property.nearby, // בקרבת המקום
    rating: property.rating, // דירוג
    reviews_count: property.reviews_count, // חוות דעת
    phone: property.phone, // טלפון
    whatsapp: property.whatsapp, // WhatsApp
  };
}
