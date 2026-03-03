import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://etritssfuooruiiytrci.supabase.co';
const SUPABASE_ANON = 'sb_publishable_yun8DSeCVZZRN_XtC3TACQ_AF9hj-W3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});