import { supabase } from "./supabaseClient.js";
import { inventory, shopping } from "./state.js";
import { getCurrentUser } from "./accountManager.js";

const GUEST_KEY = "shoppingList";
const ACCOUNT_KEY = "accountWishlist";

// Get the current authenticated user
async function currentUser() {
    return getCurrentUser();
}

// Read the local guest wishlist
function getGuestItems() {
    try {
        const items = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
        return Array.isArray(items) ? items.filter(item =>
            item && typeof item["Item#"] === "string"
        ) : [];
    } catch (error) {
        console.warn("Stored guest wishlist is invalid; starting empty:", error);
        localStorage.removeItem(GUEST_KEY);
        return [];
    }
}

// Download wishlist item numbers
async function getRemoteItems(user) {
    const { data, error } = await supabase
        .from("wishlist_items")
        .select("item_number")
        .eq("user_id", user.id);

    if (error) throw error;

    return data.map(row => row.item_number);
}

// Convert item numbers into current inventory objects
function resolveProducts(itemNumbers) {
    return itemNumbers
        .map(number =>
            inventory.inventory.find(
                item => item["Item#"] === number
            )
        )
        .filter(Boolean);
}

// Merge the guest wishlist into the account
export async function mergeGuestWishlist() {
    const user = await currentUser();

    if (!user) throw new Error("You must be signed in to sync a wishlist.");

    const guestItems = getGuestItems();

    if (guestItems.length > 0) {
        const rows = guestItems.map(item => ({
            user_id: user.id,
            item_number: item["Item#"]
        }));

        const { error } = await supabase
            .from("wishlist_items")
            .upsert(rows, {
                onConflict: "user_id,item_number",
                ignoreDuplicates: true
            });

        if (error) throw error;
    }

    const itemNumbers = await getRemoteItems(user);
    shopping.shoppingList = resolveProducts(itemNumbers);
    saveAccountCache(user.id, itemNumbers);

    // Keep the guest copy until both the merge and reload succeed.
    localStorage.removeItem(GUEST_KEY);
}

// Load the signed-in user's wishlist
export async function loadAccountWishlist() {
    const user = await currentUser();

    if (!user) throw new Error("You must be signed in to load an account wishlist.");

    const itemNumbers = await getRemoteItems(user);

    shopping.shoppingList = resolveProducts(itemNumbers);

    saveAccountCache(user.id, itemNumbers);
}

function saveAccountCache(userId, itemNumbers) {
    try {
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ userId, items: itemNumbers }));
    } catch (error) {
        console.warn("Could not cache the account wishlist locally:", error);
    }
}

// Add an item to Supabase
export async function addRemoteWishlistItem(itemNumber) {
    const user = await currentUser();

    if (!user) throw new Error("You must be signed in to update the account wishlist.");

    const { error } = await supabase
        .from("wishlist_items")
        .upsert({
            user_id: user.id,
            item_number: itemNumber
        }, {
            onConflict: "user_id,item_number",
            ignoreDuplicates: true
        });

    if (error) throw error;
}

// Remove an item from Supabase
export async function removeRemoteWishlistItem(itemNumber) {
    const user = await currentUser();

    if (!user) throw new Error("You must be signed in to update the account wishlist.");

    const { data, error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("user_id", user.id)
        .eq("item_number", itemNumber)
        .select("item_number");

    if (error) throw error;
    if (!data?.some(row => String(row.item_number) === String(itemNumber))) {
        throw new Error("The wishlist item was not deleted. Check the wishlist DELETE policy.");
    }

    try {
        const cached = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
        if (cached?.userId === user.id && Array.isArray(cached.items)) {
            saveAccountCache(user.id, cached.items.filter(number => number !== itemNumber));
        }
    } catch (cacheError) {
        console.warn("Could not update the local account wishlist cache:", cacheError);
    }
}

// Handle sign-out
export function clearAccountWishlist() {
    localStorage.removeItem(ACCOUNT_KEY);
    shopping.shoppingList = [];
}
