//Coded by APR 2026

// helper functions
    async function loadHTML(id, file){ //takes the tag's id for insertion and the html file to be inserted
        const response = await fetch(file);

        const data = await response.text();

        document.getElementById(id).innerHTML = data;
    }
    //link building helper
    function buildlink(item){
        if(item.lslug) return `infoPage.html?lslug=${item.lslug}`;
        if(item.slug) return `catalog.html?slug=${item.slug}`;
        if(item.link) return item.link;

        return "#";
    }

//rule to open outside links in a new tab and not track where the user came from
function setupExternalLinks(){
    const links = document.querySelectorAll("a");

    links.forEach(link => {

        const href = link.getAttribute("href");

        /* skip empty links */
        if(!href) return;

        /* external link */
        if(
            href.startsWith("http") &&
            !href.includes(window.location.hostname)
        ){
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }
    });
}

//functions for the navigation bar
    /*function to load navigation bar */
    var navigation;
    async function loadNavigation(){
        const response = await fetch("navigation.json");
        navigation = await response.json();
    }
    function createMenu(items){
        var html = "";
        items.forEach(item => {
            /*item has dropdown*/
            if (item.showInNav === false) return;

            else if(item.children){
                html += `
                    <div class="tabitem">
                        <a href="${buildlink(item)}"> ${item.title}</a>

                        <div class="dropdown">
                            ${createSubMenu(item.children)}
                        </div>
                    </div>                
                `;
            }
            /* no children link */
            else {
                html += `
                    <div class="tabitem">
                        <a href="${buildlink(item)}">${item.title}</a>                
                    </div>
                `;
            }        
        });
        html += `
            <div class="tabitem">
                <div id="search"> 
                    <span> &#8981 </span> 
                    
                    <div id="searchBox">
                        <div> <input type="text" placeholder="Search" id="searchBar" value=""> </div>
                        <div id="execute"> Go </div>
                    </div>
                </div>             
            </div>
        `;

        return html;
    }
    function createSubMenu(items){
        var html = "";
        items.forEach(item => {
            if (item.showInNav === false) return;

            /*item has dropdown*/
            else if(item.children){
                html += `
                    <div class="dropdownitem">
                        <a href="${buildlink(item)}"> ${item.title}</a>

                        <div class="subdropdown">
                            ${createSubMenu(item.children)}
                        </div>
                    </div>
                `;
            }
            /* no children link */
            else {
                html += `               
                    <a href="${buildlink(item)}">${item.title}</a> 
                `;
            }        
        });

        return html;
    }

//functions for the use of the search bar
function initializeSearch(){
    const search = document.getElementById("search");
    const searchBox = document.getElementById("searchBox");
    const execute = document.getElementById("execute");
    const searchBar = document.getElementById("searchBar");

    if(!search || !searchBox) return;

    search.onclick = function(event){
        event.stopPropagation();

        searchBox.classList.toggle("open");
    };

    document.addEventListener(
        "click",
        function(){ searchBox.classList.remove("open"); }
    );
    searchBox.onclick = function(event){
        event.stopPropagation();
    };

    execute.addEventListener( 
        "click",
        function(){ runSearch(); }
    );
    searchBar.addEventListener(//allows for enter key to execute search
        "keydown",
        function(event){
            if(event.key === "Enter") runSearch();
        }
    );
}

function runSearch(){ //main function to search through inventory
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    var category = findByProperty(navigation, "slug", slug);
    var catName = document.getElementById("cat-name");

    if(!slug){
        window.location.href =
            "catalog.html?slug=showroom&search=" +
            encodeURIComponent(getSearchPrompt());
        return;
    }

    var prompt = getSearchPrompt();
    searchResults = [];
    currentPage = 1;//reset page
    rebuildActiveInventory();

    if (prompt.trim() === "") {//when empty search is run
        sortedInventory = null;
        searchResults = null;
        currentPage = 1;
        rebuildActiveInventory();
        renderAtributeTab();
        initializeAttributeBar();
        catName.textContent = category.title;
        return;
    }

    searchItem(prompt);

    getMaxPrice(getCurrentInventory());

    const maxSlider = document.getElementById("maxPrice");
    const minSlider = document.getElementById("minPrice");
    const maxValue = document.getElementById("maxValue");
    const maxInput = document.getElementById("maxInput");

    if(maxSlider){
        maxSlider.max = MaxSortPrice;
        maxSlider.value = MaxSortPrice;
    }

    if(maxValue) maxValue.textContent = MaxSortPrice;
    if(maxInput) maxInput.value = MaxSortPrice;

    minSlider.value = 0;
    resetPage = true;
    updatePriceRange();

    catName.textContent = category.title + " search results for: \"" + prompt + "\"";

}
function getSearchPrompt(){
    return document.getElementById("searchBar").value;
}

function searchItem(prompt){ 
    const lowerPrompt = prompt.toLowerCase();
    const searchPool = catInventory.length > 0 ? catInventory : inventory; 
    const terms = lowerPrompt.split(" ");

    for (const item of searchPool) {
        const itemNum = item["Item#"].toLowerCase();
        if (itemNum.includes(lowerPrompt)) searchResults.push(item);
    }
    const rankedResults = [];
    for (const item of searchPool) { 
        const itemName = (item["Product Name"] || "").toLowerCase(); 
        const itemDesc = (item["Description"] || "").toLowerCase();

        var score = 0;
        const itemWords = itemName.split(/\s+/);
        
        var matches = terms.every(term => { 
            var singular = term;
            
            if (term.endsWith("ies")) singular = term.slice(0, -3) + "y"; 
            else if (term.endsWith("es")) singular = term.slice(0, -2);
            else if (term.endsWith("s")) singular = term.slice(0,-1); 
            if (term == "carat") term = "ct";
            if (term == "karat") term = "k";
            
            const found = ( itemName.includes(term) || 
            itemName.includes(singular) || 
            itemDesc.includes(term) || 
            itemDesc.includes(singular) ); 

            if(found){
                if (itemWords.includes(term)) score += 1000; 
                if (itemName.includes(lowerPrompt)) score += 90;
                if (itemName.includes(term) ) score += 80;
                if (itemName.includes(singular) ) score += 60;
                if (itemDesc.includes(term) ) score += 40;
                if (itemDesc.includes(singular) ) score += 20;
            }

            return found;
        }) 
        if(matches) rankedResults.push({item, score}); 

        rankedResults.sort( (a,b) => b.score - a.score );
        searchResults = rankedResults.map( result => result.item);
    } 
    rebuildActiveInventory(); 
}

