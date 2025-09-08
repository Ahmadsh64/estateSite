import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://uhvdtumhgllcypfoogdy.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodmR0dW1oZ2xsY3lwZm9vZ2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTI5MDAsImV4cCI6MjA3MjgyODkwMH0.Dm4oLq302u7qV2R6srF8ejBoxuYE2LfdMFSpcM2g9as"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
