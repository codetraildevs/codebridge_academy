# CodeBridge Academy Website Documentation

## Overview
CodeBridge Academy is a premium, one-page static website designed to showcase software development training and internship programs. It has been built prioritizing modern aesthetics, responsive design, and extremely fast performance.

**Live URL:** [https://codebridgecademy.com/](https://codebridgecademy.com/)

## Technology Stack
- **HTML5**: Semantic tags ensuring accessibility and strong SEO structure.
- **CSS3 (Vanilla)**: Custom styling avoiding bulky frameworks for maximum performance. Implements a robust Light/Dark mode via CSS variables.
- **JavaScript (Vanilla)**: Lightweight interactions for mobile menu toggling, smooth scrolling, scroll reveal animations, and theme persistence.

## Project Structure
- `index.html` - The single-page application structure.
- `style.css` - comprehensive design system, utility classes, and layout rules.
- `script.js` - Logic for interactions and dynamic visual states.
- `logo.png` - Vector-style transparent logo for the brand.

## Key Features
1. **Light & Dark Theme Toggle**: Saves user preference to `localStorage`.
2. **Responsive Design System**: Custom breakpoints for Desktop (1024px+), Tablet (768px - 992px), and Mobile (< 768px).
3. **Scroll Animations**: Custom intersection-style reveals triggering on scroll.
4. **Google Maps Integration**: Live interactive map highlighting the Kigali location.
5. **Centralized Registration links**: All CTA elements point externally to the unified Google Form.

## SEO Strategy
The site is optimized to rank specifically for software training entities in Rwanda.
- Meta descriptions explicitly mention the Kigali location.
- Open Graph and Twitter Card tags ensure links look elegant when shared on social platforms.
- Canonical linking established to index the Netlify `.app` domain properly.
- All non-essential scripts execute passively to maximize Google Lighthouse performance scores.

## Future Development & Maintenance
If making modifications:
- Update `style.css` theme variables to change the core brand colors across both Light and Dark modes.
- Maintain Font Awesome 6 classes (`<i class="fa-solid fa-*"></i>`) for standard iconography updates.
- If migrating domains from Netlify, update canonical URLs and Open Graph tags inside `index.html` headers.
