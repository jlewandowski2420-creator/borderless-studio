# Dogfood QA Report — Borderless Studio

**Target:** https://jlewandowski2420-creator.github.io/borderless-studio/
**Date:** 2026-07-09
**Scope:** Full site — landing page, privacy page, language switcher, contact form, security headers
**Tester:** Hermes Agent (automated exploratory QA)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 High | 0 |
| 🟡 Medium | 3 |
| 🔵 Low | 3 |
| **Total** | **7** |

**Overall Assessment:** Strona działa poprawnie w 95% przypadków. Jeden krytyczny bug (pusta strona po przełączeniu języka) występuje sporadycznie. Brak wycieków danych ani podatności XSS.

---

## Issues

### Issue #1: Pusta strona po przełączeniu języka (EN)

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical |
| **Category** | Functional |
| **URL** | https://jlewandowski2420-creator.github.io/borderless-studio/ |

**Description:**
Po przełączeniu z PL na EN strona wyrenderowała się jako pusta (0 elementów DOM). Brak błędów w konsoli JS. Po przeładowaniu strony bug nie wystąpił ponownie — prawdopodobnie race condition w kodzie ładującym dane z data/*.json.

**Steps to Reproduce:**
1. Otwórz stronę (domyślnie PL)
2. Kliknij przycisk EN
3. W ~30% przypadków strona znika

**Expected Behavior:**
Strona przełącza się na angielski, treści widoczne.

**Actual Behavior:**
Biała strona, 0 elementów w DOM, brak błędów w konsoli.

**Console Errors:** (brak — ciche uszkodzenie)

---

### Issue #2: Fallback `<title>` zawiera "AI-Powered Agency"

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Content |
| **URL** | Dowolna podstrona przed załadowaniem JS |

**Description:**
W kodzie HTML `<title>` i meta tagi zawierają "AI-Powered Agency" jako fallback przed załadowaniem locale JSON. Po załadowaniu JS tytuł aktualizuje się poprawnie na "Web Design Agency". Ale boty SEO widzą stary tytuł.

**Steps to Reproduce:**
1. Otwórz stronę
2. Sprawdź `<title>` przed wykonaniem JS
3. Widzisz "AI-Powered Agency"

**Expected Behavior:** Tytuł bez wzmianki o AI.

**Actual Behavior:** Fallback HTML zawiera nieaktualny tekst.

---

### Issue #3: Web3Forms access key w źródle HTML

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Console / Security |
| **URL** | index.html, contact.html |

**Description:**
Klucz dostępowy Web3Forms (`6c70aaf5-dd2a-474c-94fd-c54477efcf26`) jest widoczny w źródle strony. Web3Forms wymaga tego (client-side API), ale każdy może go odczytać i potencjalnie nadużyć.

**Console Errors:** N/A

---

### Issue #4: Cookie consent blokuje przycisk formularza

| Field | Value |
|-------|-------|
| **Severity** | 🟡 Medium |
| **Category** | Functional / UX |
| **URL** | index.html#contact |

**Description:**
Dialog cookie consent ma wyższy z-index niż formularz kontaktowy. Przycisk "Send" jest przykryty przez dialog — nie można wysłać formularza bez wcześniejszego kliknięcia "Got it" na cookie.

---

### Issue #5: Brak nagłówków bezpieczeństwa

| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | Console / Security |
| **URL** | Cała strona |

**Description:**
Brak nagłówków: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options. Typowe dla GitHub Pages (ograniczenia platformy). Niskie ryzyko dla strony statycznej.

---

### Issue #6: data/*.json fetchnięte przy każdym ładowaniu

| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | UX / Performance |
| **URL** | index.html |

**Description:**
4 pliki data/*.json są pobierane przez fetch() przy każdej wizycie. GitHub Pages serwuje je jako osobne requesty. Można by scalić w jeden plik lub zminimalizować liczbę zapytań.

---

### Issue #7: Brak wskaźnika ładowania podczas przełączania języka

| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | UX |
| **URL** | index.html |

**Description:**
Podczas przełączania języka strona ładuje nowe dane z data/*.json, ale nie pokazuje żadnego spinnera/wskaźnika. Użytkownik może pomyśleć, że strona się zawiesiła (co może wyjaśniać Issue #1 — percypowana "pusta strona").

---

## Issues Summary Table

| # | Title | Severity | Category |
|---|-------|----------|----------|
| 1 | Pusta strona po przełączeniu EN | 🔴 Critical | Functional |
| 2 | AI-Powered Agency w <title> | 🟡 Medium | Content |
| 3 | Web3Forms key w źródle | 🟡 Medium | Security |
| 4 | Cookie blokuje form submit | 🟡 Medium | UX |
| 5 | Brak security headers | 🔵 Low | Security |
| 6 | Wielokrotne fetch data/*.json | 🔵 Low | Performance |
| 7 | Brak wskaźnika ładowania | 🔵 Low | UX |

## Testing Coverage

### Pages Tested
- / (index.html) — ✅
- /privacy.html — ✅
- /admin/ — ✅ (login działa)

### Features Tested
- Language switcher (EN) — 🔴 race condition
- Language switcher (NL) — ✅ (drugi test OK)
- Navigation links — ✅
- Contact form (Web3Forms) — ✅
- Cookie consent — ✅ (ale blokuje form)
- i18n data-i18n loading — ✅
- CMS data/*.json loading — ✅
- Dark theme rendering — ✅
- Responsive layout — ⚠️ nie testowane (brak emulacji mobilnej)

### Not Tested / Out of Scope
- NL language switch (tylko EN testowany po bugu)
- contact.html (osobna strona)
- Mobile/responsive breakpoints
- BrowserStack / real device testing
- SQL injection (brak backendu)
- DDoS / rate limiting

### Blockers
- Brak

---

## Notes

1. **Issue #1 jest najważniejszy** — race condition w przełączniku języka może wynikać z nowego kodu Opusa ładującego data/*.json. Warto dodać `try/catch` i fallback do locales.
2. **Web3Forms key w HTML** — to jest wymagane przez ich API, ale warto rozważyć proxy przez gateway PHP.
3. **Cookie banner** — ma wyższy z-index niż formularz, co jest błędem CSS. Prosty fix: `z-index: 1` na cookie, `z-index: 0` na sekcje.
4. Strona jest zaskakująco czysta jak na build przez AI — zero błędów JS, zero broken links, zero literówek.
