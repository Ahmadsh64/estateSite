-- בדיקת התאמה למבנה הטבלה contact_requests
-- הפעל את השאילתות האלה ב-SQL Editor של Supabase

-- 1. בדיקת מבנה הטבלה הנוכחי
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'contact_requests'
ORDER BY ordinal_position;

-- 2. בדיקת דוגמת נתונים
SELECT 
    id,
    full_name,
    email,
    phone,
    guests,
    check_in,
    check_out,
    special_requests,
    property_id,
    property_title,
    property_price,
    contacted,
    created_at
FROM contact_requests 
ORDER BY created_at DESC 
LIMIT 3;

-- 3. בדיקת מדיניות RLS
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'contact_requests';

-- 4. בדיקת הרשאות
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'contact_requests';

-- 5. בדיקת ספירת רשומות
SELECT COUNT(*) as total_records FROM contact_requests;

-- 6. בדיקת ערכים null
SELECT 
    COUNT(*) as total,
    COUNT(full_name) as has_name,
    COUNT(email) as has_email,
    COUNT(phone) as has_phone,
    COUNT(guests) as has_guests,
    COUNT(contacted) as has_contacted_status
FROM contact_requests;
