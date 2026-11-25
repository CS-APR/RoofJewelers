//Coded by APR

import { closeSearch, closeCart } from "./panels.js";
import { loadCartDisplay, loadWishlist } from "./cart.js";
import { signIn, signOut } from "./accountManager.js";
import { showToast } from "./ui.js";
import { mergeGuestWishlist, clearAccountWishlist } from "./wishlistSync.js";

let refreshAccountMenu = async () => {};

export function setAccountMenuRefresher(refresher) {
    refreshAccountMenu = refresher;
}

//functions used for the account box
    export function initializeAccount() {
        const accountButton = document.getElementById("accountButton");
        const accountBox = document.getElementById("accountBox");

        if (!accountButton || !accountBox) return;

        accountButton.onclick = function(event) {
            event.stopPropagation();
            closeSearch();
            closeCart();
            accountBox.classList.toggle("open");
        }

        accountBox.onclick = function(event){
            event.stopPropagation();
        };

        const showPassword = document.getElementById("showPassword");
        if (showPassword) showPassword.addEventListener("change", viewPassword);

        initializeLogin();
        initializeLogout();
        
    }

    function viewPassword() {
        const password = document.getElementById("passwordSignIn");
        const show = document.getElementById("showPassword");
        
        password.type = show.checked ? "text" : "password";
        
    }

    async function login() {
        const email = document.getElementById("emailSignIn").value.trim();
        const password = document.getElementById("passwordSignIn").value;

        let signedInUser;
        try {
            const result = await signIn(email, password);
            signedInUser = result.user;
        } catch (error) {
            console.error(error);
            showToast(error.message || "Sign in failed.");
            return;
        }

        let wishlistSyncFailed = false;
        try {
            await mergeGuestWishlist();
        } catch (error) {
            wishlistSyncFailed = true;
            console.error("Signed in, but wishlist synchronization failed:", error);
        }

        try {
            await refreshAccountMenu(signedInUser);
        } catch (error) {
            console.error("Could not refresh the account menu:", error);
        }

        loadCartDisplay();
        showToast(wishlistSyncFailed
            ? "Signed in, but your wishlist could not sync. Try again later."
            : "Signed in successfully!");
    }

    async function logout() {
        try {
            await signOut();

            clearAccountWishlist();
            loadWishlist();

            await refreshAccountMenu();
            loadCartDisplay();

            showToast("Signed out successfully.");

        } catch (error) {
            console.error(error);
            showToast("Sign out failed.");
        }
    }

    function initializeLogin() {
        const button = document.getElementById("signInButton");

        if (!button) return;

        button.addEventListener("click", login);
    }

    function initializeLogout() {
        const button = document.getElementById("signOutButton");

        if (!button) return;

        button.addEventListener("click", logout);
    }
