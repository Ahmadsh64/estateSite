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
    publicTransportNearby: dbRow.publictransportnearby,
    parking: dbRow.parking,
    checkInTime: dbRow.checkintime,
    checkOutTime: dbRow.checkouttime,
    minStayDays: dbRow.minstaydays,
    type: dbRow.type,
    is_active: dbRow.is_active,
    created_at: dbRow.created_at,
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
    publictransportnearby: property.publicTransportNearby,
    parking: property.parking,
    checkintime: property.checkInTime,
    checkouttime: property.checkOutTime,
    minstaydays: property.minStayDays,
    type: property.type,
    is_active: property.is_active ?? true,
  };
}
