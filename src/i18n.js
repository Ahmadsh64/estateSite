import i18next from 'i18next';

i18next.init({
  fallbackLng: 'he', // ברירת מחדל
  resources: {
    en: {
  "property": {
    "title": "Property Listings",
    "price": "Price",
    "rooms": "Rooms",
    "washingMachine": "Washing Machine",
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
    "searchButton": "Search 🔎"
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
    "washingMachine": "מכונת כביסה",
    "wifi": "WiFi",
    "parking": "חניה",
    "tv": "טלוויזיה"
  },
  "search": {
    "title": "חפש דירות",
    "description": "מצא את הדירה המושלמת מתוך מאות נכסים",
    "rooms": "חדרים",
    "location": "אזור",
    "amenities": "תוספות",
    "searchButton": "חפש 🔎"
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
