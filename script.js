/* ============================================
   CodeBridge Academy — JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  /* ============================================
     THEME TOGGLE
     ============================================ */
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  // Load saved theme from localStorage
  const savedTheme = localStorage.getItem('codebridge-theme') || 'light';
  html.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('codebridge-theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'light') {
      icon.className = 'fa-solid fa-moon';
    } else {
      icon.className = 'fa-solid fa-sun';
    }
  }

  /* ============================================
     MOBILE MENU
     ============================================ */
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');
  const navOverlay = document.getElementById('navOverlay');
  const navLinks = document.querySelectorAll('.nav-link');

  function toggleMobileMenu() {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
    navOverlay.classList.toggle('active');
    document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
  }

  function closeMobileMenu() {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
    navOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', toggleMobileMenu);
  navOverlay.addEventListener('click', closeMobileMenu);

  // Close menu when a nav link is clicked
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });

  /* ============================================
     STICKY NAVBAR — scroll effect
     ============================================ */
  const navbar = document.getElementById('navbar');

  function handleNavbarScroll() {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  /* ============================================
     ACTIVE NAV LINK HIGHLIGHTING
     ============================================ */
  const sections = document.querySelectorAll('section[id]');

  function highlightActiveNav() {
    const scrollPos = window.scrollY + 120;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  /* ============================================
     BACK TO TOP BUTTON
     ============================================ */
  const backToTop = document.getElementById('backToTop');

  function handleBackToTop() {
    if (window.scrollY > 500) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ============================================
     SCROLL REVEAL ANIMATIONS
     ============================================ */
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

  function handleScrollReveal() {
    const windowHeight = window.innerHeight;
    const triggerPoint = windowHeight * 0.85;

    revealElements.forEach(el => {
      const elementTop = el.getBoundingClientRect().top;

      if (elementTop < triggerPoint) {
        el.classList.add('revealed');
      }
    });
  }

  /* ============================================
     UNIFIED SCROLL HANDLER (performance)
     ============================================ */
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleNavbarScroll();
        highlightActiveNav();
        handleBackToTop();
        handleScrollReveal();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Run once on load
  handleNavbarScroll();
  highlightActiveNav();
  handleBackToTop();
  handleScrollReveal();

  /* ============================================
     SMOOTH SCROLL for anchor links
     ============================================ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = anchor.getAttribute('href');
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        const navHeight = navbar.offsetHeight;
        const targetPosition = targetEl.offsetTop - navHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  /* ============================================
     KEYBOARD ACCESSIBILITY — Escape to close menu
     ============================================ */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
      closeMobileMenu();
    }
  });
});
