// Shared close helpers keep the account, cart, and search modules independent.
export function closeSearch() {
    document.getElementById("searchBox")?.classList.remove("open");
}

export function closeCart() {
    document.getElementById("cartNavBox")?.classList.remove("open");
}

export function closeAccount() {
    document.getElementById("accountBox")?.classList.remove("open");
}
