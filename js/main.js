(function () {
  const CART_KEY = "jt_cart";
  const DISCOUNT_KEY = "jt_discount";
  const WISHLIST_KEY = "jt_wishlist";
  const SHIPPING = 60;
  const egyptPhoneRegex = /^01[0125][0-9]{8}$/;
  const cities = {
    القاهرة: ["مدينة نصر", "مصر الجديدة", "التجمع", "المعادي", "شبرا"],
    الجيزة: ["الدقي", "المهندسين", "الهرم", "6 أكتوبر", "زايد"],
    الإسكندرية: ["سموحة", "سيدي جابر", "ميامي", "العجمي"],
    الدقهلية: ["المنصورة", "طلخا", "ميت غمر"],
    الغربية: ["طنطا", "المحلة", "كفر الزيات"]
  };

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getCart() {
    return read(CART_KEY, []);
  }

  function setCart(cart) {
    write(CART_KEY, cart);
    updateCartCounter();
  }

  function addToCart(id, size) {
    const product = window.getProductById ? window.getProductById(id) : null;
    if (!product) return;
    const selectedSize = size || product.sizes[0] || "M";
    const cart = getCart();
    const item = cart.find((entry) => entry.id === product.id && entry.size === selectedSize);
    if (item) {
      item.qty += 1;
    } else {
      cart.push({ id: product.id, size: selectedSize, qty: 1 });
    }
    setCart(cart);
    showToast("تمت الإضافة للسلة ✓");
    renderCartPage();
  }

  function removeFromCart(id, size) {
    setCart(getCart().filter((item) => !(item.id === Number(id) && item.size === size)));
    renderCartPage();
    showToast("تم حذف المنتج");
  }

  function updateQuantity(id, size, qty) {
    const cart = getCart();
    const item = cart.find((entry) => entry.id === Number(id) && entry.size === size);
    if (!item) return;
    item.qty = Math.max(1, Number(qty));
    setCart(cart);
    renderCartPage();
  }

  function applyDiscount(code) {
    const normalized = String(code || "").trim().toUpperCase();
    if (normalized === "JOKER10") {
      write(DISCOUNT_KEY, { code: "JOKER10", percent: 10 });
      showToast("تم تطبيق خصم 10%");
      renderCartPage();
      return true;
    }
    localStorage.removeItem(DISCOUNT_KEY);
    showToast("كود الخصم غير صحيح");
    renderCartPage();
    return false;
  }

  function cartTotals() {
    const subtotal = getCart().reduce((sum, item) => {
      const product = window.getProductById ? window.getProductById(item.id) : null;
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
    const discount = read(DISCOUNT_KEY, null);
    const discountValue = discount ? Math.round(subtotal * (discount.percent / 100)) : 0;
    const shipping = subtotal > 0 ? SHIPPING : 0;
    return { subtotal, discountValue, shipping, total: Math.max(0, subtotal - discountValue + shipping) };
  }

  function updateCartCounter() {
    const count = getCart().reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll("[data-cart-count]").forEach((node) => {
      node.textContent = count;
    });
  }

  function showToast(message) {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  function bindProductActions(scope = document) {
    scope.querySelectorAll("[data-add-cart]").forEach((button) => {
      button.addEventListener("click", () => addToCart(button.dataset.addCart));
    });

    scope.querySelectorAll("[data-wishlist]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = Number(button.dataset.wishlist);
        const wishlist = read(WISHLIST_KEY, []);
        const exists = wishlist.includes(id);
        const next = exists ? wishlist.filter((item) => item !== id) : wishlist.concat(id);
        write(WISHLIST_KEY, next);
        button.classList.toggle("is-active", !exists);
        showToast(exists ? "تم الحذف من المفضلة" : "تمت الإضافة للمفضلة");
      });
    });

    scope.querySelectorAll("[data-quick-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const product = window.getProductById(button.dataset.quickView);
        if (product) showToast(`${product.name} - ${window.formatPrice(product.price)}`);
      });
    });
  }

  function renderFeatured() {
    const grid = document.querySelector("[data-featured-products]");
    if (grid && window.renderProductGrid) {
      window.renderProductGrid(grid, window.JT_PRODUCTS.slice(0, 4), { skeletonCount: 4 });
    }
  }

  function filterProducts() {
    const grid = document.querySelector("[data-products-grid]");
    if (!grid || !window.JT_PRODUCTS) return;
    const params = new URLSearchParams(location.search);
    const initialCategory = params.get("category") || params.get("cat") || grid.dataset.initialCategory || "all";
    const tabs = document.querySelector("[data-category-tabs]");
    const sort = document.querySelector("[data-sort]");
    const search = document.querySelector("[data-shop-search]");
    const count = document.querySelector("[data-result-count]");
    const empty = document.querySelector("[data-empty]");
    let state = { category: initialCategory, sort: "newest", query: "" };

    function sync() {
      if (tabs) {
        tabs.querySelectorAll("[data-category]").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.category === state.category);
        });
      }
    }

    function list() {
      const q = state.query.trim().toLowerCase();
      let next = window.JT_PRODUCTS.filter((product) => {
        const inCategory = state.category === "all" || product.category === state.category;
        const inSearch = !q || product.name.toLowerCase().includes(q) || window.JT_CATEGORIES[product.category].includes(q);
        return inCategory && inSearch;
      });
      if (state.sort === "price-asc") next = next.slice().sort((a, b) => a.price - b.price);
      if (state.sort === "price-desc") next = next.slice().sort((a, b) => b.price - a.price);
      if (state.sort === "newest") next = next.slice().sort((a, b) => b.id - a.id);
      return next;
    }

    function render() {
      const next = list();
      if (count) count.textContent = `${next.length} منتج`;
      if (empty) empty.classList.toggle("is-visible", next.length === 0);
      window.renderProductGrid(grid, next, { skeletonCount: Math.min(next.length || 3, 6), delay: 160 });
    }

    if (tabs) {
      tabs.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-category]");
        if (!btn) return;
        state.category = btn.dataset.category;
        sync();
        render();
      });
    }
    if (sort) sort.addEventListener("change", () => { state.sort = sort.value; render(); });
    if (search) search.addEventListener("input", () => { state.query = search.value; render(); });
    sync();
    render();
  }

  function renderSearchPage() {
    const input = document.querySelector("[data-global-search]");
    const grid = document.querySelector("[data-search-results]");
    if (!input || !grid || !window.JT_PRODUCTS) return;
    function render() {
      const q = input.value.trim().toLowerCase();
      const list = window.JT_PRODUCTS.filter((product) => product.name.toLowerCase().includes(q) || window.JT_CATEGORIES[product.category].includes(q));
      window.renderProductGrid(grid, q ? list : window.JT_PRODUCTS, { delay: 120 });
    }
    input.addEventListener("input", render);
    render();
  }

  function renderCartPage() {
    const list = document.querySelector("[data-cart-list]");
    if (!list || !window.getProductById) return;
    const cart = getCart();
    if (!cart.length) {
      list.innerHTML = `<div class="glass-card">السلة فارغة حالياً. ابدأ من المتجر واختار القطعة اللي شبهك.</div>`;
    } else {
      list.innerHTML = cart.map((item) => {
        const product = window.getProductById(item.id);
        if (!product) return "";
        return `
          <article class="cart-item">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <div>
              <h3>${product.name}</h3>
              <p>المقاس: ${item.size}</p>
              <strong>${window.formatPrice(product.price * item.qty)}</strong>
            </div>
            <div class="cart-item-actions">
              <div class="qty-control" aria-label="تعديل الكمية">
                <button class="qty-btn" type="button" data-qty-minus="${item.id}" data-size="${item.size}">-</button>
                <strong>${item.qty}</strong>
                <button class="qty-btn" type="button" data-qty-plus="${item.id}" data-size="${item.size}">+</button>
              </div>
              <button class="remove-btn" type="button" data-remove-cart="${item.id}" data-size="${item.size}" aria-label="حذف ${product.name}">×</button>
            </div>
          </article>
        `;
      }).join("");
    }

    const totals = cartTotals();
    setText("[data-subtotal]", window.formatPrice ? window.formatPrice(totals.subtotal) : totals.subtotal);
    setText("[data-discount]", `- ${window.formatPrice ? window.formatPrice(totals.discountValue) : totals.discountValue}`);
    setText("[data-shipping]", window.formatPrice ? window.formatPrice(totals.shipping) : totals.shipping);
    setText("[data-total]", window.formatPrice ? window.formatPrice(totals.total) : totals.total);

    list.querySelectorAll("[data-qty-minus]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = getCart().find((entry) => entry.id === Number(button.dataset.qtyMinus) && entry.size === button.dataset.size);
        if (item) updateQuantity(item.id, item.size, item.qty - 1);
      });
    });
    list.querySelectorAll("[data-qty-plus]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = getCart().find((entry) => entry.id === Number(button.dataset.qtyPlus) && entry.size === button.dataset.size);
        if (item) updateQuantity(item.id, item.size, item.qty + 1);
      });
    });
    list.querySelectorAll("[data-remove-cart]").forEach((button) => {
      button.addEventListener("click", () => removeFromCart(button.dataset.removeCart, button.dataset.size));
    });
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
  }

  function validateField(field) {
    const value = field.value.trim();
    const name = field.name;
    let message = "";
    if (field.required && !value) message = "هذا الحقل مطلوب";
    if (!message && name === "name" && value.length < 2) message = "الاسم يجب أن يكون حرفين على الأقل";
    if (!message && name === "phone" && !egyptPhoneRegex.test(value)) message = "اكتب رقم مصري صحيح يبدأ بـ 01";
    if (!message && name === "address" && value.length < 8) message = "اكتب عنوان كامل وواضح";
    const error = field.closest(".field")?.querySelector(".error");
    if (error) error.textContent = message;
    return !message;
  }

  function bindForms() {
    document.querySelectorAll("[data-validate-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const fields = Array.from(form.querySelectorAll("input, textarea, select"));
        const valid = fields.every(validateField);
        if (!valid) return;
        const success = form.querySelector("[data-success]") || document.querySelector("[data-success]");
        if (success) success.classList.add("is-visible");
        if (form.dataset.clearCart === "true") {
          localStorage.removeItem(CART_KEY);
          localStorage.removeItem(DISCOUNT_KEY);
          updateCartCounter();
          renderCartPage();
        }
        showToast(form.dataset.successToast || "تم الإرسال بنجاح ✓");
      });
      form.querySelectorAll("input, textarea, select").forEach((field) => {
        field.addEventListener("blur", () => validateField(field));
      });
    });

    const governorate = document.querySelector("[data-governorate]");
    const city = document.querySelector("[data-city]");
    if (governorate && city) {
      governorate.innerHTML = `<option value="">اختر المحافظة</option>${Object.keys(cities).map((name) => `<option value="${name}">${name}</option>`).join("")}`;
      governorate.addEventListener("change", () => {
        city.innerHTML = `<option value="">اختر المدينة</option>${(cities[governorate.value] || []).map((name) => `<option value="${name}">${name}</option>`).join("")}`;
      });
    }
  }

  function bindDiscount() {
    document.querySelectorAll("[data-apply-discount]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.querySelector("[data-discount-code]");
        applyDiscount(input ? input.value : "");
      });
    });
    document.querySelectorAll("[data-copy-coupon]").forEach((button) => {
      button.addEventListener("click", () => {
        const code = button.dataset.copyCoupon || "JOKER10";
        navigator.clipboard?.writeText(code);
        showToast("تم نسخ الكود");
      });
    });
  }

  function bindCountdown() {
    const node = document.querySelector("[data-countdown]");
    if (!node) return;
    const end = Date.now() + 1000 * 60 * 60 * 36;
    function tick() {
      const diff = Math.max(0, end - Date.now());
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      node.textContent = `${h}:${m}:${s}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  function bindNavigation() {
    const header = document.querySelector("[data-header]");
    const drawer = document.querySelector("[data-mobile-drawer]");
    const updateHeader = () => header?.classList.toggle("is-scrolled", scrollY > 20);
    updateHeader();
    addEventListener("scroll", updateHeader, { passive: true });

    document.querySelectorAll("[data-menu-toggle]").forEach((button) => {
      button.addEventListener("click", () => drawer?.classList.add("is-open"));
    });
    document.querySelectorAll("[data-drawer-close], [data-mobile-drawer] a").forEach((button) => {
      button.addEventListener("click", () => drawer?.classList.remove("is-open"));
    });

    const scrollTop = document.querySelector("[data-scroll-top]");
    if (scrollTop) {
      addEventListener("scroll", () => scrollTop.classList.toggle("is-visible", scrollY > 500), { passive: true });
      scrollTop.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
    }
  }

  function observe(scope = document) {
    const items = scope.querySelectorAll ? scope.querySelectorAll(".fade-in") : [];
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .14 });
    items.forEach((item) => observer.observe(item));
  }

  function hideLoader() {
    const loader = document.querySelector("[data-loader]");
    if (loader) window.setTimeout(() => loader.classList.add("is-hidden"), 350);
  }

  window.JokerTeam = { bindProductActions, observe, renderCartPage };
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateQuantity = updateQuantity;
  window.applyDiscount = applyDiscount;

  document.addEventListener("DOMContentLoaded", () => {
    updateCartCounter();
    bindNavigation();
    bindCountdown();
    bindDiscount();
    bindForms();
    renderFeatured();
    filterProducts();
    renderSearchPage();
    renderCartPage();
    observe();
    bindProductActions(document);
    hideLoader();
  });
})();
