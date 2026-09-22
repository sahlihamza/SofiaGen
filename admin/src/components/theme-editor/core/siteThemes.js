import { Button } from "@sofia/ui";

/**
 * Site Themes (Templates)
 * Each theme is a pre-built page that the user can load into the GrapesJS canvas.
 * The `projectData` is the GrapesJS native format (recommended).
 * The `html` + `css` fallback is simpler but less rich.
 */

export const SITE_THEMES = [
  {
    id: "blank",
    label: "Blank Page",
    description: "Start from scratch",
    thumbnail: "ðŸ—’ï¸",

    category: "general",
    html: `<div style="padding: 80px 20px; text-align: center; font-family: sans-serif;">
      <h1 style="font-size: 48px; color: #1a1a1a;">Your Page Title</h1>
      <p style="font-size: 20px; color: #555;">Start building your page by dragging blocks from the left panel.</p>
    </div>`,
    css: "",
  },
  {
    id: "ecommerce-landing",
    label: "E-Commerce Landing",
    description: "Hero + Products + Newsletter",
    thumbnail: "ðŸ›ï¸",

    category: "ecommerce",
    html: `
      <section class="t-hero">
        <div class="t-hero__content">
          <h1 class="t-hero__title">Summer Collection 2025</h1>
          <p class="t-hero__sub">Discover our exclusive deals â€” Limited time only</p>

          <a class="t-hero__btn" href="#">Shop Now</a>
        </div>
      </section>

      <section class="t-products">
        <h2 class="t-section-title">Featured Products</h2>
        <div class="t-products__grid">
          ${[1, 2, 3, 4].map(i => `
          <div class="t-product-card">
            <div class="t-product-card__img" style="background:#e9ecef;height:200px;border-radius:8px;"></div>
            <h3 class="t-product-card__name">Product ${i}</h3>
            <p class="t-product-card__price">$${(i * 29).toFixed(2)}</p>
            <Button class="t-product-card__btn">Add to Cart</Button>
          </div>`).join('')}
        </div>
      </section>

      <section class="t-newsletter">
        <h2>Subscribe to our Newsletter</h2>
        <p>Get the latest deals straight to your inbox</p>
        <div class="t-newsletter__form">
          <input type="email" placeholder="Enter your email..." class="t-newsletter__input" />
          <Button class="t-newsletter__btn">Subscribe</Button>
        </div>
      </section>
    `,
    css: `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', sans-serif; }

      .t-hero {
        min-height: 520px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex; align-items: center; justify-content: flex-start;
        text-align: left; color: white; padding: 40px 20px;
      }
      .t-hero__title { font-size: 52px; font-weight: 800; margin-bottom: 16px; }
      .t-hero__sub { font-size: 20px; opacity: 0.9; margin-bottom: 32px; }
      .t-hero__btn {
        display: inline-block; padding: 16px 48px;
        background: white; color: #667eea;
        border-radius: 50px; font-weight: 700; font-size: 16px;
        text-decoration: none; transition: transform 0.2s;
      }
      .t-hero__btn:hover { transform: translateY(-2px); }

      .t-products { padding: 80px 40px; background: #f8f9fa; }
      .t-section-title { text-align: center; font-size: 36px; font-weight: 700; margin-bottom: 48px; color: #1a1a1a; }
      .t-products__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; max-width: 1200px; margin: 0 auto; }
      .t-product-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
      .t-product-card__name { margin-top: 16px; font-size: 16px; font-weight: 600; }
      .t-product-card__price { color: #667eea; font-weight: 700; font-size: 18px; margin: 8px 0 12px; }
      .t-product-card__btn {
        width: 100%; padding: 10px; background: #667eea; color: white;
        border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
      }

      .t-newsletter { padding: 80px 40px; background: #1a1a2e; color: white; text-align: left; }
      .t-newsletter h2 { font-size: 32px; font-weight: 700; margin-bottom: 12px; }
      .t-newsletter p { opacity: 0.7; margin-bottom: 32px; font-size: 16px; }
      .t-newsletter__form { display: flex; gap: 12px; max-width: 480px; margin: 0; }
      .t-newsletter__input {
        flex: 1; padding: 14px 20px; border: none; border-radius: 8px;
        font-size: 15px; outline: none;
      }
      .t-newsletter__btn {
        padding: 14px 28px; background: #667eea; color: white;
        border: none; border-radius: 8px; font-weight: 700; cursor: pointer;
      }
    `,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    description: "Hero + About + Contact",
    thumbnail: "ðŸŽ¨",

    category: "general",
    html: `
      <header class="p-header">
        <nav class="p-nav">
          <span class="p-nav__logo">Portfolio</span>
          <div class="p-nav__links">
            <a href="#">Work</a><a href="#">About</a><a href="#">Contact</a>
          </div>
        </nav>
      </header>

      <section class="p-hero">
        <h1>Hi, I'm <span class="p-accent">Your Name</span></h1>
        <p>Designer & Developer crafting beautiful digital experiences</p>
        <a class="p-btn" href="#">See My Work</a>
      </section>

      <section class="p-about">
        <div class="p-about__text">
          <h2>About Me</h2>
          <p>I create clean and modern digital products with a focus on user experience and pixel-perfect design.</p>
        </div>
        <div class="p-about__img" style="width:300px;height:300px;background:linear-gradient(135deg,#f093fb,#f5576c);border-radius:50%;flex-shrink:0;"></div>
      </section>
    `,
    css: `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', sans-serif; }

      .p-header { background: #0f0f0f; padding: 0 40px; }
      .p-nav { display: flex; align-items: center; justify-content: space-between; height: 64px; max-width: 1200px; margin: 0 auto; }
      .p-nav__logo { color: white; font-weight: 800; font-size: 20px; }
      .p-nav__links { display: flex; gap: 32px; }
      .p-nav__links a { color: #aaa; text-decoration: none; font-size: 15px; transition: color 0.2s; }
      .p-nav__links a:hover { color: white; }

      .p-hero { background: #0f0f0f; color: white; text-align: left; padding: 120px 40px; }
      .p-hero h1 { font-size: 64px; font-weight: 800; margin-bottom: 20px; }
      .p-accent { background: linear-gradient(135deg, #f093fb, #f5576c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .p-hero p { font-size: 22px; color: #aaa; margin-bottom: 40px; }
      .p-btn {
        display: inline-block; padding: 16px 48px;
        background: linear-gradient(135deg, #f093fb, #f5576c);
        color: white; text-decoration: none; border-radius: 50px;
        font-weight: 700; font-size: 16px;
      }

      .p-about { display: flex; align-items: center; gap: 80px; padding: 100px 80px; background: #f8f8f8; max-width: 1200px; margin: 0 auto; }
      .p-about__text h2 { font-size: 40px; font-weight: 800; margin-bottom: 20px; }
      .p-about__text p { font-size: 18px; color: #555; line-height: 1.7; }
    `,
  },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Menu + Hero + Reservation",
    thumbnail: "ðŸ½ï¸",

    category: "general",
    html: `
      <header class="r-hero">
        <div class="r-hero__content">
          <h1 class="r-hero__title">La Maison</h1>
          <p class="r-hero__sub">Fine Dining Experience</p>
          <a class="r-hero__btn" href="#">Book a Table</a>
        </div>
      </header>

      <section class="r-menu">
        <h2 class="r-section-title">Our Menu</h2>
        <div class="r-menu__grid">
          ${["Appetizers", "Main Course", "Desserts"].map(cat => `
          <div class="r-menu__card">
            <div class="r-menu__img" style="background:#ffecd2;height:160px;border-radius:8px 8px 0 0;"></div>
            <div class="r-menu__body">
              <h3>${cat}</h3>
              <p>A curated selection of our finest ${cat.toLowerCase()}.</p>
              <span class="r-menu__price">From $18</span>
            </div>
          </div>`).join('')}
        </div>
      </section>
    `,
    css: `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Georgia', serif; }

      .r-hero {
        min-height: 600px;
        background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)),
                    url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400') center/cover;
        display: flex; align-items: center; justify-content: flex-start; text-align: left; color: white;
      }
      .r-hero__title { font-size: 72px; font-weight: 700; letter-spacing: 4px; margin-bottom: 16px; }
      .r-hero__sub { font-size: 22px; opacity: 0.85; margin-bottom: 40px; letter-spacing: 2px; }
      .r-hero__btn {
        display: inline-block; padding: 16px 48px;
        border: 2px solid #d4a053; color: #d4a053;
        text-decoration: none; font-size: 16px; letter-spacing: 2px;
        transition: all 0.3s;
      }
      .r-hero__btn:hover { background: #d4a053; color: #0f0f0f; }

      .r-menu { padding: 80px 40px; background: #fafaf8; }
      .r-section-title { text-align: center; font-size: 40px; margin-bottom: 56px; color: #1a1a1a; }
      .r-menu__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; max-width: 1100px; margin: 0 auto; }
      .r-menu__card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
      .r-menu__body { padding: 24px; }
      .r-menu__body h3 { font-size: 22px; margin-bottom: 10px; }
      .r-menu__body p { color: #777; line-height: 1.6; margin-bottom: 16px; }
      .r-menu__price { color: #d4a053; font-weight: 700; font-size: 18px; }
    `,
  },
];

export const SITE_THEME_CATEGORIES = ["all", "ecommerce", "general"];