function rebuildActiveInventory(){
    if(sortedInventory !== null){
        activeInventory = sortedInventory;
    } else if(searchResults !== null){
        activeInventory = searchResults;
    } else {
        activeInventory = catInventory.length > 0
            ? catInventory
            : inventory;
    }

    updateValues(activeInventory);
    renderCatalog(activeInventory);
}

function getCurrentInventory(){
    if(searchResults !== null){
        return searchResults;
    }
    return catInventory.length > 0
        ? catInventory
        : inventory;
}


//functions for the use of config.json file
    let CONFIG = {}
    async function loadconfig(){
        const response = await fetch("config.json");

        CONFIG = await response.json();
    }
    function applyConfig(){
        const elements = document.querySelectorAll("[data-config]");

        elements.forEach(element => {
            const key = element.dataset.config;

            if(CONFIG[key]) element.textContent = CONFIG[key];       
        });

        const links = document.querySelectorAll("[data-config-link]");

        links.forEach(link => {
            const key = link.dataset.configLink;

            if(CONFIG[key]) link.href = CONFIG[key];
        });
    }

//find by functions
    function findByProperty(items, property, value){
        for (const item of items) {
            if (item[property] === value) return item;

            if (item.children && item.children.length > 0) {
                const result = findByProperty(item.children, property, value);

                if (result) return result;
            }
        }

        return null;
    }

// render page functions
    function renderCatalogPage(category){
        document.getElementById("cat-name").textContent = category.title;
        document.getElementById("page-title").textContent = "Roof Jewelers | " + category.title;
        document.querySelector('meta[name="description"]').content = category.description;
    }
    function renderInfoPage(category){
        document.getElementById("page-title").textContent = "Roof Jewelers | " + category.title;
        document.querySelector('meta[name="description"]').content = category.description;
    }

//catalog page subheader funtions
    //functions for treepath
    function trackCategoryPath(items, slug, path = []){
        for (const item of items) {

            const newpath = [...path,item];

            if (item.slug === slug) return newpath;

            if (item.children && item.children.length > 0) {
                const result = trackCategoryPath(item.children, slug, newpath);

                if (result) return result;
            }
        }

        return null;
    }
    function buildPathLink(item){
        console.log(categorySlug);
        console.log(item.slug);
        if(item.lslug) return `infoPage.html?lslug=${item.lslug}`;
        if(item.slug === categorySlug) return `catalog.html?slug=${item.slug}&page=${currentCatalogPage}`;
        else return `catalog.html?slug=${item.slug}`;
        if(item.link) return item.link;
        return "#";
    }
    function renderCategoryPath(path){ //builds tree bar for category page
        const params = new URLSearchParams(window.location.search);
        const treebar = document.getElementById("tree-bar");

        var html = `
            <a href="index.html">Home</a>
        `;

        path.forEach((item, index) => {
            const islast = index === path.length - 1;

            if(!params.get("item")){
                if(islast){
                    html += `
                        &nbsp;>&nbsp;
                        
                        <strong>${item.title}</strong>
                    `;
                } else {                 
                    html += `
                        &nbsp;>&nbsp;
                    `;

                    var href = buildPathLink(item);
                    if (href) {
                        html += `
                            <a href="${href}">${item.title}</a> 
                        `;
                    } else {
                        html += `
                            ${item.title}
                        `;
                    }          
                }
            } else {         
                html += `
                    &nbsp;>&nbsp;
                `;

                var href = buildPathLink(item);
                if (href) {
                    html += `
                        <a href="${href}">${item.title}</a> 
                    `;
                } else {
                    html += `
                        ${item.title}
                    `;
                }                         
            }
        })//end foreach

        if (params.get("item")){
            html += `
                &nbsp;>
            `;
        }

        treebar.innerHTML = html;
    }

    //functions for category boxes
    function getSubCategories(category){
        var html = "";
        if(category.children) {
            html += `
                    <h3 id="cat-header">CATEGORIES</h3>              
                `;
            const children = category.children;

            for (const child of children) {
                var href = buildlink(child);
                if (href){
                    html += `
                        <div><a href="${href}">${child.title}</a></div>
                    `;
                }
            }
            document.getElementById("categories").innerHTML = html;
        } else {
            return html;
        }    
    }
//catalog page inventory display functions
    let inventory = []; //all inventory
    let catInventory = []; //category specific inventory
    let visibleProducts = []; //products vissible to user when on catalog page
    let featuredInventory = []; //featured items
    let sortedInventory = null; //invetory with filters applied
    let searchResults = null;
    let activeInventory = []; //inventory in use used to allow repurposing of functions
    let currentPage = 1;
    let currentCatalogPage = null;
    let categorySlug = null;
    const base = 12;
    let displayCount = base;
    let start = 0;
    let end = 0;
    let pageCount = 0;//change inventory to category inventory when made
    let isRendering = false;
    let pendingPage = null;
    var MaxSortPrice = 0;
    let resetPage = false;
    let initializeSlider = false;

    async function loadInventory(){ //loads the inventory file
        const response = await fetch("inventory/inventory.json");
        inventory = await response.json();
    }

    async function getCategoryInventory(){ //gets the items specific to the category
        catInventory = [];

        await loadNavigation();

        const params = new URLSearchParams(window.location.search);

        const slug = params.get("slug");

        const category = findByProperty(navigation, "slug", slug);

        if(!category) window.location.href = "404page.html";

        if(category){
            for (const item of inventory){                
                if(item.Category === category.id && item.Show === 0) catInventory.push(item);
                else if (item.Brand === category.id) catInventory.push(item);
            }
        }
        searchCategoryInventory(category.children);
        activeInventory = catInventory;
    }
    function searchCategoryInventory(category){//recursive function to load category inventory to include items in children
        if (category){
            for(const child of category) {
                for (const item of inventory){
                    if(item.Category === child.id) catInventory.push(item);
                }
                searchCategoryInventory(child.children);
            }
        }
    }
    async function getFeaturedInventory(){//gets the items in inventory marked as featured
        await loadInventory();
        for (const item of inventory){
            if (item["Featured"] === 1) featuredInventory.push(item);
        }
    }
    
