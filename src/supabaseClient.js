import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://exnsylhgwjvpphistxqz.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4bnN5bGhnd2p2cHBoaXN0eHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE5OTYsImV4cCI6MjA3MTc5Nzk5Nn0.AsiFY7yVDlJqou7naHbqLMS75AqNJlE5JNpC3hmnsLc"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
