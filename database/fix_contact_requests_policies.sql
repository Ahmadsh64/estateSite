-- תיקון מדיניות RLS לטבלת contact_requests
-- הפעל את זה ב-SQL Editor של Supabase

-- 1. מחק כל המדיניות הקיימות
DROP POLICY IF EXISTS "Anyone can insert contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Authenticated users can view contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Authenticated users can update contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Authenticated users can delete contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Only admins can update contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Only admins can delete contact requests" ON contact_requests;

-- 2. בטל RLS זמנית כדי לאפשר תיקון
ALTER TABLE contact_requests DISABLE ROW LEVEL SECURITY;

-- 3. הפעל RLS מחדש
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- 4. מדיניות INSERT - כל אחד יכול להוסיף בקשות (גם אורחים)
CREATE POLICY "Anyone can insert contact requests" ON contact_requests
    FOR INSERT 
    TO anon, authenticated
    WITH CHECK (true);

-- 5. מדיניות SELECT - רק משתמשים מאומתים יכולים לראות בקשות
CREATE POLICY "Authenticated users can view contact requests" ON contact_requests
    FOR SELECT 
    TO authenticated
    USING (true);

-- 6. מדיניות UPDATE - רק משתמשים מאומתים יכולים לעדכן בקשות
CREATE POLICY "Authenticated users can update contact requests" ON contact_requests
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. מדיניות DELETE - רק משתמשים מאומתים יכולים למחוק בקשות
CREATE POLICY "Authenticated users can delete contact requests" ON contact_requests
    FOR DELETE 
    TO authenticated
    USING (true);

-- 8. הרשאות מפורשות
GRANT INSERT ON contact_requests TO anon;
GRANT SELECT ON contact_requests TO authenticated;
GRANT UPDATE ON contact_requests TO authenticated;
GRANT DELETE ON contact_requests TO authenticated;

-- 9. הרשאות נוספות לטבלה
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 10. בדיקה שהמדיניות עובדת
-- נסה להכניס שורה חדשה:
-- INSERT INTO contact_requests (property_id, property_title, property_price, full_name, email, phone, guests, checkin_date, checkout_date) 
-- VALUES ('test-id', 'Test Property', 1000, 'Test User', 'test@test.com', '0501234567', 2, '2025-01-01', '2025-01-03');

-- ✅ המדיניות תוקנה!
-- עכשיו:
-- - אורחים יכולים לשלוח בקשות חדשות
-- - משתמשים מאומתים יכולים לראות, לעדכן ולמחוק בקשות