//functions for the use of the attribute side bar
    function getMaxPrice(inventoryArray){
        MaxSortPrice = 0;
        for (const item of inventoryArray){
            const price = parseFloat(item.Price) || 0;
            if (price > MaxSortPrice) MaxSortPrice = price;
        }
        MaxSortPrice = Math.round(MaxSortPrice);
    }
    function getSortedInventory(min, max, resetPage){ //
        sortedInventory = [];

        if (resetPage) currentPage = 1;       

        const filterPool = getCurrentInventory();//from the currently active inventory sets what is filtered through
        
        for (const item of filterPool){
            const price = parseFloat(item.Price) || 0;
            if(price >= min && price <= max) sortedInventory.push(item);
        }
        rebuildActiveInventory();
    }

    async function renderAtributeTab(){ //loads the html for the attribute side tab
        var slider = document.getElementById("price-slider");

        if (!slider) return false;

        var tab = document.getElementById("attribute-content");

        getMaxPrice(catInventory);
        
        slider.innerHTML = `
            <h3 style="text-decoration: underline; width: 100%;">Price</h3>
            <div id="slider-track">
                <div id="slider-range"></div>
            </div>   

            <input type="range" id="minPrice" min="0" max="${MaxSortPrice}" value="0">
            <input type="range" id="maxPrice" min="0" max="${MaxSortPrice}" value="${MaxSortPrice}">

            <p style="margin-top: 25px;">
                $<span id="minValue">0</span>
                <input id="minInput" type="text" value="0" hidden>
                -
                $<span id="maxValue">${MaxSortPrice}</span>
                <input id="maxInput" type="text" value="${MaxSortPrice}" hidden>
            </p>
        `;     
    }
    function updatePriceRange(){ //controls the blue oberlay bar of the slider
        const minSlider = document.getElementById("minPrice");

        if (!minSlider) return;

        const maxSlider = document.getElementById("maxPrice");

        const minValue = document.getElementById("minValue");
        const maxValue = document.getElementById("maxValue");

        const sliderRange = document.getElementById("slider-range");

        const min = parseInt(minSlider.value);
        const max = parseInt(maxSlider.value);

        if( parseInt(minSlider.value) > parseInt(maxSlider.value) ) minSlider.value = maxSlider.value;
        
        if (!initializeSlider){
            sessionStorage.setItem("minPrice", min);
            sessionStorage.setItem("maxPrice", max);
        }
        
            minValue.textContent = minSlider.value;
            maxValue.textContent = maxSlider.value;

            getSortedInventory(min, max, resetPage);
            updateValues(activeInventory);
            renderCatalog(activeInventory);

            const percentMin = (min / MaxSortPrice) * 100;

            const percentMax = (max / MaxSortPrice) * 100;

            sliderRange.style.left = percentMin + "%";

            sliderRange.style.width = (percentMax - percentMin) + "%";
        resetPage = false;
    }
