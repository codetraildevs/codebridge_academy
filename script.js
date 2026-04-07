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
    if (e.key === 'Escape') {
      if (navMenu.classList.contains('active')) closeMobileMenu();
      if (registrationModal.classList.contains('active')) closeRegistrationModal();
    }
  });

  /* ============================================
     REGISTRATION MODAL & MULTI-STEP LOGIC
     ============================================ */
  const registrationModal = document.getElementById('registrationModal');
  const closeModal = document.getElementById('closeModal');
  const regForm = document.getElementById('registrationForm');
  const regButtons = document.querySelectorAll('.btn-register');
  const steps = document.querySelectorAll('.form-step');
  const stepIndicators = document.querySelectorAll('.step-indicator');
  const progressBar = document.getElementById('progressBar');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const successToast = document.getElementById('successMessage');

  let currentStep = 1;

  function openRegistrationModal(e) {
    if (e) e.preventDefault();
    registrationModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateStep(1);
  }

  function closeRegistrationModal() {
    registrationModal.classList.remove('active');
    document.body.style.overflow = '';
    // Reset form after a delay to avoid flicker
    setTimeout(() => {
      regForm.reset();
      updateStep(1);
    }, 400);
  }

  function updateStep(step) {
    currentStep = step;
    
    // Update classes
    steps.forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.step) === currentStep);
    });

    stepIndicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index + 1 === currentStep);
      indicator.classList.toggle('completed', index + 1 < currentStep);
    });

    // Update Progress Bar
    const progress = ((currentStep - 1) / (steps.length - 1)) * 80; // 80% total width for line
    progressBar.style.width = `${progress}%`;

    // Update Buttons
    prevBtn.style.display = currentStep === 1 ? 'none' : 'flex';
    if (currentStep === steps.length) {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'flex';
    } else {
      nextBtn.style.display = 'flex';
      submitBtn.style.display = 'none';
    }
  }

  function validateStep(step) {
    const currentStepFields = steps[step - 1].querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    currentStepFields.forEach(field => {
      if (field.type === 'radio') {
        const name = field.name;
        const checked = steps[step - 1].querySelector(`input[name="${name}"]:checked`);
        if (!checked) {
          isValid = false;
          field.closest('.form-group').classList.add('error');
        } else {
          field.closest('.form-group').classList.remove('error');
        }
      } else if (!field.value.trim()) {
        isValid = false;
        field.classList.add('error');
      } else {
        field.classList.remove('error');
      }
    });

    return isValid;
  }

  // Event Listeners
  regButtons.forEach(btn => btn.addEventListener('click', openRegistrationModal));
  closeModal.addEventListener('click', closeRegistrationModal);
  registrationModal.addEventListener('click', (e) => {
    if (e.target === registrationModal) closeRegistrationModal();
  });

  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      updateStep(currentStep + 1);
    }
  });

  prevBtn.addEventListener('click', () => {
    updateStep(currentStep - 1);
  });

  // Netlify Form Submission (AJAX)
  regForm.addEventListener('submit', e => {
    e.preventDefault();

    // Final validation check for the last step
    if (!validateStep(currentStep)) return;

    const isLocal = window.location.protocol === 'file:' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

    if (isLocal) {
      console.warn("Netlify Forms requires a live Netlify environment. Simulating success for local testing...");
      closeRegistrationModal();
      showSuccessToast();
      return;
    }

    const formData = new FormData(regForm);
    
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString(),
    })
    .then(() => {
      closeRegistrationModal();
      showSuccessToast();
    })
    .catch(error => {
      console.error("Submission error:", error);
      alert("Submission failed. Note: Netlify Forms only work when deployed or using 'netlify dev'.");
    });
  });

  function showSuccessToast() {
    successToast.classList.add('active');
    setTimeout(() => {
      successToast.classList.remove('active');
    }, 5000);
  }
});
