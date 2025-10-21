-- מחיקת הטבלה הקיימת (אם קיימת)
DROP TABLE IF EXISTS properties CASCADE;

-- יצירת הטבלה מחדש
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  price NUMERIC NOT NULL,
  city TEXT NOT NULL,
  street TEXT,
  number TEXT,
  floor TEXT,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  occupancy INTEGER,
  bedrooms INTEGER,
  beds INTEGER,
  bathrooms INTEGER,
  kitchen BOOLEAN DEFAULT false,
  washingmachine BOOLEAN DEFAULT false,
  wifi BOOLEAN DEFAULT false,
  tv BOOLEAN DEFAULT false,
  publictransportnearby BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  checkintime TEXT,
  checkouttime TEXT,
  minstaydays INTEGER DEFAULT 1,
  type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  has_pool BOOLEAN DEFAULT false,
  has_private_pool BOOLEAN DEFAULT false,
  has_jacuzzi BOOLEAN DEFAULT false,
  has_grill BOOLEAN DEFAULT false,
  suitable_for TEXT[] DEFAULT '{}',
  nearby TEXT[] DEFAULT '{}',
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  phone TEXT,
  whatsapp TEXT
);

-- יצירת אינדקסים לביצועים
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_is_active ON properties(is_active);
CREATE INDEX idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX idx_properties_price ON properties(price);

-- הפעלת RLS (Row Level Security)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- מדיניות לקריאה - כולם יכולים לקרוא נכסים פעילים
CREATE POLICY "Enable read access for all users" ON properties
  FOR SELECT
  USING (is_active = true);

-- מדיניות לכתיבה - רק משתמשים מאומתים יכולים להוסיף/לערוך/למחוק
CREATE POLICY "Enable insert for authenticated users only" ON properties
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON properties
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON properties
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Trigger לעדכון updated_at אוטומטי
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- הצלחה!
SELECT 'Table properties created successfully!' AS message;

