# CodeBridge Academy — Software Career Training

CodeBridge Academy is a modern, high-performance web platform for a software training academy in Kigali, Rwanda. The site is optimized for production with Netlify features, high-performance image delivery, and a fully accessible design.

## Features

- **Modern UI/UX**: Built with a tech-forward design system using Poppins (headings) and Inter (body) fonts.
- **Dynamic Theming**: Support for Light and Dark modes with automatic persistence across pages.
- **Certificate Verification**: A dedicated portal to verify the authenticity of student credentials using a `students.json` database.
- **Performance Optimized**:
  - Netlify Image CDN for fast, responsive image delivery.
  - Aggressive caching strategies in `netlify.toml`.
  - PWA support via `manifest.json`.
- **Accessibility**: ARIA-compliant components, logical heading hierarchy, and refined keyboard navigation focus styles.

## Tech Stack

- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+)
- **Icons**: FontAwesome 6.5.1
- **Icons & Branding**: Custom SVG Vector Branding
- **Hosting/Infrastructure**: Netlify (CDN, Forms, Image Optimization)

## Project Structure

```
/
├── index.html              # Main landing page
├── verify.html             # Certificate verification portal
├── sw.js                   # Service Worker (PWA)
├── manifest.json           # PWA manifest
├── netlify.toml            # Netlify deployment config
├── .gitignore
├── README.md
│
├── css/
│   ├── style.css           # Main stylesheet (design system)
│   └── verify.css          # Verification page styles
│
├── js/
│   ├── script.js           # Landing page interactions
│   └── verify.js           # Certificate verification logic
│
├── data/
│   ├── students.json       # Student records database
│   └── canva_students.csv  # Student data export
│
├── assets/images/
│   ├── codebridge_academy_logo.svg   # Brand logo
│   ├── new_logo.png                  # Favicon / OG image
│   ├── about_section.png             # About section image
│   ├── hero_section.png              # Hero section image
│   ├── logo.png                      # Legacy logo
│   └── updated_logo.jpeg             # Alternate logo
│
├── docs/
│   ├── project_docs.md     # Detailed project documentation
│   └── readme.txt          # Original build requirements
│
└── qr_codes/               # Scannable QR codes for certificate verification
```

## QR Certificate Codes

The `qr_codes/` directory contains scannable QR code images (300×300 px PNGs) used for certificate verification. Each QR code encodes a direct link to the verification portal with the student's certificate ID pre-filled.

### Naming Convention

```
qr_codes/CBA-2026-XXX.png
```

- `CBA` — CodeBridge Academy prefix
- `2026` — Cohort year
- `XXX` — Sequential student number (001–030)

**Example:** Scanning `qr_codes/CBA-2026-015.png` directs the user to `verify.html?id=CBA-2026-015`, which looks up the corresponding student record in `data/students.json`.

### Usage

- **Physical distribution:** Print the QR codes on certificates, badges, or completion letters.
- **Digital distribution:** Link directly to `https://codebridgecademy.com/verify.html?id=CBA-2026-XXX`.
- The verification portal validates the ID against the student database and displays the credential details.

## Key Pages

- `index.html`: Main landing page with programs, audience details, and a multi-step registration form.
- `verify.html`: Certificate verification portal that fetches and displays student records dynamically from `data/students.json`.

## Local Development

To run the project locally:
1. Use a local server (e.g., Live Server in VS Code).
2. Assets will automatically fall back to local versions if the Netlify CDN is not available.

## Deployment

The project is configured for deployment on Netlify.
- `netlify.toml` handles the build configuration, caching headers (with glob patterns for nested paths).
- Forms are automatically handled by Netlify Forms.
- Image assets are served via Netlify Image CDN for optimized delivery.

---
© 2026 CodeBridge Academy. Bridging learning to real software careers.
