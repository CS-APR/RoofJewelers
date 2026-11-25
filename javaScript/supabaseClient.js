import { createClient } from
    "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://isksoacjhhznbqhgymwp.supabase.co";
const SUPABASE_KEY = "sb_publishable_QH6x_HqnDAMh3t2PMn2ujg_9c-E6lcl";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);