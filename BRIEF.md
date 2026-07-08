Build the Borderless Studio agency landing page at /c/Users/jASDASF/borderless-studio/

=== BRAND ===
Name: Borderless Studio
Tagline: "Websites without borders"
Vibe: Dark, premium, minimal. Think high-end boutique agency. AI-powered. Fast. Cross-border (NL/PL/EN).

=== TECH SPEC ===
- Pure HTML/CSS/JS, no frameworks, no npm, no build tools
- 3 languages: EN (default/fallback), NL, PL
- Same i18n pattern as Lief Schoon (locales/*.json + data-i18n attributes)
- Web3Forms for contact (access_key: 6c70aaf5-dd2a-474c-94fd-c54477efcf26)
- Production-ready: SEO, GDPR, cookie consent, sitemap

=== DESIGN SYSTEM ===
- Background: #0A0A0A (near-black)
- Text: #FFFFFF
- Body text: #A0A0A0 (soft gray)
- Accent gradient: #6C5CE7 → #00D2FF (violet to cyan)
- Or cool alternative: #FF6B6B → #FFE66D (warm) — pick the cooler one
- Fonts: Inter (body) + Space Grotesk or DM Sans (headings) — modern, clean
- Big typography, lots of whitespace, minimal elements
- Subtle animations on scroll (fade-up, nothing flashy)

=== PAGES ===
1. index.html — full landing page
2. privacy.html — GDPR statement
3. contact.html — standalone contact form

=== SECTIONS (index.html) ===

1. NAV: Logo "Borderless" + links (Work, Services, Pricing, Contact) + language switcher (EN/NL/PL). Fixed, dark glass effect.

2. HERO:
   - Large: "Your digital presence, without limits." 
   - Sub: "We build fast, AI-powered websites. Multilingual by default. NL · PL · EN."
   - CTA: "See our work ↓"
   - Background: subtle animated gradient or noise texture, very subtle

3. SERVICES (3 cards in a row):
   - Websites: "Lightning-fast multilingual sites. From €950."
   - Digital Marketing: "Local SEO & Google Business. From €300/mo."
   - Automation: "Custom scripts & tools. From €500."
   Each card: icon (emoji or unicode), title, short desc, 3 bullet points

4. WORK (3 case study cards, horizontal scroll or grid):
   - Lief Schoon (cleaning business, 3 langs, 2-day build)
   - Car Flipping Engine (automation, 24/7 cron)
   - Paper Trading Bot (finance, real-time data)
   Each card: image placeholder (colored gradient block), tag, title, short desc

5. PRICING (3 columns):
   - Website: from €950 (one-time)
   - Growth: from €300/mo (monthly)
   - Custom: Let's talk
   Each card: title, price (large), feature list, CTA button

6. CONTACT: Minimal form (name, email, message) + email link. No address — we're remote-first.

7. FOOTER: Logo, "Websites without borders.", © 2026, privacy link.

=== TECH DETAILS ===
- <head>: canonical, OG tags, Twitter card, JSON-LD Organization schema
- robots.txt, sitemap.xml, CNAME (borderless.nl)
- Cookie banner (functional only, same pattern as Lief Schoon)
- Web3Forms honeypot spam protection
- Privacy page with GDPR statement
- favicon (SVG emoji or simple "B" mark)

=== ALL 3 LOCALE FILES ===
Create locales/nl.json and locales/pl.json — full translations of locales/en.json (already created at /c/Users/jASDASF/borderless-studio/locales/en.json — READ IT FIRST). Keep all keys identical. 

NL translations should be native Dutch (not Google Translate quality). PL translations native Polish.

=== ADDITIONAL FILES ===
- robots.txt: Allow all, sitemap ref
- sitemap.xml: home + privacy + contact
- CNAME: borderless.nl
- assets/og-image.svg (1200x630, dark bg, gradient accent, "Borderless" text)

=== CRITICAL ===
- Read locales/en.json FIRST to understand all keys
- Create ALL 3 HTML files (index, privacy, contact)
- Create ALL locale files (en already done, create nl + pl)
- Create ALL supporting files (CSS, JS, robots.txt, sitemap.xml, CNAME, og-image)
- Every data-i18n key must exist in all 3 locale files
- No dummy content — use real copy from en.json
- Dark theme, minimal, premium vibe — think Stripe meets Linear meets dark mode
- Use Write and Edit tools. Read files first before editing them.
- DO NOT skip any file.
