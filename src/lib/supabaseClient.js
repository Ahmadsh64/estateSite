// supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// טוען את משתני הסביבה מקובץ .env
dotenv.config();

// משתמש במשתנים מתוך .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);