//end of attribute side bar specific functions

    function updateValues(inventoryArray){ //products vissible in a category
        if(currentCatalogPage != null){
            currentPage = currentCatalogPage;
            currentCatalogPage = null;
        }
        start = (currentPage - 1)*displayCount;
        end = currentPage*displayCount;
        visibleProducts = inventoryArray.slice(start,end);
        pageCount = Math.ceil(inventoryArray.length/displayCount);
    }  

    function pageClicks(event){ //updates catalog display when page bar is interacted with
        if(event.target.id === "prev"){
            if (currentPage != 1) {
                currentPage--;
                requestPage(currentPage);
            }
        }
        else if(event.target.id === "next"){
            if (currentPage != pageCount) {
                currentPage++;
                requestPage(currentPage);
            }
        }
        else if(event.target.classList.contains("pageNumbers")){
            currentPage = parseInt(event.target.textContent);
            requestPage(currentPage);
        }
    }
    function displayChange(event){ //updates ammount of items shown when display count is changed
        if (event.target.id === "showcount"){
            displayCount = parseInt(event.target.value);
            currentPage = 1;
            updateCatalogContent();
        }
    }
    function attachListeners(){ //add the listner functions to the proper buttons
        document.addEventListener("click", pageClicks);
        document.addEventListener("change", displayChange);
    }

    async function initilalizeCatolog(){ //runs functions for the catolog page
        await loadInventory(); //gets inventory
        await getCategoryInventory(); //gets category specific inventory
        rebuildActiveInventory(); //sets active inventory
        attachListeners(); //attches listners to pagebar and display count
    }

    //render functions
    function renderSettings(inventoryArray){ //sort bar, product count, display option count
        var html = `
            <div id="productCount">
                <p><strong>Products</strong> ${start +1}-${Math.min(end, inventoryArray.length)} of <strong>${inventoryArray.length}</strong></p> 
            </div>
            <div class="dropdown-container">
                <p>Show: </p>
                <select id="showcount">
                    <option value="${base*1}" ${displayCount === base*1 ? "selected" : ""}> ${base*1} Per Page </option>
                    <option value="${base*2}" ${displayCount === base*2 ? "selected" : ""}> ${base*2} Per Page </option>
                    <option value="${base*3}" ${displayCount === base*3 ? "selected" : ""}> ${base*3} Per Page </option>
                    <option value="${base*4}" ${displayCount === base*4 ? "selected" : ""}> ${base*4} Per Page </option>
                </select>
            </div>
        `;
        
        document.getElementById("content-settings").innerHTML = html;
    }
    function renderProducts(){ //pulls product img, name and price to a card for display
        var price = 0;
        var html = "";

        //fade content out
        const container = document.getElementById("product-content");
        container.style.opacity = "0";
        
        //fade timer
        setTimeout(async () => {
            /* generate/render html */
            container.innerHTML = html;
            container.style.opacity = "1";
        }, 150);

        for (const object of visibleProducts) {//load product cards to page
            if (object.Price != 0) price = parseFloat(object.Price);
            else if (object.Retail != 0) price = parseFloat(object.Retail);
            else price = "Price Not Available";

            if (typeof(price) !== "string" ) {
                if (object.Brand === "brands-citizen") { //watch discount
                    price = object.Retail - (object.Retail*.25);
                }
                var moneyFormat = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD'}).format(price);
            } else
                var moneyFormat = price;

            var imagePath = "inventory/inventory-images/" + object["Product Image"];

            const params = new URLSearchParams(window.location.search);

            const slug = params.get("slug");
            

            html += `
                <div class="item-card">
                    <div class="item-card1">
                        <a href="productPage.html?item=${object["Item#"]}&category=${slug}&page=${currentPage}"">
                            <img src="${imagePath}" onerror="this.src='images/img-placeholder.svg'">
                        </a>
                    </div>
                    <div class="item-card2">
                        ${object["Product Name"]} <br>
                        <span class="price">${moneyFormat}</span>
                    </div>
                </div>
            `;
        };
    }
    function renderFeaturedProducts(){//pulls product img, name and price to a card for display
        var price = 0;
        var html = "";

        //fade content out
        const container = document.getElementById("featured-content");

        if (container !== null){
            container.style.opacity = "0";
            
            //fade timer
            setTimeout(async () => {
                /* generate/render html */
                container.innerHTML = html;
                container.style.opacity = "1";
            }, 150);

            for (const object of featuredInventory) {//load product cards to page

                if (object.Price != 0) price = object.Price;
                else if (object.Retail != 0) price = object.Retail;
                else price = "Price Not Available";

                if (price !== "Price Not Available" )
                    var moneyFormat = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD'}).format(price);
                else
                    var moneyFormat = price;

                var imagePath = "inventory/inventory-images/"+object["Product Image"];

                const params = new URLSearchParams(window.location.search);

                const slug = params.get("slug");
                

                html += `
                    <div class="item-card">
                        <div class="item-card1">
                            <a href="productPage.html?item=${object["Item#"]}&category=${object["Category"]}">
                                <img src="${imagePath}" onerror="this.src='images/img-placeholder.svg'">
                            </a>
                        </div>
                        <div class="item-card2">
                            ${object["Product Name"]} <br>
                            <span class="price">${moneyFormat}</span>
                        </div>
                    </div>
                `;
            };

            document.getElementById("featured-content").innerHTML = html;
        }
    }


    function renderPageBar(){// page navigation for categories
        var pageBar = document.getElementById("pageBar");

        pageBar.innerHTML = "";

        const screenWidth = window.innerWidth;
        console.log(screenWidth);

        if (screenWidth <= 500) {//small screen page bar display
            console.log("phone screen");
            const maxPageView = 3;
            const edgePages = 1;
            const middlePages = 1;
            if (pageCount <= 1) return; //if one page don't make page bar

            var html = "";

            if (pageCount > 1){           
                //fist page button
                html += `
                    <div id="prev">< Prev</div>
                `;
                if (pageCount <= maxPageView) {
                    for (var i = 1; i <= pageCount; i++){
                        html += `
                            <div class="pageNumbers ${i === currentPage ? "currentPage" : ""}">
                                ${i}
                            </div>
                        `;
                    }
                } else {
                    html += `
                        <div class="pageNumbers ${1 === currentPage ? "currentPage" : ""}">
                            ${1}
                        </div>
                    `
                }
            

                if (pageCount > maxPageView){
                    var startMiddle, endMiddle;

                    /* near beginning */
                    if(currentPage <= edgePages + 1){
                        startMiddle = edgePages + 1;
                        endMiddle = edgePages + middlePages;
                    }

                    /* near end */
                    else if(currentPage >= pageCount - edgePages){
                        startMiddle = pageCount - middlePages - edgePages + 1;
                        endMiddle = pageCount - edgePages;
                    }

                    /* middle */
                    else{
                        const half = Math.floor(middlePages / 2);
                        startMiddle = currentPage - half;
                        endMiddle = startMiddle + middlePages - 1;

                        if (startMiddle < edgePages + 1){
                            startMiddle = edgePages + 1;
                            endMiddle = startMiddle + middlePages - 1;
                        }
                        if (endMiddle > pageCount - edgePages){
                            endMiddle = pageCount - edgePages;
                            startMiddle = endMiddle - middlePages + 1;
                        }
                    }

                    //elipse once deep enough into pages
                    if (startMiddle > edgePages + 1){
                        html += ` <div>...</div> `;
                    }
                    //sliding middle
                    for (var j = startMiddle; j <= endMiddle; j++){
                        html += `
                            <div class="pageNumbers ${j === currentPage ? "currentPage" : ""}">
                                ${j}
                            </div>
                        `;
                    }
                    //elispse when not too deep
                    if (endMiddle < pageCount - edgePages) {
                        html += ` <div>...</div> `;
                    }
                    //last two
                    html += `
                        <div class="pageNumbers ${pageCount === currentPage ? "currentPage" : ""}">
                            ${pageCount}
                        </div>
                    `;
                }

                //next button
                html += ` <div id="next">Next ></div> `;
                document.getElementById("pageBar").innerHTML = html;
            }
        }
        else { //page par on large screens
            console.log("wide screen");
            const maxPageView = 7;
            const edgePages = 2;
            const middlePages = maxPageView - edgePages;

            if (pageCount <= 1) return;

            var html = "";

            if (pageCount > 1){           
                //fist two page buttons
                html += `
                    <div id="prev">< Prev</div>
                `;
                if (pageCount <= maxPageView) {
                    for (var i = 1; i <= pageCount; i++){
                        html += `
                            <div class="pageNumbers ${i === currentPage ? "currentPage" : ""}">
                                ${i}
                            </div>
                        `;
                    }
                } else {
                    html += `
                        <div class="pageNumbers ${1 === currentPage ? "currentPage" : ""}">
                            ${1}
                        </div>
                        <div class="pageNumbers ${2 === currentPage ? "currentPage" : ""}">
                            ${2}
                        </div>
                    `;
                }
            

                if (pageCount > maxPageView){
                    var startMiddle, endMiddle;

                    /* near beginning */
                    if(currentPage <= edgePages + 1){
                        startMiddle = edgePages + 1;
                        endMiddle = edgePages + middlePages;
                    }

                    /* near end */
                    else if(currentPage >= pageCount - edgePages){
                        startMiddle = pageCount - middlePages - edgePages + 1;
                        endMiddle = pageCount - edgePages;
                    }

                    /* middle */
                    else{
                        const half = Math.floor(middlePages / 2);
                        startMiddle = currentPage - half;
                        endMiddle = startMiddle + middlePages - 1;

                        if (startMiddle < edgePages + 1){
                            startMiddle = edgePages + 1;
                            endMiddle = startMiddle + middlePages - 1;
                        }
                        if (endMiddle > pageCount - edgePages){
                            endMiddle = pageCount - edgePages;
                            startMiddle = endMiddle - middlePages + 1;
                        }
                    }

                    //elipse once deep enough into pages
                    if (startMiddle > edgePages + 1){
                        html += ` <div>...</div> `;
                    }
                    //sliding middle
                    for (var j = startMiddle; j <= endMiddle; j++){
                        html += `
                            <div class="pageNumbers ${j === currentPage ? "currentPage" : ""}">
                                ${j}
                            </div>
                        `;
                    }
                    //elispse when not too deep
                    if (endMiddle < pageCount - edgePages) {
                        html += ` <div>...</div> `;
                    }
                    //last two
                    html += `
                        <div class="pageNumbers ${pageCount-1 === currentPage ? "currentPage" : ""}">
                            ${pageCount-1}
                        </div>
                        <div class="pageNumbers ${pageCount === currentPage ? "currentPage" : ""}">
                            ${pageCount}
                        </div>
                    `;
                }

                //next button
                html += ` <div id="next">Next ></div> `;
                document.getElementById("pageBar").innerHTML = html;
            }

        }
    }
    //render all
    function renderCatalog(inventoryArray){
        renderSettings(inventoryArray);
        renderProducts();
        renderPageBar();
    }

    //update functions
    function updateSettings(inventoryArray){
        var html = `<p><strong>Products</strong> ${start +1}-${Math.min(end, inventoryArray.length)} of <strong>${inventoryArray.length}</strong></p>`;
        document.getElementById("productCount").innerHTML = html;
    }   
    function updateCatalogContent(){
        updateValues(activeInventory);
        renderProducts();
        renderPageBar();
        updateSettings(activeInventory);
    }
    async function requestPage(page){ //prevents page lag from spam requests
        if (isRendering) pendingPage = page;
        else {
            isRendering = true;
            currentPage = page;
            await updateCatalogContent();
            while (pendingPage != null) {
                currentPage = pendingPage;
                pendingPage = null;
                await updateCatalogContent();
            }
            isRendering = false;
        }
    }

