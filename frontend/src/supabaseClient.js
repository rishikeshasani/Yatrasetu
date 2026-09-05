import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pexmnvicqyturozigmge.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_P5mhf2mfTfngmq7FSeMLQg_l_4Z1w7N';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
