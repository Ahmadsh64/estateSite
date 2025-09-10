import i18next from 'i18next';

i18next.init({
  fallbackLng: 'he', // ברירת מחדל
  resources: {
    en: {
  "property": {
    "title": "Property Listings",
    "price": "Price",
    "rooms": "Rooms",
    "washingmachine": "Washing Machine",
    "wifi": "Wi-Fi",
    "parking": "Parking",
    "tv": "TV"
  },
  "search": {
    "title": "Search for Properties",
    "description": "Find the perfect property from hundreds of listings",
    "rooms": "Rooms",
    "location": "Location",
    "amenities": "Amenities",
    "price": "Price",
    "searchButton": "Search 🔎",
    "apartments": "דירות",
    "houses": "בתים",
    "cabins": "בקתות",
    "villas": "וילות",
    "hotels": "מלונות",
    "attractions": "אטרקציות",
    "camping": "קמפינג",
  },
  "admin": {
    "login": "Admin Login"
  }
},
    he: {
      translation: {
  "property": {
    "title": "רשימת דירות",
    "price": "מחיר",
    "rooms": "חדרים",
    "washingmachine": "מכונת כביסה",
    "wifi": "WiFi",
    "parking": "חניה",
    "tv": "טלוויזיה",
    "apartments": "דירות",
    "hotels": "מלונות",
    "houses": "בתים",
    "cabins": "בקתות",
    "villas": "וילות",
    "attractions": "אטרקציות",
    "camping": "קמפינג",
},
  "search": {
    "title": "חפש דירות",
    "description": "מצא את הדירה המושלמת מתוך מאות נכסים",
    "rooms": "חדרים",
    "location": "אזור",
    "amenities": "תוספות",
    "searchButton": "חפש 🔎",
    "occupancy": "אנשים",
    "price": "מחיר",
    "checkouttime": "תאריך יציאה",
    "checkintime": "תאריך כניסה",
    "apartments": "דירות",
    "houses": "בתים",
    "cabins": "בקתות",
    "hotels": "מלונות",
    "villas": "וילות",
    "attractions": "אטרקציות",
    "camping": "קמפינג",
  },
  "admin": {
    "login": "כניסת מנהל"
  }
}

    }
  },
  interpolation: {
    escapeValue: false
  }
});

export default i18next;