var imageManifest = {};
async function loadImageManifest(){
    const response = await fetch("inventory/imageManifest.json");
    imageManifest = await response.json();
}

//render function for product page
function renderProductPage(product){

    document.getElementById("page-title").textContent = "Roof Jewelers | "+product["Product Name"];

    document.getElementById("productImg").src = "inventory/inventory-images/"+product["Product Image"];

    const imgBar = document.getElementById("imgBar");
    const images = (imageManifest[product["Item#"].toLowerCase()] || []).sort();

    document.getElementById("productName").textContent = product["Product Name"];
    document.getElementById("descriptionScroll").textContent = product["Description"];

    var html = "";

    if(product["Brand"] === "brands-citizen"){//watch discounts
        product["Price"] = product["Retail"] - (product["Retail"] * .25);
    }

    var retail = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD'}).format(product["Retail"]);
    var sellingPrice = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD'}).format(product["Price"]);
    var saved = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD'}).format(product["Retail"] - product["Price"]);
    
    if (product["Retail"] > product["Price"]) {
        html = `
            <h3> Retail: ${retail} </h3>
            <h1> Price: ${sellingPrice}</h1>
            <h3> You Save: ${saved}</h3>
        `;
    } else if (product["Retail"] > 0){
        html = `
            <h1> Price: ${retail}</h1>
        `;
    } else if (product["Price"] > 0) {
        html = `
            <h1> Price: ${sellingPrice}</h1>
        `;
    } else {
        html = `
            <h1> Price Not Availible </h1>
        `;
    }
    document.getElementById("priceDiv").innerHTML = html;

    var imageHtml = "";
    for (const image of images){ //makes the html for the thumbnail images
        imageHtml += `
            <img class="pImg" src="inventory/inventory-images/${image}" onerror="this.src='images/img-placeholder.svg'">
        `;
    }

    if (images.length > 3){//loads the image thumbnails below the main
        html = `
            <span class="arrow" id="pLeft" style="transform: rotateY(180deg);">&nbsp&#10148;</span>
                <div id="imgLibrary">
                    <div id="imgTrack">
                        ${imageHtml}
                    </div>
                </div>
            <span class="arrow" id="pRight">&nbsp&#10148;</span>
        `;
    } else if (images.length > 1) {
        html = `
            <div id="imgTrack">
                ${imageHtml}
            </div>       
        `;
    } else {
        html = "";
    }
    imgBar.innerHTML = html;
    initializeCarousel();

    document.getElementById("itemID").textContent = "Item#: "+product["Item#"];
    document.getElementById("availibility").textContent = "Availibility: "+product["Status"];
    document.getElementById("quantity").textContent = "Quantity: "+product["Stock"];
}

