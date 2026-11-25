//coded by APR

import { shopping, inventory } from "./state.js";
import { moneyFormat, showToast } from "./ui.js";
import { closeSearch, closeAccount } from "./panels.js";

import { addRemoteWishlistItem, removeRemoteWishlistItem } from "./wishlistSync.js";

import { getCurrentUser } from "./accountManager.js";

    //save
    export function saveCart(){
        localStorage.setItem("shoppingCart", JSON.stringify(shopping.shoppingCart));
    }

    export function saveWishlist(){
        localStorage.setItem("shoppingList", JSON.stringify(shopping.shoppingList));
    }

    //load
    export function loadCart(){
        shopping.shoppingCart = loadStoredProducts("shoppingCart", true);
    }

    export function loadWishlist(){
        shopping.shoppingList = loadStoredProducts("shoppingList");
    }

    function loadStoredProducts(key, isCart = false) {
        try {
            const stored = JSON.parse(localStorage.getItem(key) || "[]");
            if (!Array.isArray(stored)) return [];

            return stored.flatMap(saved => {
                if (!saved || typeof saved["Item#"] !== "string") return [];
                const product = inventory.inventory.find(item => item["Item#"] === saved["Item#"]);
                if (!product) return [];

                if (!isCart) return [{ ...product, CartQuantity: 1 }];

                const requested = Number(saved.CartQuantity) || 1;
                const max = Number(product.Stock) > 0 ? Number(product.Stock) : 1;
                const quantity = Math.max(1, Math.min(Math.floor(requested), max));
                return [{ ...product, CartQuantity: quantity }];
            });
        } catch (error) {
            console.warn(`Stored ${key} data is invalid; starting empty:`, error);
            return [];
        }
    }

    
    export function updateCartCount() {
        const count = document.getElementById("cartCount");
        if (!count) return;
        count.hidden = shopping.shoppingCart.length === 0;
        count.innerText = shopping.shoppingCart.length;
    }

    export function loadCartDisplay(){
        const selected = getActiveList();
        if (!selected) return;
        const {container, array, isCart} = selected;

        container.innerHTML = "";
        
        if (array.length == 0) {
            container.innerHTML = isCart ? 
                `<h2 id="emptyCart">Currently no items in your cart</h2>` :
                `<h2 id="emptyCart">Currently no items in your wishlist</h2>`;
            return;
        }

        for (const item of array) {
            container.innerHTML += buildCartRow(item, isCart);
        }
    }

    export function figureTotal() {
        const subtotal = document.getElementById("subtotalPrice");
        const savings = document.getElementById("savings");
        const tax = document.getElementById("taxPrice");
        const shipping = document.getElementById("shippingPrice");
        const total = document.getElementById("totalPrice");
        
        let subAmount = 0;
        let saveAmmount = 0;

        //subtotal
        for (const item of shopping.shoppingCart) {
            const price = item.Retail > 0 ? item.Retail : item.Price;
            const qty = item.CartQuantity || 1;

            subAmount += qty * price;

            if (item.Retail > 0) saveAmmount += item.Retail - getDiscount(item);
        }

        //tax
        const taxAmount = (subAmount - saveAmmount) * .08;

        //shipping
        const shippingAmount = updateShipping();

        //total
        const totalAmount = subAmount + taxAmount + shippingAmount - saveAmmount;

        subtotal.textContent = moneyFormat(subAmount);
        savings.textContent = saveAmmount > 0 ? "-" + moneyFormat(saveAmmount) : moneyFormat(saveAmmount);
        tax.textContent = moneyFormat(taxAmount);
        shipping.textContent = moneyFormat(shippingAmount);
        total.textContent = moneyFormat(totalAmount);
    }

    export function updateShipping(){
        return Number(document.getElementById("shippingMethod").value || 0);
    }

    export function cartQuantityAdj(itemNumber, direction) { 
        const item = shopping.shoppingCart.find(item => item["Item#"] === itemNumber);
        if (!item) return;

        const currentQuantity = item.CartQuantity || 1;
        const newQuantity = currentQuantity + direction;

        if (newQuantity < 1) return;

        if (newQuantity > item["Stock"]) {
            showToast(`Only ${item["Stock"]} available`);
            return;
        }

        item.CartQuantity = newQuantity;

        updateCart();    
    }

    export function checkCartItems() {
        for (const item of shopping.shoppingCart) {
            if (item["Stock"] === 0) moveToList(item);
        }
    }

    //add
    export function addToCartList(array, product, quantity=1) {
        //out of stock to wishlist shouldn't ever fire
        if (product["Stock"] === 0 && array == shopping.shoppingCart) {
            showToast("Out-of-Stock item added to wishlist.");
            addToCartList(shopping.shoppingList, product, 1);
            return;
        }

        const existingItem = array.find(item => item["Item#"] === product["Item#"]);

        if (existingItem) {
            array === shopping.shoppingCart ? 
                showToast("Item already in cart.") :
                showToast("Item already in wishlist.");
            return;
        }

        array.push({...product, CartQuantity: array === shopping.shoppingCart ? quantity : 1});

        if (array == shopping.shoppingCart) {
            saveCart();
            showToast("Item added to cart.");
        } else {
            syncWishlistChange(product["Item#"], true).then(() => {
                showToast(
                    product.Stock === 0
                        ? "Out-of-Stock item added to wishlist."
                        : "Item added to wishlist."
                );
            }).catch(error => {
                console.error("Wishlist sync failed:", error);
                const index = array.findIndex(item => item["Item#"] === product["Item#"]);
                if (index !== -1) array.splice(index, 1);
                loadCartDisplay();
                showToast(error.message || "Unable to save wishlist to your account.");
            });
        }
    }

    //move
    export function moveCartList(from, to, itemNumber) {
        const index = from.findIndex(item => item["Item#"] === itemNumber);
        if (index == -1) return;

        const [product] = from.splice(index, 1);
        const alreadyThere = to.some(item => item["Item#"] === itemNumber);

        if (!alreadyThere) {
            to.push({...product, CartQuantity: to === shopping.shoppingCart ? (product.CartQuantity || 1): 1});
        }

        updateCart();

        showToast(to === shopping.shoppingList 
            ? (alreadyThere ? "Item already in wishlist" : "Item moved to wishlist.")
            : (alreadyThere ? "Item already in cart" : "Item moved to cart."));
    }
    export function moveToCart(itemNumber){
        moveCartList(shopping.shoppingList, shopping.shoppingCart, itemNumber);
    }
    export function moveToList(itemNumber){
        moveCartList(shopping.shoppingCart, shopping.shoppingList, itemNumber);
    }

    //remove
    export async function removeCartList(array, itemNumber) {
        const index = array.findIndex(item => item["Item#"] === itemNumber);
        if (index == -1) return;

        if (array === shopping.shoppingList) {
            try {
                const isAccountWishlist = await syncWishlistChange(itemNumber, false);
                array.splice(index, 1);
                if (!isAccountWishlist) saveWishlist();
            } catch (error) {
                console.error("Wishlist removal failed:", error);
                showToast(error.message || "Unable to remove this item from your wishlist.");
                return;
            }
        } else {
            array.splice(index, 1);
            saveCart();
            updateCartCount();
            if (document.getElementById("subtotalPrice")) figureTotal();
        }

        loadCartDisplay();

        showToast(array == shopping.shoppingCart ? 
            "Item removed from cart." :
            "Item removed from wishlist.");
    }

    //helpers
    function updateCart() {
        checkCartItems();
        saveCart();
        saveWishlist();
        updateCartCount();
        loadCartDisplay();

        if (document.getElementById("subtotalPrice")) figureTotal();
    }

    export function getDiscount(item) {
        if (!item["Retail"]) return item["Price"];

        if (item["Item Discount"] > 0) return item["Retail"] * getPercentOff(item["Item Discount"]);
        else if (item["Brand Discount"] > 0) return item["Retail"] * getPercentOff(item["Brand Discount"]);
        else if (item["Cat Discount"] > 0) return item["Retail"] * getPercentOff(item["Cat Discount"]);
        return item["Price"];
    }
    function getPercentOff(price) {
        return (1 - (price/100));
    }

    function getActiveList() {
        const cart = document.getElementById("cartItems");
        const wishlist = document.getElementById("wishlistItems");

        if (cart) return { container: cart, array: shopping.shoppingCart, isCart: true };
        if (wishlist) return { container: wishlist, array: shopping.shoppingList, isCart: false};
        return null;
    }

    function buildCartRow(item, isCart) {
        const price = item.Retail > 0 ? item.Retail : item.Price;
        const sale = getDiscount(item);
        return `
            <div class="cartItem" data-item="${item["Item#"]}">
                <div class="cartImage">
                    <img src="inventory/inventory-images/${item["Product Image"]}">
                </div>

                <div class="cartInfo">
                    <a href="productPage.html?item=${item["Item#"].trim()}&category=${item["Category"]}">
                        <h4>${item["Product Name"]}</h4>
                    </a>
                    <p class="sku">${item["Item#"]}</p>
                    <div class="cartAction">
                        <!--${isCart ? `<button class="moveWish">Move to Wishlist</button>` :
                            item.Stock > 0 ? `<button class="moveCart">Move to Cart</button>` : ""}-->
                        <button class="cartRemove">Remove</button>
                    </div>
                </div>

                <div class="cartUnitPrice">
                    Price:
                    ${isCart ? `</br>` : " "}
                    ${isCart ? moneyFormat(price) : moneyFormat(sale)}
                </div>
                
                ${isCart ? `
                    <div class="quantityControls">
                        <label class="qLabel">Qty:</label>
                        <button class="decrease">-</button>
                        <span class="cartQuantity">${item.CartQuantity || 1}</span>
                        <button class="increase">+</button>
                    </div>
                    
                    <div class="cartPrice">
                        Subtotal:
                        </br>
                        ${moneyFormat((item.CartQuantity || 1) * price)}
                    </div>
                ` : ""}
            </div>
        `;
    }

    //listners
    export function addCartListners(container, product) {
        const addCart = container.querySelector("#addToCart");
        const addList = container.querySelector("#addToWish");
        const increase = container.querySelector(".increase");
        const decrease = container.querySelector(".decrease");
        const quantityDisplay = container.querySelector(".cartQuantity");

        if (increase && quantityDisplay) {
            increase.addEventListener("click", function(){
                let quantity = Number(quantityDisplay.textContent);

                if (quantity < product.Stock) quantityDisplay.textContent = quantity + 1;
                else showToast(`Only ${product.Stock} available`);
            });
        }

        if (decrease && quantityDisplay) {
            decrease.addEventListener("click", function(){
                let quantity = Number(quantityDisplay.textContent);

                if (quantity > 1) quantityDisplay.textContent = quantity - 1;
            });
        }

        if (addCart) {
            addCart.addEventListener("click", function() {
                const selectedQuantity = Number(quantityDisplay.textContent);
                addToCartList(shopping.shoppingCart, product, selectedQuantity);
                updateCartCount();
            });
        }

        if (addList) {
            addList.addEventListener("click", function() {
                addToCartList(shopping.shoppingList, product, 1);
            });
        }
    }

    export function cartItemListner() {
        const cart = document.getElementById("cartItems");
        const wishlist = document.getElementById("wishlistItems");
        if (!cart && !wishlist) return;

        const container = cart ? cart : wishlist;
        const array = cart ? shopping.shoppingCart : shopping.shoppingList;

        container.addEventListener("click", function(event){
            const cartItem = event.target.closest(".cartItem");
            if (!cartItem) return;

            const itemNumber = cartItem.dataset.item;

            if (event.target.classList.contains("cartRemove")){
                void removeCartList(array, itemNumber);
            } else if (event.target.classList.contains("moveWish")) {
                moveToList(itemNumber);
            } else if (event.target.classList.contains("moveCart")) {
                moveToCart(itemNumber);
            } else if (event.target.classList.contains("increase")) {
                cartQuantityAdj(itemNumber, 1);
            } else if (event.target.classList.contains("decrease")) {
                cartQuantityAdj(itemNumber, -1);
            }
        });

        if (document.getElementById("shippingMethod")) {
            console.log("changing shipping")
            document.getElementById("shippingMethod").addEventListener("change", function(){
                figureTotal();
            });
        }
    }

//functions used for cart box
    export function initializeCart() {
        const cartButton = document.getElementById("cartButton");
        const cartNavBox = document.getElementById("cartNavBox");
        console.log("init acc");

        if (!cartButton || !cartNavBox) return;

        console.log("init acc suc");

        cartButton.onclick = function(event) {
            event.stopPropagation();
            closeSearch();
            closeAccount();
            cartNavBox.classList.toggle("open");
        }

        cartNavBox.onclick = function(event){
            event.stopPropagation();
        };
    }

    async function syncWishlistChange(itemNumber, adding) {
        const user = await getCurrentUser();

        if (!user) {
            if (adding) saveWishlist();
            return false;
        }

        if (adding) {
            await addRemoteWishlistItem(itemNumber);
        } else {
            await removeRemoteWishlistItem(itemNumber);
        }

        return true;
    }
