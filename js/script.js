/* ============================================
   CodeBridge Academy — JavaScript (Optimized)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  /* ============================================
     SERVICE WORKER REGISTRATION
     ============================================ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('SW registered:', reg);
      }).catch(err => {
        console.log('SW failed:', err);
      });
    });
  }

  /* ============================================
     THEME TOGGLE
     ============================================ */
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;

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
    if (icon) {
      icon.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
  }

  /* ============================================
     MOBILE MENU
     ============================================ */
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');
  const navOverlay = document.getElementById('navOverlay');
  const navLinks = document.querySelectorAll('.nav-link');

  const toggleMobileMenu = () => {
    const active = hamburger.classList.toggle('active');
    navMenu.classList.toggle('active', active);
    navOverlay.classList.toggle('active', active);
    document.body.style.overflow = active ? 'hidden' : '';
  };

  const closeMobileMenu = () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
    navOverlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', toggleMobileMenu);
  navOverlay.addEventListener('click', closeMobileMenu);
  navLinks.forEach(link => link.addEventListener('click', closeMobileMenu));

  /* ============================================
     SCROLL HANDLERS (Optimized & Throttled)
     ============================================ */
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');
  const sections = document.querySelectorAll('section[id]');
  
  let lastScrollY = window.scrollY;
  let ticking = false;

  function updateScrollState() {
    const scrollY = window.scrollY;
    
    // Navbar
    navbar.classList.toggle('scrolled', scrollY > 50);
    
    // Back to top
    backToTop.classList.toggle('visible', scrollY > 500);

    // Active Nav Highlighting (Simple version for less work)
    let current = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      if (scrollY >= sectionTop - 150) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-section") === current);
    });

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollState);
      ticking = true;
    }
  }, { passive: true });

  /* ============================================
     BACK TO TOP CLICK HANDLER
     ============================================ */
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ============================================
     INTERSECTION OBSERVER (Scroll Reveal)
     ============================================ */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target); // Reveal only once
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    revealObserver.observe(el);
  });

  /* ============================================
     ANIMATED COUNTERS
     ============================================ */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counters = entry.target.querySelectorAll('.stat-number');
        counters.forEach(counter => {
          const targetText = counter.textContent.trim();
          const suffix = targetText.includes('+') ? '+' : '';
          const target = parseInt(targetText.replace(/\+/g, '').replace(/%/g, ''));
          const isPercent = targetText.includes('%');
          const duration = 2000;
          const startTime = performance.now();
          
          const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);
            
            if (isPercent) {
              counter.textContent = current + '%';
            } else {
              counter.textContent = current + suffix;
            }
            
            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              counter.textContent = targetText;
            }
          };
          requestAnimationFrame(updateCounter);
        });
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    counterObserver.observe(heroStats);
  }

  /* ============================================
     REGISTRATION MODAL
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

  function updateStep(step) {
    currentStep = step;
    steps.forEach(s => s.classList.toggle('active', parseInt(s.dataset.step) === currentStep));
    stepIndicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index + 1 === currentStep);
      indicator.classList.toggle('completed', index + 1 < currentStep);
    });
    progressBar.style.width = `${((currentStep - 1) / (steps.length - 1)) * 80}%`;
    prevBtn.style.display = currentStep === 1 ? 'none' : 'flex';
    nextBtn.style.display = currentStep === steps.length ? 'none' : 'flex';
    submitBtn.style.display = currentStep === steps.length ? 'flex' : 'none';
  }

  regButtons.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    registrationModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateStep(1);
  }));

  closeModal.addEventListener('click', () => {
    registrationModal.classList.remove('active');
    document.body.style.overflow = '';
  });

  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) updateStep(currentStep + 1);
  });

  prevBtn.addEventListener('click', () => updateStep(currentStep - 1));

  function validateStep(step) {
    const fields = steps[step - 1].querySelectorAll('input[required], select[required], textarea[required]');
    let valid = true;
    fields.forEach(f => {
      const isRadio = f.type === 'radio';
      const isFilled = isRadio ? steps[step-1].querySelector(`input[name="${f.name}"]:checked`) : f.value.trim();
      if (!isFilled) {
        valid = false;
        (isRadio ? f.closest('.form-group') : f).classList.add('error');
      } else {
        (isRadio ? f.closest('.form-group') : f).classList.remove('error');
      }
    });
    return valid;
  }

  regForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;
    const formData = new FormData(regForm);
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString(),
    }).then(() => {
      registrationModal.classList.remove('active');
      successToast.classList.add('active');
      setTimeout(() => successToast.classList.remove('active'), 5000);
      regForm.reset();
    });
  });
});