function initializeCarousel() {
    const track = document.getElementById("imgTrack");

    const imgs = document.querySelectorAll(".pImg");

    if (imgs.length > 0){
        const slides = track.children;

        if (imgs.length > 3){
            for(var i = 0; i < 3; i++){
                var clone = imgs[i].cloneNode(true);
                track.appendChild(clone)
            }

            const lbtn = document.getElementById("pLeft");
            const rbtn = document.getElementById("pRight");

            var index = 0;
            const slideWidth = 70;

            lbtn.addEventListener('click', function(){
                if(index === 0){ /*if at first slide turns off animation jumps to clone at the end and then moves back after turning animation on*/
                        /* jump instantly to cloned slide */
                        track.style.transition = "none";

                        index = slides.length - 3;

                        track.style.transform = `translateX(-${index * slideWidth}px)`;

                        setTimeout(() => {
                            track.style.transition = "transform 0.7s ease-in-out";
                            index--;
                            track.style.transform = `translateX(-${index * slideWidth}px)`;
                        }, 20);
                    } else updateSlide(0);    
                });

            rbtn.addEventListener('click', function(){
                updateSlide(1);

                if(index === slides.length - 3){ /*if at the clone of the first slide turns off animation jumps to start and turns animation on again*/
                        setTimeout(() => { /*=> is wait until finished*/
                            track.style.transition = "none";
                            index = 0;
                            track.style.transform = `translateX(0px)`;
                        }, 1000);
                    }    
                });

            function updateSlide(num){
                if(num === 0) index--;
                if(num === 1) index++;

                track.style.transition = "transform 1s ease-in-out";
                track.style.transform = `translateX(-${index * slideWidth}px)`;
            }
        }

        track.addEventListener(
            "click",
            function(event){
                if(event.target.classList.contains("pImg")) {
                    document.getElementById("productImg").src = event.target.src;
                }
            }
        );        
    }

}

//function for link standardization
function applyNavigation(navigation){ //primary use footer
    const elements = document.querySelectorAll("[data-navigation]");
        
    elements.forEach(element => {
        const id = element.dataset.navigation;

        const item = findByProperty(navigation, "id", id);      

        if(item){
            var href = buildlink(item);
            if(href){
                element.innerHTML = `
                    <a href="${href}">
                        ${item.title}
                    </a>
                `;
            }
        } else {
            return null;
        }
    });
    
}

