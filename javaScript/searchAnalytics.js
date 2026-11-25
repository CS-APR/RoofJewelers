import { supabase } from "./supabaseClient.js";

export async function recordSearch(term, resultCount) {
    const searchTerm = term.trim();

    if (searchTerm.length < 2) return;

    const { error } = await supabase.functions.invoke(
        "record-search",
        {
            body: {
                searchTerm,
                resultCount
            }
        }
    );

    if (error) {
        console.warn("Search analytics unavailable:", error);
    }
}