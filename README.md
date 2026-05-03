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

## Key Pages

- `index.html`: Main landing page with programs, audience details, and a multi-step registration form.
- `verify.html`: Certificate verification portal that fetches and displays student records dynamically.

## Local Development

To run the project locally:
1. Use a local server (e.g., Live Server in VS Code).
2. Assets will automatically fall back to local versions if the Netlify CDN is not available.

## Deployment

The project is configured for deployment on Netlify.
- `netlify.toml` handles the build configuration and caching headers.
- Forms are automatically handled by Netlify Forms.

---
© 2026 CodeBridge Academy. Bridging learning to real software careers.