//page initilization functions
    /* load shared components */
    async function initializePage(){
        await loadNavigation();

        await loadImageManifest();

        await loadHTML("header-placeholder", "header.html");

        await loadHTML("footer-placeholder", "footer.html");

        document.getElementById("tabbar").innerHTML = createMenu(navigation);

        await setupExternalLinks();

        await loadconfig();
        await applyConfig();
        await applyNavigation(navigation);

        document.querySelectorAll(".tabitem").forEach(tab => { //menudrop down direction
            tab.addEventListener("mouseenter", function(){
                const dropdown = this.querySelector(".dropdown");

                if(!dropdown) return;

                dropdown.classList.remove("left");

                const rect = dropdown.getBoundingClientRect();

                if(rect.right > window.innerWidth) dropdown.classList.add("left");
            });

        });
        document.querySelectorAll(".dropdownitem").forEach(item => { //submenu dropdown dirrection
            item.addEventListener("mouseenter", function(){
                const sub = this.querySelector(".subdropdown");

                if(!sub) return;

                sub.classList.remove("left");

                if(sub.getBoundingClientRect().right > window.innerWidth) sub.classList.add("left");
            });

        });

        const searchBar = document.getElementById("searchBar");
        var firstFocus = true;
        searchBar.addEventListener(
            "focus",
            function(){
                if(firstFocus){
                    searchBar.select();
                    firstFocus = false;
                }
            }
        );
        searchBar.addEventListener(
            "blur",
            function(){
                firstFocus = true;
            }
        );

        await getFeaturedInventory();
        renderFeaturedProducts();

        await initializeSearch();

        const path = window.location.pathname;
        if (path.endsWith("index.html") || path === "/") {
            sessionStorage.removeItem("minPrice");
            sessionStorage.removeItem("maxPrice");
        }

        document.body.style.opacity = "1"; /* allows fade into website */
    }
    /* load info pages */
    async function initializeInfoPage(){
        await loadNavigation();

        const params = new URLSearchParams(window.location.search);

        const lslug = params.get("lslug");

        console.log(lslug);

        const category = findByProperty(navigation, "lslug", lslug);

        if(!category) window.location.href = "404page.html";

        var html = "";
        if (lslug === "jewelry-repair") { /* Jewelry repair page */
            html = `
                    <h1>Jewelry Repair</h1>
                    <div class="infobox">
                        <p>
                            As experts in jewelry repair, we at Roof Jewelers can fix all types of jewelry. 
                        </p>
                        <p>
                            We can repair chains, size rings, retip prongs, replace prongs, replace missing stones, 
                            set new stones, solder rings together, or basically weld or solder any small item in need 
                            of repair. Common ring repairs include basic sizing, adding a ring guard to make a ring 
                            smaller without changing its original shape, replacing a worn shank and repairing the 
                            prongs by retipping or replacement. We can also remount or restyle your existing ring 
                            to create a more modern look. 
                        </p>
                        <p>
                            Do you have a strand of pearls that needs to be restrung? Bring it to us!
                        </p>
                        <p>
                            Other repairs we typically perform: 
                        </p>
                            <ul>
                                <li>Replace posts on earrings</li>
                                <li>Convert earrings from post to clip-on, or from clip-on to post</li>
                                <li>Replace Omega backs or any type of ear wire</li>
                                <li>Rebuild hinges in bracelets and watches</li>
                                <li>Fix or replace broken catches</li>
                                <li>Engraving</li>
                            </ul>
                        
                        <h3>Notice for Hollow Jewelry Repairs:</h3>
                        <p>
                            Given the fragile nature of hollow jewelry we do not guarantee repairs made to certain 
                            pieces of hollow jewelry.
                        </p>
                    </div>
            `;
            
        }
        if (lslug === "brands") { /* brands page */
            html = `
                    <h1>Brands We Carry</h1>
                    <div class="infobox">
                            <ul>
                                <li><a href="https://artcarvedbridal.com/collections/engagement-rings"> ArtCarved Bridal</a></li>
                                <li><a href="https://carlacorp.com/">Carla Earrings</a></li>
                                <li>Citizen</li>
                                <li>Classic of New York</li>
                                <li>GIA & EGL Certified Diamonds</li>
                                <li>Goldman Wedding Bands</li>
                                <li>Hadley-Roma Watch Bands</li>
                                <li>Hagerty Jewelry Cleaning Products</li>
                                <li>Inox - Men's Jewelry</li>
                                <li>Kiddie Kraft</li>
                                <li>Lafonn</li>
                                <li>Leslie's Gold</li>
                                <li><a href="https://lestage.com/products/convertible">LeStage Convertibles</a></li>
                                <li><a href="https://www.rembrandtcharms.com/">Rembrandt Charms</a></li>
                                <li>Royal Chain</li>
                                <li>Southern Gates</li>
                                <li>Thorsten</li>
                            </ul>                    
                    </div>
            `;
            
        }
        if (lslug === "about-us") { /* about us page */
            html = `
                    <h1>About Us</h1>
                    <div class="infobox">
                        <p>
                            Family owned since 1943, Roof Jewelers is an integral part of the community; 
                            we get to know our customers and pride ourselves on providing the best in personal service.
                        </p>
                        <h2>History</h2>
                        <p>
                            Founded by Albert Roof in 1943 Roof Jewelers opened its first location on Taylor street in down 
                            town Columbia, SC, though our story dates back a little more, starting as a watch repair shop in 
                            the corner of his father's dry goods store Al Roof eventually grew the business enough to open 
                            his own store. Second generation, Bill Roof, ran the stores until March of 2017. Eighty plus 
                            years and four generations later, we're a full service jewelry store and still in the Roof family. 
                            Al's grandson, William, has worked in the store since 1980 and now runs the store with his son 
                            Alex (since 2020).
                        </p>
                        <p>
                            William is a qualified jeweler with the following specialized training and designations:
                        </p>
                            <ul>
                                <li>Graduate Gemologist, Gemological Institute of America (GIA)</li>
                                <li>Certified Laserstar Laser Welding Technician</li>
                                <li>GIA Certification for Pearls</li>
                            </ul>
                        <p>
                            We honor our legacy by providing some of the best jewelry and custom design work available.
                        </p>
                    </div>
            `;
            
        }
        if (lslug === "loose-stones") { /* loose stones page */
            html = `
                    <h1>Loose Diamonds</h1>
                    <div class="infobox">
                        <p>
                            Do you have a mounting and are looking for a diamond to go in it? At Roof Jewelers we have a 
                            large assortment of loose diamonds and other stones you can choose from; for more information on our 
                            currently available selection stop by our showroom at <span data-config="store-address"></span> or give us a call at <span data-config="store-phone"></span>.
                        </p>
                        <img src="images/certified-loose-diamonds-header.jpg" alt="" id="loose-stones-flyer">
                    </div>
            `;      
        }
        if (lslug === "watch-repair") { /* watch repair page */
            html = `
                    <h1>Watch Repair</h1>
                    <div class="infobox">
                        <ul>
                            <li>Battery Replacement</li>
                            <li>Watch Bands - Repair, Replace, Adjust</li>
                        </ul>
                        <h2>Battery Replacement</h2>
                        <p>
                            If it takes a button/coin battery, we can do it! Watches, key fobs, anything! 
                            Don't worry, if we don't carry your brand of watch, we can still put a new battery in!
                        </p>
                        <p>
                            There are two programs from which to choose: 
                        </p>
                            <ol>
                                <li>
                                    Better battery replacement: $20.00. We replace the battery and offer a one year warranty. 
                                    Should the battery fail at any time during the year period, we will replace it at no charge. 
                                    Lithium batteries are $20.00 without a warranty.
                                </li>
                                <li>
                                    Best battery replacement: $50.00. We replace the battery and offer a five year warranty. 
                                    Should the battery fail at any time during the five year period, we will replace it at no 
                                    charge.
                                </li>
                                <li>
                                    Alternatively, you may request a battery without a warranty: $15.00
                                </li>
                            </ol>
                        <p>
                            How does this work? We place a small sticker inside the watch with the date and the length of the 
                            warranty and supply you with as many batteries as you need during the warranty period; applies only 
                            to the watch with the warranty. 
                        </p>
                        <h3>Notice</h3>
                        <p>
                            Notice: There may be an added service charge for watch with screws in the back, battery straps, 
                            or for setting complicated watches (ie. digital or perpetual calendar watches).
                        </p>
                    </div>
            `;
            
        }
        if (lslug === "class-rings") { /* class rings page */
            html = `
                    <h1>Class Rings</h1>
                    <div class="infobox">
                        <P>
                            Class rings are an important part of the school experience. At Roof Jewelers, we offer 
                            an exceptional value in class rings. With a highly customizable catalog to choose from you 
                            can pick out the perfect ring and have it on your hand very quickly!
                        </P>
                        <p>
                            To view a full catalog of available styles and designs stop by our showroom at 
                            <span data-config="store-address"></span>, <span data-config="store-city-state"></span>.                       
                        </p>
                        <img src="images/classringsrev.jpg" alt="">
                        <img src="images/classrings_001rev.jpg" alt="">
                        <img src="images/classrings_002rev.jpg" alt="">
                    </div>
            `;
            
        }
        if (lslug === "store-hours") { /* store hours page */
            html = `
                    <h1>Store Hours</h1>
                    <div class="infobox">
                        <h2>Regular Hours</h2>
                            <ul>
                                <li>Monday - Friday | 10:00am - 6:00pm</li>
                                <li>Saturday | 10:00am - 1:00pm</li>
                                <li>Closed Sunday</li>
                            </ul>                    
                        <h2>Holiday Hours (Thanksgiving - Christmas)</h2>
                            <ul>
                                <li>Monday - Saturday | 10:00am - 6:00pm</li>
                                <li>Closed Sunday</li>
                            </ul>
                        <h2>Summer Hours (June, July & August)</h2>
                            <ul>
                                <li>Tuesday - Friday | 10:00am - 6:00pm</li>
                                <li>Closed Saturday, Sunday and Monday</li>
                            </ul>
                    </div>
            `;
            
        }
        if (lslug === "faq") { /* faq page */
            html = `
                    <h1>Frequently Asked Questions</h1>
                    <div class="infobox">
                        <h3>Do we repair jewelry?</h3>
                        <p>
                            Yes we do, and if you would like more information on the different repair and service options 
                            we offer see the Services & Repair tab in the navigation menu above.
                        </p>
                        <h3>Do we carry watches?</h3>
                        <p>
                            Yes, we carry Citizen brand watches.
                        </p>
                        <h3>Do we buy gold?</h3>
                        <p>
                            Yes, we buy gold, silver and platinum items for their scrap value.
                        </p>
                    </div>
            `;
            
        }
        if (lslug === "financing-options") { /* financing-options page */
            html = `
                    <h1>Financing Options</h1>
                    <div class="infobox">
                        <h2>Snap Finance:</h2>
                        <p>
                            Getting Started
                        </p>
                            <ul>
                                <li>Apply: Text 56837 to 48078</li>
                                <li>Get Approved: Receive a decision in seconds, with approval amounts up to $5,000</li>
                                <li>Shop: Use your approved amount to take home what you need today!</li>
                            </ul>
                        
                        <p>
                            To Apply, You Must
                        </p>
                            <ul>
                                <li>Be at least 18 years of age</li>
                                <li>Have a monthly income of $750 or more</li>
                                <li>Have an active checking account (May need a credit/debit card to apply)</li>
                                <li>Have a valid email address and phone number</li>
                            </ul>
                        
                        <h2>In-Store Lay-A-Way</h2>
                        <p>
                            Shopping early for a gift a few months away but don't want it to be found before that special day? 
                            Use our convenient In-Store Lay-A-Way service to have your item saved for you for up to 90 days 
                            while you make weekly or monthly payments on the item until its yours.
                        </p>
                            <ul>
                                <li>Down payment: 25% or $25 whichever is greater.</li>
                                <li>Remaining balance is divided into three equal monthly payments; installments may be made more often.</li>
                                <li>Deposits on lay-a-way items are non-refundable after 10 days but may be used as store credit.</li>
                                <li>Merchandise will be returned to stock after 90 days, however any payments will remain as store credit.</li>
                                <li>Money may be forfeit after an extended period of time.</li>
                            </ul>                  
                    </div>
            `;
            
        }
        if (lslug === "services-and-repair") { /* service and repair page */
            html = `
                    <h1>Services & Repair Options</h1>
                    <div class="infobox">
                            <ul>
                                <li><span data-navigation="services-and-repair-financing"></span></li>
                                <li><span data-navigation="services-and-repair-jewelry-repair"></span></li>
                                <li><span data-navigation="services-and-repair-jewelry-care"></span></li>
                                <li><span data-navigation="services-and-repair-watch-repair"></span></li>                                
                            </ul>                    
                    </div>
            `;
            console.log(html);
        }

        document.getElementById("infocontainer").innerHTML = html;
        applyNavigation(navigation);
        renderInfoPage(category);
    }   
    //functions to populate the catalog page
    async function initilalizeCatologPage(){
        await loadNavigation();

        const params = new URLSearchParams(window.location.search);

        const slug = params.get("slug");
        const pageParam = params.get("page");

        currentCatalogPage = pageParam !== null? parseInt(pageParam): null;

        const category = findByProperty(navigation, "slug", slug);

        if(!category) window.location.href = "404page.html";

        //sets page title, meta descriptions and content header
        await renderCatalogPage(category);

        //sub header function calls
        const depthTrail = trackCategoryPath(navigation, slug);
        await renderCategoryPath(depthTrail);

        await getSubCategories(category);

        //catalog display function calls
        await initilalizeCatolog();  
        await initializeAttributeBar();  

        var search = params.get("search");
        if (search === null) search = "";

        const searchBar = document.getElementById("searchBar");

        if (searchBar) {
            searchBar.value = search || "";
            if(search) runSearch();
        }
    }
    //function to load product page
    async function initializeProductPage(){
        await loadInventory();
        await loadNavigation();
        const params = new URLSearchParams(window.location.search);

        const itemNum = params.get("item");
        const page = params.get("page");
        currentCatalogPage = page;

        categorySlug = params.get("category");

        var depthTrail = trackCategoryPath(navigation, categorySlug);

        if (depthTrail === null) { //used for loading depthtrail of featured items
            categorySlug = findByProperty(navigation, "id", categorySlug);
            depthTrail = trackCategoryPath(navigation, categorySlug.slug);
        }

        const product = findByProperty(inventory, "Item#", itemNum);

        if (depthTrail !== null) renderCategoryPath(depthTrail);

        renderProductPage(product);

        renderFeaturedProducts();
    }
    //function to load attribute system
    async function initializeAttributeBar(){
        if (!renderAtributeTab()) return;

        var minSlider = document.getElementById("minPrice");
        if (!minSlider) return;

        var maxSlider = document.getElementById("maxPrice");

        const savedMin = parseInt(sessionStorage.getItem("minPrice")) || 0;
        const savedMax = parseInt(sessionStorage.getItem("maxPrice")) || MaxSortPrice;

        minSlider.value = Math.min(savedMin, MaxSortPrice);
        maxSlider.value = Math.min(savedMax, MaxSortPrice);
        
        if(MaxSortPrice <= 0) {
            sessionStorage.removeItem("maxprice");
            sessionStorage.removeItem("minPrice");
        }

        const minValue = document.getElementById("minValue");
        const maxValue = document.getElementById("maxValue");

        const sliderRange = document.getElementById("slider-range");

        minSlider.oninput = function(){
            resetPage = true;
            updatePriceRange();
        }
        maxSlider.oninput = function(){
            resetPage = true;
            updatePriceRange();
        }

        resetPage = false;

        initializeSlider = true;
        updatePriceRange();
        initializeSlider = false;

        minValue.onclick = function(){
            minValue.hidden = true;
            minInput.hidden = false;
            minInput.focus();
        }
        minInput.onblur = function(){
            minValue.textContent = this.value;
            minSlider.value = this.value;
            minInput.hidden = true;
            minValue.hidden = false;
            resetPage = true;
            updatePriceRange();
        }
        minInput.onfocus = function(){
            this.select();
        }
        minInput.onkeydown = function(event){
            if(event.key === "Enter"){
                this.blur();
            }
        };

        maxValue.onclick = function(){
            maxValue.hidden = true;
            maxInput.hidden = false;
            maxInput.focus();
        }
        maxInput.onblur = function(){
            maxValue.textContent = this.value;
            maxSlider.value = this.value;
            maxInput.hidden = true;
            maxValue.hidden = false;
            resetPage = true;
            updatePriceRange();
        }
        maxInput.onfocus = function(){
            this.select();
        }
        maxInput.onkeydown = function(event){
            if(event.key === "Enter"){
                this.blur();
            }
        };
    }

