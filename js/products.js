const JT_PRODUCTS = [
  {
    id: 1,
    name: "تيشيرت أوفر سايز Chaos",
    category: "tshirts",
    price: 350,
    badge: "الأكثر مبيعاً",
    image: "images/products/product-3.png",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: 2,
    name: "هودي Joker Team أسود",
    category: "hoodies",
    price: 750,
    badge: "جديد",
    image: "images/products/product-1.png",
    sizes: ["M", "L", "XL", "XXL"]
  },
  {
    id: 3,
    name: "بنطلون كارجو ستريت",
    category: "pants",
    price: 650,
    badge: "حصري",
    image: "images/products/product-2.png",
    sizes: ["30", "32", "34", "36"]
  },
  {
    id: 4,
    name: "تيشيرت Graffiti Drop",
    category: "tshirts",
    price: 390,
    badge: "جديد",
    image: "images/products/product-4.png",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: 5,
    name: "كاب مطرز JT",
    category: "accessories",
    price: 250,
    badge: "Limited",
    image: "images/products/product-5.png",
    sizes: ["One Size"]
  },
  {
    id: 6,
    name: "هودي Red Signal",
    category: "hoodies",
    price: 720,
    badge: "Hot",
    image: "images/products/product-6.png",
    sizes: ["M", "L", "XL"]
  },
  {
    id: 7,
    name: "تيشيرت أبيض Minimal JT",
    category: "tshirts",
    price: 340,
    badge: "",
    image: "images/T-shirt/product-1.png",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: 8,
    name: "تيشيرت Broken Logo",
    category: "tshirts",
    price: 360,
    badge: "Drop",
    image: "images/T-shirt/product-2.png",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: 9,
    name: "جاكيت Night Run",
    category: "jackets",
    price: 980,
    badge: "حصري",
    image: "images/products/product-1.png",
    sizes: ["M", "L", "XL"]
  },
  {
    id: 10,
    name: "سنيكر Urban White",
    category: "shoes",
    price: 890,
    badge: "جديد",
    image: "images/products/product-6.png",
    sizes: ["40", "41", "42", "43", "44"]
  },
  {
    id: 11,
    name: "بنطلون Track Line",
    category: "pants",
    price: 590,
    badge: "",
    image: "images/T-shirt/product-3.png",
    sizes: ["M", "L", "XL"]
  },
  {
    id: 12,
    name: "شنطة Crossbody JT",
    category: "accessories",
    price: 420,
    badge: "الأكثر طلباً",
    image: "images/T-shirt/product-4.png",
    sizes: ["One Size"]
  }
];

const JT_CATEGORIES = {
  all: "الكل",
  tshirts: "تيشيرتات",
  hoodies: "هوديز",
  jackets: "جاكيتات",
  pants: "بناطيل",
  shoes: "أحذية",
  accessories: "إكسسوارات"
};

function getProductById(id) {
  return JT_PRODUCTS.find((product) => product.id === Number(id));
}

function formatPrice(price) {
  return `${Number(price).toLocaleString("ar-EG")} جنيه`;
}

function productCardTemplate(product, index = 0) {
  const wishlist = JSON.parse(localStorage.getItem("jt_wishlist") || "[]");
  const wished = wishlist.includes(product.id);
  return `
    <article class="product-card fade-in" data-product-card data-category="${product.category}" style="animation-delay:${index * 60}ms">
      ${product.badge ? `<span class="badge">${product.badge}</span>` : ""}
      <button class="wish-btn ${wished ? "is-active" : ""}" type="button" data-wishlist="${product.id}" aria-label="إضافة ${product.name} للمفضلة">♡</button>
      <div class="product-media">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        <button class="quick-view" type="button" data-quick-view="${product.id}">عرض سريع</button>
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <div class="price-row">
          <strong class="price">${formatPrice(product.price)}</strong>
          <button class="cart-mini" type="button" data-add-cart="${product.id}" aria-label="أضف ${product.name} للسلة">+</button>
        </div>
      </div>
    </article>
  `;
}

function renderProductGrid(target, list, options = {}) {
  if (!target) return;
  const skeletonCount = options.skeletonCount || Math.min(list.length || 4, 4);
  target.innerHTML = Array.from({ length: skeletonCount }, () => `<div class="skeleton"></div>`).join("");

  window.setTimeout(() => {
    target.innerHTML = list.map(productCardTemplate).join("");
    target.classList.add("stagger");
    if (window.JokerTeam) {
      window.JokerTeam.bindProductActions(target);
      window.JokerTeam.observe(target);
    }
  }, options.delay || 260);
}

window.JT_PRODUCTS = JT_PRODUCTS;
window.JT_CATEGORIES = JT_CATEGORIES;
window.getProductById = getProductById;
window.formatPrice = formatPrice;
window.productCardTemplate = productCardTemplate;
window.renderProductGrid = renderProductGrid;
