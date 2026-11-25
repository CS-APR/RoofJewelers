// Shared close helpers keep the account, cart, and search modules independent.
export function positionMobilePopover(panel, anchor) {
    if (!panel || !anchor) return;

    if (!window.matchMedia("(max-width: 600px)").matches) {
        panel.style.position = "";
        panel.style.top = "";
        panel.style.left = "";
        panel.style.right = "";
        return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    panel.style.position = "fixed";
    panel.style.top = `${Math.ceil(anchorRect.bottom + 8)}px`;
    panel.style.right = "auto";
    panel.style.left = "12px";

    const panelWidth = panel.getBoundingClientRect().width;
    const maxLeft = Math.max(12, window.innerWidth - panelWidth - 12);
    const alignedLeft = anchorRect.right - panelWidth;
    panel.style.left = `${Math.min(maxLeft, Math.max(12, alignedLeft))}px`;
}

export function closeSearch() {
    document.getElementById("searchBox")?.classList.remove("open");
}

export function closeCart() {
    document.getElementById("cartNavBox")?.classList.remove("open");
}

export function closeAccount() {
    document.getElementById("accountBox")?.classList.remove("open");
}
