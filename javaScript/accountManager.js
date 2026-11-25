import { supabase } from "./supabaseClient.js";

export async function signUp(
    email, password, firstName,
    lastName, username
) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: window.location.origin + "/index.html",
            data: {
                first_name: firstName,
                last_name: lastName,
                username: username
            }
        }
    });

    if (error) throw error;

    return data;
}

export async function signIn(email, password) {
    const { data, error } =
        await supabase.auth.signInWithPassword({
            email,
            password
        });

    if (error) throw error;

    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
}

export async function getCurrentUser() {
    const { data: { user }, error } =
        await supabase.auth.getUser();

    // A missing session is the normal signed-out state, not a page error.
    if (error?.name === "AuthSessionMissingError") return null;
    if (error) throw error;

    return user;
}

