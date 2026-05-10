(function () {
  /* ═══════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════ */
  const CART_KEY      = "jt_cart";
  const DISCOUNT_KEY  = "jt_discount";
  const WISHLIST_KEY  = "jt_wishlist";
  const THEME_KEY     = "jt_theme";
  const COUNTDOWN_KEY = "jt_countdown_end";
  const SHIPPING      = 60;
  const DISCOUNT_CODES = { JOKER10: 10 };   // add more codes here easily
  const egyptPhoneRegex = /^01[0125][0-9]{8}$/;

  const cities = {
    القاهرة:    ["مدينة نصر", "مصر الجديدة", "التجمع", "المعادي", "شبرا", "حلوان", "المطرية"],
    الجيزة:    ["الدقي", "المهندسين", "الهرم", "6 أكتوبر", "زايد", "إمبابة"],
    الإسكندرية: ["سموحة", "سيدي جابر", "ميامي", "العجمي", "المنتزه"],
    الدقهلية:   ["المنصورة", "طلخا", "ميت غمر", "الزقازيق"],
    الغربية:    ["طنطا", "المحلة", "كفر الزيات", "زفتى"],
    المنوفية:   ["شبين الكوم", "مدينة السادات", "الشهداء", "قويسنا"],
    القليوبية:  ["بنها", "شبرا الخيمة", "القناطر"],
    الشرقية:    ["الزقازيق", "العاشر من رمضان", "بلبيس"],
    أسيوط:     ["أسيوط", "ديروط", "أبنوب"],
    سوهاج:     ["سوهاج", "أخميم", "جرجا"],
    الأقصر:    ["الأقصر", "الكرنك", "إسنا"],
    أسوان:     ["أسوان", "كوم أمبو", "أبو سمبل"]
  };

  /* ═══════════════════════════════════════
     STORAGE HELPERS
  ═══════════════════════════════════════ */
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* storage full — silent fail */ }
  }

  /* ═══════════════════════════════════════
     CART
  ═══════════════════════════════════════ */
  function getCart() { return read(CART_KEY, []); }

  function setCart(cart) {
    write(CART_KEY, cart);
    updateCartCounter();
  }

  function addToCart(id, size) {
    const product = window.getProductById ? window.getProductById(id) : null;
    if (!product) return;
    const selectedSize = size || (product.sizes && product.sizes[0]) || "M";
    const cart = getCart();
    const existing = cart.find((e) => e.id === product.id && e.size === selectedSize);
    if (existing) {
      existing.qty += 1;
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
    const item = cart.find((e) => e.id === Number(id) && e.size === size);
    if (!item) return;
    item.qty = Math.max(1, Number(qty));
    setCart(cart);
    renderCartPage();
  }

  function applyDiscount(code) {
    const normalized = String(code || "").trim().toUpperCase();
    const percent = DISCOUNT_CODES[normalized];
    if (percent) {
      write(DISCOUNT_KEY, { code: normalized, percent });
      showToast(`تم تطبيق خصم ${percent}% ✓`);
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
      const p = window.getProductById ? window.getProductById(item.id) : null;
      return sum + (p ? p.price * item.qty : 0);
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

  /* ═══════════════════════════════════════
     TOAST
  ═══════════════════════════════════════ */
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
    window.setTimeout(() => toast.remove(), 2800);
  }

  /* ═══════════════════════════════════════
     THEME TOGGLE — LIGHT / DARK
  ═══════════════════════════════════════ */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    write(THEME_KEY, theme);
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.textContent = theme === "light" ? "🌙" : "☀";
      btn.setAttribute("aria-label", theme === "light" ? "تفعيل الوضع الليلي" : "تفعيل الوضع النهاري");
      btn.title = theme === "light" ? "وضع ليلي" : "وضع نهاري";
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  function injectThemeToggle() {
    document.querySelectorAll(".nav-actions").forEach((container) => {
      if (container.querySelector(".theme-toggle")) return; // avoid duplicates
      const btn = document.createElement("button");
      btn.className = "theme-toggle";
      btn.type = "button";
      // Insert before the first child (before search icon)
      container.insertBefore(btn, container.firstChild);
      btn.addEventListener("click", toggleTheme);
    });
  }

  function initTheme() {
    const saved = read(THEME_KEY, null);
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    const theme = saved || (prefersLight ? "light" : "dark");
    applyTheme(theme);
  }

  /* ═══════════════════════════════════════
     PRODUCT ACTIONS
  ═══════════════════════════════════════ */
  function bindProductActions(scope) {
    scope = scope || document;

    scope.querySelectorAll("[data-add-cart]").forEach((btn) => {
      btn.addEventListener("click", () => addToCart(btn.dataset.addCart));
    });

    scope.querySelectorAll("[data-wishlist]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.wishlist);
        const wishlist = read(WISHLIST_KEY, []);
        const exists = wishlist.includes(id);
        const next = exists ? wishlist.filter((i) => i !== id) : wishlist.concat(id);
        write(WISHLIST_KEY, next);
        btn.classList.toggle("is-active", !exists);
        showToast(exists ? "تم الحذف من المفضلة" : "تمت الإضافة للمفضلة ♡");
      });
    });

    scope.querySelectorAll("[data-quick-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const product = window.getProductById && window.getProductById(btn.dataset.quickView);
        if (product) showToast(`${product.name} — ${window.formatPrice ? window.formatPrice(product.price) : product.price + " جنيه"}`);
      });
    });
  }

  /* ═══════════════════════════════════════
     RENDER — FEATURED (index.html)
  ═══════════════════════════════════════ */
  function renderFeatured() {
    const grid = document.querySelector("[data-featured-products]");
    if (grid && window.renderProductGrid && window.JT_PRODUCTS) {
      window.renderProductGrid(grid, window.JT_PRODUCTS.slice(0, 4), { skeletonCount: 4 });
    }
  }

  /* ═══════════════════════════════════════
     RENDER — PRODUCTS GRID (products/category)
  ═══════════════════════════════════════ */
  function filterProducts() {
    const grid = document.querySelector("[data-products-grid]");
    if (!grid || !window.JT_PRODUCTS) return;

    const params        = new URLSearchParams(location.search);
    const initialCat    = params.get("category") || params.get("cat") || "all";
    const tabs          = document.querySelector("[data-category-tabs]");
    const sortEl        = document.querySelector("[data-sort]");
    const searchEl      = document.querySelector("[data-shop-search]");
    const countEl       = document.querySelector("[data-result-count]");
    const emptyEl       = document.querySelector("[data-empty]");

    let state = { category: initialCat, sort: "newest", query: "" };

    function syncTabs() {
      if (!tabs) return;
      tabs.querySelectorAll("[data-category]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.category === state.category);
      });
    }

    function getList() {
      const q = state.query.trim().toLowerCase();
      let list = window.JT_PRODUCTS.filter((p) => {
        const inCat    = state.category === "all" || p.category === state.category;
        const inSearch = !q || p.name.toLowerCase().includes(q) || (window.JT_CATEGORIES && window.JT_CATEGORIES[p.category] && window.JT_CATEGORIES[p.category].toLowerCase().includes(q));
        return inCat && inSearch;
      });

      if (state.sort === "price-asc")  list = list.slice().sort((a, b) => a.price - b.price);
      if (state.sort === "price-desc") list = list.slice().sort((a, b) => b.price - a.price);
      if (state.sort === "newest")     list = list.slice().sort((a, b) => b.id - a.id);
      return list;
    }

    function render() {
      const list = getList();
      if (countEl) countEl.textContent = `${list.length} منتج`;
      if (emptyEl) emptyEl.classList.toggle("is-visible", list.length === 0);
      if (window.renderProductGrid) {
        window.renderProductGrid(grid, list, { skeletonCount: Math.min(list.length || 3, 6), delay: 160 });
      }
    }

    if (tabs) {
      tabs.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-category]");
        if (!btn) return;
        state.category = btn.dataset.category;
        syncTabs();
        render();
      });
    }
    if (sortEl)   sortEl.addEventListener("change", () => { state.sort = sortEl.value; render(); });
    if (searchEl) searchEl.addEventListener("input",  () => { state.query = searchEl.value; render(); });

    syncTabs();
    render();
  }

  /* ═══════════════════════════════════════
     RENDER — SEARCH PAGE
  ═══════════════════════════════════════ */
  function renderSearchPage() {
    const input = document.querySelector("[data-global-search]");
    const grid  = document.querySelector("[data-search-results]");
    if (!input || !grid || !window.JT_PRODUCTS) return;

    function render() {
      const q    = input.value.trim().toLowerCase();
      const list = q
        ? window.JT_PRODUCTS.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
        : window.JT_PRODUCTS;
      if (window.renderProductGrid) window.renderProductGrid(grid, list, { delay: 100 });
    }

    input.addEventListener("input", render);
    render();
  }

  /* ═══════════════════════════════════════
     RENDER — CART PAGE
  ═══════════════════════════════════════ */
  function renderCartPage() {
    const list = document.querySelector("[data-cart-list]");
    if (!list || !window.getProductById) return;

    const cart = getCart();
    if (!cart.length) {
      list.innerHTML = `<div class="glass-card" style="text-align:center;padding:30px;">السلة فارغة حالياً. <a href="products.html" style="color:#FF778F;font-weight:900;">تسوق الآن</a></div>`;
    } else {
      list.innerHTML = cart.map((item) => {
        const p = window.getProductById(item.id);
        if (!p) return "";
        const fp = window.formatPrice ? window.formatPrice(p.price * item.qty) : `${p.price * item.qty} جنيه`;
        return `
          <article class="cart-item">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            <div>
              <h3>${p.name}</h3>
              <p>المقاس: ${item.size}</p>
              <strong style="color:#FF778F;">${fp}</strong>
            </div>
            <div class="cart-item-actions">
              <div class="qty-control" aria-label="تعديل الكمية">
                <button class="qty-btn" type="button" data-qty-minus="${item.id}" data-size="${item.size}" aria-label="تقليل">−</button>
                <strong>${item.qty}</strong>
                <button class="qty-btn" type="button" data-qty-plus="${item.id}"  data-size="${item.size}" aria-label="زيادة">+</button>
              </div>
              <button class="remove-btn" type="button" data-remove-cart="${item.id}" data-size="${item.size}" aria-label="حذف ${p.name}">×</button>
            </div>
          </article>
        `;
      }).join("");
    }

    const totals = cartTotals();
    function setT(sel, val) { document.querySelectorAll(sel).forEach((n) => { n.textContent = val; }); }
    const fp = window.formatPrice || ((v) => `${v} جنيه`);
    setT("[data-subtotal]", fp(totals.subtotal));
    setT("[data-discount]", `- ${fp(totals.discountValue)}`);
    setT("[data-shipping]", fp(totals.shipping));
    setT("[data-total]",    fp(totals.total));

    list.querySelectorAll("[data-qty-minus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = getCart().find((e) => e.id === Number(btn.dataset.qtyMinus) && e.size === btn.dataset.size);
        if (item) updateQuantity(item.id, item.size, item.qty - 1);
      });
    });
    list.querySelectorAll("[data-qty-plus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = getCart().find((e) => e.id === Number(btn.dataset.qtyPlus) && e.size === btn.dataset.size);
        if (item) updateQuantity(item.id, item.size, item.qty + 1);
      });
    });
    list.querySelectorAll("[data-remove-cart]").forEach((btn) => {
      btn.addEventListener("click", () => removeFromCart(btn.dataset.removeCart, btn.dataset.size));
    });
  }

  /* ═══════════════════════════════════════
     FORM VALIDATION
  ═══════════════════════════════════════ */
  function validateField(field) {
    const value = field.value.trim();
    const name  = field.name;
    let msg = "";
    if (field.required && !value)                          msg = "هذا الحقل مطلوب";
    if (!msg && name === "name"    && value.length < 2)    msg = "الاسم يجب أن يكون حرفين على الأقل";
    if (!msg && name === "phone"   && !egyptPhoneRegex.test(value)) msg = "اكتب رقم مصري صحيح يبدأ بـ 01";
    if (!msg && name === "address" && value.length < 8)    msg = "اكتب عنوان كامل وواضح";
    const err = field.closest(".field") && field.closest(".field").querySelector(".error");
    if (err) err.textContent = msg;
    return !msg;
  }

  function bindForms() {
    document.querySelectorAll("[data-validate-form]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fields = Array.from(form.querySelectorAll("input[required], textarea[required], select[required]"));
        const valid  = fields.map(validateField).every(Boolean);
        if (!valid) return;
        const successEl = form.querySelector("[data-success]");
        if (successEl) successEl.classList.add("is-visible");
        if (form.dataset.clearCart === "true") {
          localStorage.removeItem(CART_KEY);
          localStorage.removeItem(DISCOUNT_KEY);
          updateCartCounter();
          renderCartPage();
        }
        showToast(form.dataset.successToast || "تم الإرسال بنجاح ✓");
        // Reset after 1s to let success message show
        window.setTimeout(() => form.reset(), 1000);
      });

      form.querySelectorAll("input, textarea, select").forEach((field) => {
        field.addEventListener("blur", () => validateField(field));
      });
    });

    // Governorate / City dropdowns
    const govEl  = document.querySelector("[data-governorate]");
    const cityEl = document.querySelector("[data-city]");
    if (govEl && cityEl) {
      govEl.innerHTML = `<option value="">اختر المحافظة</option>${Object.keys(cities).map((n) => `<option value="${n}">${n}</option>`).join("")}`;
      govEl.addEventListener("change", () => {
        cityEl.innerHTML = `<option value="">اختر المدينة</option>${(cities[govEl.value] || []).map((n) => `<option value="${n}">${n}</option>`).join("")}`;
      });
    }
  }

  /* ═══════════════════════════════════════
     DISCOUNT & COUPON COPY
  ═══════════════════════════════════════ */
  function bindDiscount() {
    document.querySelectorAll("[data-apply-discount]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = document.querySelector("[data-discount-code]");
        applyDiscount(input ? input.value : "");
      });
    });

    document.querySelectorAll("[data-copy-coupon]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.dataset.copyCoupon || "JOKER10";
        navigator.clipboard?.writeText(code).catch(() => {});
        showToast("تم نسخ الكود ✓");
      });
    });
  }

  /* ═══════════════════════════════════════
     COUNTDOWN — Persistent across page reloads
  ═══════════════════════════════════════ */
  function bindCountdown() {
    const node = document.querySelector("[data-countdown]");
    if (!node) return;

    let endTime = read(COUNTDOWN_KEY, null);
    const now   = Date.now();

    // Create a new 36-hour window if no saved end or if expired
    if (!endTime || endTime <= now) {
      endTime = now + 1000 * 60 * 60 * 36;
      write(COUNTDOWN_KEY, endTime);
    }

    function tick() {
      const diff = Math.max(0, endTime - Date.now());
      const h = String(Math.floor(diff / 3_600_000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60_000) / 1_000)).padStart(2, "0");
      node.textContent = `${h}:${m}:${s}`;
      if (diff === 0) clearInterval(timer);
    }

    tick();
    const timer = setInterval(tick, 1000);
  }

  /* ═══════════════════════════════════════
     NAVIGATION — Scroll, Drawer, ScrollTop
  ═══════════════════════════════════════ */
  function bindNavigation() {
    const header = document.querySelector("[data-header]");
    const drawer = document.querySelector("[data-mobile-drawer]");

    function updateHeader() {
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 20);
    }

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    document.querySelectorAll("[data-menu-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => drawer && drawer.classList.add("is-open"));
    });

    document.querySelectorAll("[data-drawer-close], [data-mobile-drawer] a").forEach((el) => {
      el.addEventListener("click", () => drawer && drawer.classList.remove("is-open"));
    });

    // Close drawer on outside click
    document.addEventListener("click", (e) => {
      if (drawer && drawer.classList.contains("is-open") && !drawer.contains(e.target) && !e.target.closest("[data-menu-toggle]")) {
        drawer.classList.remove("is-open");
      }
    });

    const scrollTop = document.querySelector("[data-scroll-top]");
    if (scrollTop) {
      window.addEventListener("scroll", () => {
        scrollTop.classList.toggle("is-visible", window.scrollY > 500);
      }, { passive: true });
      scrollTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  }

  /* ═══════════════════════════════════════
     INTERSECTION OBSERVER — fade-in
  ═══════════════════════════════════════ */
  function observe(scope) {
    scope = scope || document;
    const items = scope.querySelectorAll ? scope.querySelectorAll(".fade-in") : [];
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    items.forEach((el) => io.observe(el));
  }

  /* ═══════════════════════════════════════
     LOADER
  ═══════════════════════════════════════ */
  function hideLoader() {
    const loader = document.querySelector("[data-loader]");
    if (loader) window.setTimeout(() => loader.classList.add("is-hidden"), 400);
  }

  /* ═══════════════════════════════════════
     GLOBAL EXPORTS
  ═══════════════════════════════════════ */
  window.JokerTeam = { bindProductActions, observe, renderCartPage };
  window.addToCart      = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateQuantity = updateQuantity;
  window.applyDiscount  = applyDiscount;

  /* ═══════════════════════════════════════
     INIT
  ═══════════════════════════════════════ */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();          // Apply saved theme FIRST (before render)
    injectThemeToggle();  // Add toggle button to all .nav-actions
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
