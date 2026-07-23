"use client";

import { useEffect, useMemo, useState } from "react";
import { menuItems as defaultMenuItems, MenuItem } from "@/data/menu";
import {
  defaultSettings,
  loadMenu,
  loadSettings,
  subscribeToMenu,
  subscribeToSettings,
  type RestaurantSettings
} from "@/lib/menu-store";
import { loadCart, saveCart } from "@/lib/order-store";
import AIOrderModal from "@/components/AIOrderModal";
import CheckoutModal from "@/components/CheckoutModal";
import ProductCustomizer from "@/components/ProductCustomizer";

type CartItem = MenuItem & { quantity: number; modifiers?: string[]; cartKey?: string };

export default function Storefront() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    loadMenu().then(setMenuItems);
    loadSettings().then(setSettings);
    setCart(loadCart() as CartItem[]);
    const unsubscribeMenu = subscribeToMenu(() => { loadMenu().then(setMenuItems); });
    const unsubscribeSettings = subscribeToSettings(() => { loadSettings().then(setSettings); });
    return () => {
      unsubscribeMenu();
      unsubscribeSettings();
    };
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (item.available === false) return false;
      if (selectedCategory !== "All" && item.category !== selectedCategory) return false;
      if (!query) return true;
      return `${item.name} ${item.description} ${item.category} ${item.badge ?? ""}`.toLowerCase().includes(query);
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const featuredItems = useMemo(() => {
    const badged = menuItems.filter((item) => item.available !== false && item.badge);
    return (badged.length ? badged : menuItems.filter((item) => item.available !== false)).slice(0, 4);
  }, [menuItems]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(menuItems.map(item => item.category)))], [menuItems]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function openProduct(item: MenuItem) {
    if ((item.modifierGroups?.length ?? 0) > 0) setCustomizingItem(item);
    else addConfiguredItem(item, item.price, []);
  }

  function addConfiguredItem(item: MenuItem, unitPrice: number, modifiers: string[]) {
    const cartKey = `${item.id}:${modifiers.join("|")}:${unitPrice.toFixed(2)}`;
    setCart((current) => {
      const existing = current.find((cartItem) => (cartItem.cartKey ?? String(cartItem.id)) === cartKey);
      if (existing) {
        return current.map((cartItem) =>
          (cartItem.cartKey ?? String(cartItem.id)) === cartKey
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...current, { ...item, price: unitPrice, quantity: 1, modifiers, cartKey }];
    });
    setCartOpen(true);
  }

  function changeQuantity(key: string, amount: number) {
    setCart((current) =>
      current
        .map((item) =>
          (item.cartKey ?? String(item.id)) === key
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  return (
    <main>
      <header className="siteHeader">
        <a className="brand" href="#top" aria-label={`${settings.restaurantName} home`}>
          <span className="brandMark">{settings.restaurantName.charAt(0).toUpperCase()}</span>
          <span>
            <strong>{settings.restaurantName.replace(/ Takeaway$/i, "")}</strong>
            <small>TAKEAWAY</small>
          </span>
        </a>

        <nav className="desktopNav" aria-label="Main navigation">
          <a href="#menu">Menu</a>
          <a href="#how">How it works</a>
          <a href="#reviews">Reviews</a>
          <a href="/account">My account</a>
        </nav>

        <button className="cartButton" onClick={() => setCartOpen(true)}>
          <span>Basket</span>
          <strong>{totalItems}</strong>
        </button>
      </header>

      <section className="hero" id="top">
        <div className="heroGlow heroGlowOne" />
        <div className="heroGlow heroGlowTwo" />

        <div className="heroContent">
          <div className="eyebrow">{settings.address} · Delivery in {settings.deliveryMinutes} min</div>
          <h1>
            {settings.tagline.split(",")[0]},
            <span>{settings.tagline.includes(",") ? "," + settings.tagline.split(",").slice(1).join(",") : " ordered your way."}</span>
          </h1>
          <p className="heroCopy">
            Browse the menu or simply tell our AI what you feel like eating.
            Fast, natural ordering without endless tapping.
          </p>

          <div className="heroActions">
            <button className="primaryButton" onClick={() => setAiOpen(true)}>
              <span className="buttonIcon">✦</span>
              Order with AI
            </button>
            <a className="secondaryButton" href="#menu">Browse menu</a>
          </div>

          <div className="trustRow">
            <div>
              <strong>4.8</strong>
              <span>★★★★★</span>
              <small>Local rating</small>
            </div>
            <div>
              <strong>{settings.deliveryMinutes} min</strong>
              <small>Average delivery</small>
            </div>
            <div>
              <strong>€{settings.minimumOrder}</strong>
              <small>Minimum delivery</small>
            </div>
          </div>
        </div>

        <div className="heroVisual" aria-hidden="true">
          <div className="foodOrbit orbitOne">🍕</div>
          <div className="foodOrbit orbitTwo">🍟</div>
          <div className="foodOrbit orbitThree">🥤</div>
          <div className="plate">
            <div className="burger">🍔</div>
          </div>
          <div className="floatingCard floatingCardTop">
            <span>🔥</span>
            <div>
              <strong>Most ordered</strong>
              <small>Signature Cheeseburger</small>
            </div>
          </div>
          <div className="floatingCard floatingCardBottom">
            <span>⚡</span>
            <div>
              <strong>Ready fast</strong>
              <small>Collection in 20 min</small>
            </div>
          </div>
        </div>
      </section>

      <section className="benefitStrip">
        <div><span>✓</span> Direct local ordering</div>
        <div><span>✓</span> Cash or card</div>
        <div><span>✓</span> Delivery & collection</div>
        <div><span>✓</span> AI ordering assistant</div>
      </section>

      <section className="menuSection" id="menu">
        <div className="promoRibbon">
          <div><span>WEEKEND DEAL</span><strong>Free delivery on orders over €{settings.freeDeliveryThreshold}</strong></div>
          <button onClick={() => document.getElementById("full-menu")?.scrollIntoView({ behavior: "smooth" })}>View menu →</button>
        </div>

        <div className="sectionHeading">
          <div>
            <span className="sectionLabel">Made to order</span>
            <h2>Popular right now</h2>
          </div>
          <p>Freshly prepared favourites, delivered straight to your door.</p>
        </div>

        <div className="featuredRail" aria-label="Featured menu items">
          {featuredItems.map((item) => (
            <article className="featuredCard" key={`featured-${item.id}`}>
              <div className="featuredMedia">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>{item.emoji}</span>}</div>
              <div><small>{item.badge || "POPULAR"}</small><h3>{item.name}</h3><p>{item.description}</p></div>
              <div className="featuredAction"><strong>€{item.price.toFixed(2)}</strong><button onClick={() => openProduct(item)}>+</button></div>
            </article>
          ))}
        </div>

        <div className="menuToolbar" id="full-menu">
          <div className="menuSearch"><span>⌕</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search pizza, burgers, meal deals…" aria-label="Search menu" />{searchQuery && <button onClick={() => setSearchQuery("")}>Clear</button>}</div>
          <div className="fulfilmentPills"><span>Delivery · {settings.deliveryMinutes} min</span><span>Collection · {settings.collectionMinutes} min</span></div>
        </div>

        <div className="categoryTabs" role="tablist" aria-label="Menu categories">
          {categories.map((category) => (
            <button
              key={category}
              className={selectedCategory === category ? "active" : ""}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="menuGrid">
          {visibleItems.map((item) => (
            <article className="menuCard" key={item.id}>
              <div className="menuImage">
                {item.badge && <span className="menuBadge">{item.badge}</span>}
                {item.imageUrl ? <img className="foodPhoto" src={item.imageUrl} alt={item.name} loading="lazy" /> : <span className="foodEmoji">{item.emoji}</span>}
              </div>
              <div className="menuCardBody">
                <div className="menuCardTop">
                  <h3>{item.name}</h3>
                  <strong>€{item.price.toFixed(2)}</strong>
                </div>
                <p>{item.description}</p>
                <button disabled={!settings.acceptingOrders} onClick={() => openProduct(item)}>
                  {settings.acceptingOrders ? "Add to basket" : "Ordering paused"} <span>+</span>
                </button>
              </div>
            </article>
          ))}
        </div>
        {visibleItems.length === 0 && <div className="emptySearch"><strong>No menu items found</strong><p>Try a different search or category.</p><button onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}>Show full menu</button></div>}
      </section>

      <section className="aiShowcase" id="how">
        <div className="aiPanel">
          <div className="aiMiniHeader">
            <div className="aiAvatar">✦</div>
            <div>
              <strong>{settings.restaurantName} AI Assistant</strong>
              <small><span /> Online now</small>
            </div>
          </div>

          <div className="chatBubble userBubble">
            Two cheeseburger meals, one Coke Zero and one Fanta, for delivery.
          </div>
          <div className="chatBubble aiBubble">
            Perfect. Would you like regular or garlic fries with the second meal?
          </div>
          <div className="choiceRow">
            <button>Regular fries</button>
            <button>Garlic fries +€1</button>
          </div>
        </div>

        <div className="aiCopy">
          <span className="sectionLabel">A smarter way to order</span>
          <h2>Just say what you want.</h2>
          <p>
            Bite2Eat understands natural language, handles meal choices and builds
            the basket for the customer. It feels like placing an order with a
            helpful member of staff.
          </p>
          <ul>
            <li><span>01</span> Type or speak your order naturally</li>
            <li><span>02</span> AI asks only the questions it needs</li>
            <li><span>03</span> Review, pay and track the order</li>
          </ul>
          <button className="primaryButton dark" onClick={() => setAiOpen(true)}>
            Try AI ordering
          </button>
        </div>
      </section>

      <section className="reviewsSection" id="reviews">
        <div className="sectionHeading">
          <div>
            <span className="sectionLabel">Loved locally</span>
            <h2>What customers say</h2>
          </div>
        </div>
        <div className="reviewGrid">
          {[
            ["“Fast delivery and the burgers were excellent.”", "Sarah M."],
            ["“The AI order was surprisingly easy. Done in under a minute.”", "David K."],
            ["“Great food, clear updates and no waiting on the phone.”", "Emma R."]
          ].map(([quote, name]) => (
            <blockquote key={name}>
              <div className="stars">★★★★★</div>
              <p>{quote}</p>
              <footer>{name}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <footer className="siteFooter">
        <div className="brand footerBrand">
          <span className="brandMark">{settings.restaurantName.charAt(0).toUpperCase()}</span>
          <span>
            <strong>{settings.restaurantName}</strong>
            <small>POWERED BY BITE2EAT</small>
          </span>
        </div>
        <p>Premium restaurant ordering, built around the customer.</p>
        <small>Online ordering powered by Bite2Eat</small>
      </footer>

      <div className={`overlay ${cartOpen ? "show" : ""}`} onClick={() => setCartOpen(false)} />

      <aside className={`cartDrawer ${cartOpen ? "open" : ""}`} aria-label="Shopping basket">
        <div className="drawerHeader">
          <div>
            <span className="sectionLabel">Your order</span>
            <h2>Basket</h2>
          </div>
          <button className="closeButton" onClick={() => setCartOpen(false)}>×</button>
        </div>

        <div className="cartItems">
          {cart.length === 0 ? (
            <div className="emptyCart">
              <span>🛍️</span>
              <h3>Your basket is empty</h3>
              <p>Add something delicious from the menu.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div className="cartItem" key={item.cartKey ?? item.id}>
                <div className="cartEmoji">{item.emoji}</div>
                <div className="cartItemInfo">
                  <strong>{item.name}</strong>
                  <small>€{item.price.toFixed(2)} each</small>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <small className="itemModifiers">{item.modifiers.join(" · ")}</small>
                  )}
                  <div className="quantityControl">
                    <button onClick={() => changeQuantity(item.cartKey ?? String(item.id), -1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => changeQuantity(item.cartKey ?? String(item.id), 1)}>+</button>
                  </div>
                </div>
                <strong>€{(item.price * item.quantity).toFixed(2)}</strong>
              </div>
            ))
          )}
        </div>

        <div className="cartSummary">
          <div><span>Subtotal</span><strong>€{subtotal.toFixed(2)}</strong></div>
          <div><span>Delivery</span><strong>{subtotal >= settings.freeDeliveryThreshold ? "FREE" : `€${settings.deliveryFee.toFixed(2)}`}</strong></div>
          <div className="cartTotal">
            <span>Total</span>
            <strong>€{(subtotal + (subtotal > 0 && subtotal < settings.freeDeliveryThreshold ? settings.deliveryFee : 0)).toFixed(2)}</strong>
          </div>
          <button className="checkoutButton" disabled={cart.length === 0 || !settings.acceptingOrders} onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
            Continue to checkout
          </button>
        </div>
      </aside>

      <ProductCustomizer
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
        onAdd={addConfiguredItem}
      />

      <CheckoutModal
        open={checkoutOpen}
        cart={cart}
        onClose={() => setCheckoutOpen(false)}
        onOrderPlaced={() => setCart([])}
      />

      <AIOrderModal
        open={aiOpen}
        basket={cart}
        menuItems={menuItems}
        onClose={() => setAiOpen(false)}
        onBasketChange={setCart}
        onOpenBasket={() => setCartOpen(true)}
      />
    </main>
  );
}
