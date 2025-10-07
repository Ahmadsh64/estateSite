-- הגדרת טבלת contact_requests - הכל בקובץ אחד
-- הפעל את זה ב-SQL Editor של Supabase

-- 1. יצירת הטבלה
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL,
  property_title TEXT NOT NULL,
  property_price INTEGER NOT NULL DEFAULT 0,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  special_requests TEXT DEFAULT '',
  wants_offers BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- 2. יצירת אינדקסים
CREATE INDEX IF NOT EXISTS idx_contact_requests_property_id ON contact_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON contact_requests(email);

-- 3. טריגר לעדכון זמן
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contact_requests_updated_at 
    BEFORE UPDATE ON contact_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. מחק מדיניות קיימת אם יש
DROP POLICY IF EXISTS "Anyone can insert contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Authenticated users can view contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Only admins can update contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Only admins can delete contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Authenticated users can update contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Authenticated users can delete contact requests" ON contact_requests;

-- 5. הפעלת RLS
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- 6. מדיניות פשוטה - כל אחד יכול להוסיף בקשות
CREATE POLICY "Anyone can insert contact requests" ON contact_requests
    FOR INSERT 
    TO anon, authenticated
    WITH CHECK (true);

-- 7. רק משתמשים מאומתים יכולים לראות בקשות
CREATE POLICY "Authenticated users can view contact requests" ON contact_requests
    FOR SELECT 
    TO authenticated
    USING (true);

-- 8. רק משתמשים מאומתים יכולים לעדכן בקשות
CREATE POLICY "Authenticated users can update contact requests" ON contact_requests
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 9. רק משתמשים מאומתים יכולים למחוק בקשות
CREATE POLICY "Authenticated users can delete contact requests" ON contact_requests
    FOR DELETE 
    TO authenticated
    USING (true);

-- 10. הרשאות
GRANT ALL ON contact_requests TO anon;
GRANT ALL ON contact_requests TO authenticated;

-- ✅ סיום! הטבלה מוכנה לשימוש
-- בדיקה מהירה:
-- SELECT COUNT(*) FROM contact_requests;

