# CodeBridge Academy Website Documentation

## Overview
CodeBridge Academy is a premium, one-page static website designed to showcase software development training and internship programs. It has been built prioritizing modern aesthetics, responsive design, and extremely fast performance.

**Live URL:** [https://codebridgecademy.com/](https://codebridgecademy.com/)

## Technology Stack
- **HTML5**: Semantic tags ensuring accessibility and strong SEO structure.
- **CSS3 (Vanilla)**: Custom styling avoiding bulky frameworks for maximum performance. Implements a robust Light/Dark mode via CSS variables.
- **JavaScript (Vanilla)**: Lightweight interactions for mobile menu toggling, smooth scrolling, scroll reveal animations, and theme persistence.

## Project Structure

```
/
├── index.html              # Main landing page
├── verify.html             # Certificate verification portal
├── sw.js                   # Service Worker (PWA support)
├── manifest.json           # PWA manifest
├── netlify.toml            # Netlify deployment & caching config
├── css/
│   ├── style.css           # Main design system & styles
│   └── verify.css          # Certificate verification page styles
├── js/
│   ├── script.js           # Main site interactions & logic
│   └── verify.js           # Certificate verification logic
├── data/
│   ├── students.json       # Student records database
│   └── canva_students.csv  # Canva-exported student data
├── assets/images/
│   ├── codebridge_academy_logo.svg  # Brand logo (SVG)
│   ├── new_logo.png        # PWA icon / favicon
│   ├── about_section.png   # About section image
│   ├── hero_section.png    # Hero section image
│   ├── logo.png            # Legacy logo
│   └── updated_logo.jpeg   # Updated logo variant
├── docs/
│   ├── project_docs.md     # This documentation file
│   └── readme.txt          # Original build prompt & requirements
├── qr_codes/               # QR code images for certificates
└── README.md               # Project overview & instructions
```

### Key Files
- **index.html** - The single-page application landing page.
- **style.css** - Comprehensive design system, CSS variables for light/dark themes, utility classes, and layout rules.
- **script.js** - Logic for theme toggle, mobile menu, scroll animations, multi-step registration modal.

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
