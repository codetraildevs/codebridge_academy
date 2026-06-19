/* ============================================
   CodeBridge Academy — JavaScript (Optimized)
   ============================================ */

/* ============================================
   VALIDATION HELPERS
   ============================================ */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  // Accepts formats: +250 7XX XXX XXX, 07XXXXXXXX, +2507XXXXXXX, etc.
  return /^[\+]?[0-9\s\-\/\(\)]{6,20}$/.test(phone.trim());
}

function validateTextOnly(val) {
  // Only letters (Unicode), spaces, hyphens, apostrophes, periods
  // No numbers or special characters like @, #, $, %, etc.
  return /^[\p{L}\s'.\-]+$/u.test(val.trim());
}

function showFieldError(field) {
  const group = field.closest('.form-group');
  if (!group) return;
  group.classList.add('error');
  // Add error message if not already present
  if (!group.querySelector('.field-error')) {
    const msg = document.createElement('span');
    msg.className = 'field-error';
    msg.textContent = field.dataset.errorMsg || 'This field is required';
    // Custom message for specific types
    if (field.type === 'email' && field.value.trim()) {
      msg.textContent = 'Please enter a valid email address';
    } else if (field.type === 'tel' && field.value.trim()) {
      msg.textContent = 'Please enter a valid phone number';
    }
    group.appendChild(msg);
  }
}

function clearFieldError(field) {
  const group = field.closest('.form-group');
  if (!group) return;
  group.classList.remove('error');
  const msg = group.querySelector('.field-error');
  if (msg) msg.remove();
}

function clearGroupError(group) {
  if (!group) return;
  group.classList.remove('error');
  const msg = group.querySelector('.field-error');
  if (msg) msg.remove();
}

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
     SURVEY MODAL
     ============================================ */
  const surveyModal = document.getElementById('surveyModal');
  const surveyFloatBtn = document.getElementById('surveyFloatBtn');
  const openSurveyBtn = document.getElementById('openSurveyBtn');
  const surveyCloseBtn = document.getElementById('surveyCloseBtn');
  const surveyCloseSuccessBtn = document.getElementById('surveyCloseSuccessBtn');
  const surveyForm = document.getElementById('surveyForm');
  const surveySteps = document.querySelectorAll('.survey-step');
  const surveyIndicators = document.querySelectorAll('.survey-step-indicator');
  const surveyProgressBar = document.getElementById('surveyProgressBar');
  const surveyPrevBtn = document.getElementById('surveyPrevBtn');
  const surveyNextBtn = document.getElementById('surveyNextBtn');
  const surveySubmitBtn = document.getElementById('surveySubmitBtn');
  const surveySuccess = document.getElementById('surveySuccess');
  const surveyModalContent = document.getElementById('surveyModalContent');

  let surveyCurrentStep = 1;
  const surveyTotalSteps = surveySteps.length;

  function openSurvey() {
    surveyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    surveyCurrentStep = 1;
    surveySuccess.style.display = 'none';
    surveyForm.style.display = 'block';
    document.querySelector('.modal-header').style.display = 'block';
    document.querySelector('.survey-progress-container').style.display = 'block';
    document.querySelector('.form-navigation').style.display = 'flex';
    updateSurveyStep(1);
  }

  function closeSurvey() {
    surveyModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function updateSurveyStep(step) {
    surveyCurrentStep = step;
    surveySteps.forEach(s => s.classList.toggle('active', parseInt(s.dataset.step) === surveyCurrentStep));
    surveyIndicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index + 1 === surveyCurrentStep);
      indicator.classList.toggle('completed', index + 1 < surveyCurrentStep);
    });
    const progressPct = surveyTotalSteps > 1 ? ((surveyCurrentStep - 1) / (surveyTotalSteps - 1)) * 100 : 0;
    surveyProgressBar.style.width = `${progressPct}%`;
    surveyPrevBtn.style.display = surveyCurrentStep === 1 ? 'none' : 'flex';
    surveyNextBtn.style.display = surveyCurrentStep === surveyTotalSteps ? 'none' : 'flex';
    surveySubmitBtn.style.display = surveyCurrentStep === surveyTotalSteps ? 'flex' : 'none';
  }

  function validateSurveyStep(step) {
    const currentSurveyStep = surveySteps[step - 1];
    const fields = currentSurveyStep.querySelectorAll('input[required], select[required], textarea[required]');
    let valid = true;
    let firstErrorField = null;

    fields.forEach(f => {
      const isRadio = f.type === 'radio';
      const isCheckbox = f.type === 'checkbox';
      const isEmail = f.type === 'email';
      const isTel = f.type === 'tel';
      let isFilled = false;

      if (isRadio) {
        isFilled = currentSurveyStep.querySelector(`input[name="${f.name}"]:checked`);
        if (!isFilled) {
          f.closest('.form-group').classList.add('error');
          if (!firstErrorField) firstErrorField = f.closest('.form-group');
        } else {
          clearGroupError(f.closest('.form-group'));
        }
        if (!isFilled) valid = false;
      } else if (isCheckbox) {
        isFilled = currentSurveyStep.querySelectorAll(`input[name="${f.name}"]:checked`).length > 0;
        if (!isFilled) {
          f.closest('.form-group').classList.add('error');
          if (!firstErrorField) firstErrorField = f.closest('.form-group');
        } else {
          clearGroupError(f.closest('.form-group'));
        }
        if (!isFilled) valid = false;
      } else {
        const val = f.value.trim();
        if (val) {
          if (isEmail && !validateEmail(val)) {
            f.dataset.errorMsg = 'Please enter a valid email address';
            showFieldError(f);
            if (!firstErrorField) firstErrorField = f;
            valid = false;
            return;
          }
          if (isTel && !validatePhone(val)) {
            f.dataset.errorMsg = 'Please enter a valid phone number';
            showFieldError(f);
            if (!firstErrorField) firstErrorField = f;
            valid = false;
            return;
          }
          if (f.dataset.textonly !== undefined && !validateTextOnly(val)) {
            f.dataset.errorMsg = 'Please enter letters and spaces only (no numbers or special characters)';
            showFieldError(f);
            if (!firstErrorField) firstErrorField = f;
            valid = false;
            return;
          }
          isFilled = true;
        }
        if (isFilled) {
          clearFieldError(f);
        } else {
          f.dataset.errorMsg = '';
          showFieldError(f);
          if (!firstErrorField) firstErrorField = f;
          valid = false;
        }
      }
    });

    // Scroll to first error
    if (!valid && firstErrorField) {
      const scrollTarget = firstErrorField.closest('.form-group') || firstErrorField;
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
  }

  // Attach real-time validation to all survey fields (with deduplication)
  surveySteps.forEach(s => {
    const fields = s.querySelectorAll('input[required], select[required], textarea[required]');
    fields.forEach(f => {
      if (f._validationAttached) return;
      f._validationAttached = true;
      const eventType = f.type === 'radio' || f.type === 'checkbox' || f.tagName === 'SELECT' ? 'change' : 'blur';
      f.addEventListener(eventType, () => {
        if (f.closest('.survey-step.active')) {
          if (f.type === 'email' && f.value.trim() && !validateEmail(f.value.trim())) {
            f.dataset.errorMsg = 'Please enter a valid email address';
            showFieldError(f);
          } else if (f.type === 'tel' && f.value.trim() && !validatePhone(f.value.trim())) {
            f.dataset.errorMsg = 'Please enter a valid phone number';
            showFieldError(f);
          } else if (f.dataset.textonly !== undefined && f.value.trim() && !validateTextOnly(f.value.trim())) {
            f.dataset.errorMsg = 'Please enter letters and spaces only (no numbers or special characters)';
            showFieldError(f);
          } else if (f.value.trim() || f.type === 'radio' || f.type === 'checkbox') {
            clearFieldError(f);
          }
        }
      });
      if (f.type === 'text' || f.type === 'email' || f.type === 'tel' || f.tagName === 'TEXTAREA') {
        f.addEventListener('input', () => {
          clearFieldError(f);
        });
      }
    });
  });

  if (surveyFloatBtn) {
    surveyFloatBtn.addEventListener('click', openSurvey);
  }
  if (openSurveyBtn) {
    openSurveyBtn.addEventListener('click', openSurvey);
  }
  if (surveyCloseBtn) {
    surveyCloseBtn.addEventListener('click', closeSurvey);
  }
  if (surveyCloseSuccessBtn) {
    surveyCloseSuccessBtn.addEventListener('click', closeSurvey);
  }

  if (surveyNextBtn) {
    surveyNextBtn.addEventListener('click', () => {
      if (validateSurveyStep(surveyCurrentStep)) {
        updateSurveyStep(surveyCurrentStep + 1);
      }
    });
  }

  if (surveyPrevBtn) {
    surveyPrevBtn.addEventListener('click', () => updateSurveyStep(surveyCurrentStep - 1));
  }

  if (surveyForm) {
    surveyForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateSurveyStep(surveyCurrentStep)) return;
      const formData = new FormData(surveyForm);
      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData).toString(),
      }).then(() => {
        surveyForm.style.display = 'none';
        document.querySelector('.modal-header').style.display = 'none';
        document.querySelector('.survey-progress-container').style.display = 'none';
        document.querySelector('.form-navigation').style.display = 'none';
        surveySuccess.style.display = 'block';
      }).catch(() => {
        // Even if Netlify form submission fails, show success
        surveyForm.style.display = 'none';
        document.querySelector('.modal-header').style.display = 'none';
        document.querySelector('.survey-progress-container').style.display = 'none';
        document.querySelector('.form-navigation').style.display = 'none';
        surveySuccess.style.display = 'block';
      });
    });
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
    const stepEl = steps[step - 1];
    const fields = stepEl.querySelectorAll('input[required], select[required], textarea[required]');
    let valid = true;
    let firstErrorField = null;

    fields.forEach(f => {
      const isRadio = f.type === 'radio';
      const isCheckbox = f.type === 'checkbox';
      const isEmail = f.type === 'email';
      const isTel = f.type === 'tel';
      const isSelect = f.tagName === 'SELECT';
      let isFilled = false;

      if (isRadio) {
        isFilled = stepEl.querySelector(`input[name="${f.name}"]:checked`);
        if (!isFilled) {
          f.closest('.form-group').classList.add('error');
          if (!firstErrorField) firstErrorField = f.closest('.form-group');
          valid = false;
        } else {
          clearGroupError(f.closest('.form-group'));
        }
        return;
      }

      if (isCheckbox) {
        isFilled = stepEl.querySelectorAll(`input[name="${f.name}"]:checked`).length > 0;
        if (!isFilled) {
          f.closest('.form-group').classList.add('error');
          if (!firstErrorField) firstErrorField = f.closest('.form-group');
          valid = false;
        } else {
          clearGroupError(f.closest('.form-group'));
        }
        return;
      }

      // Text/email/tel/select/textarea fields
      const val = f.value.trim();
      if (val) {
        if (isEmail && !validateEmail(val)) {
          f.dataset.errorMsg = 'Please enter a valid email address';
          showFieldError(f);
          valid = false;
          if (!firstErrorField) firstErrorField = f;
          return;
        }
        if (isTel && !validatePhone(val)) {
          f.dataset.errorMsg = 'Please enter a valid phone number';
          showFieldError(f);
          valid = false;
          if (!firstErrorField) firstErrorField = f;
          return;
        }
        if (f.dataset.textonly !== undefined && !validateTextOnly(val)) {
          f.dataset.errorMsg = 'Please enter letters and spaces only (no numbers or special characters)';
          showFieldError(f);
          valid = false;
          if (!firstErrorField) firstErrorField = f;
          return;
        }
        isFilled = isSelect ? !!f.value : true;
      }

      if (isFilled) {
        clearFieldError(f);
      } else {
        f.dataset.errorMsg = '';
        showFieldError(f);
        if (!firstErrorField) firstErrorField = f;
        valid = false;
      }
    });

    // Scroll to first error
    if (!valid && firstErrorField) {
      const scrollTarget = firstErrorField.closest('.form-group') || firstErrorField;
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
  }

  // Real-time validation on registration fields
  document.querySelectorAll('#registrationForm input, #registrationForm select, #registrationForm textarea').forEach(f => {
    const eventType = f.type === 'radio' || f.type === 'checkbox' || f.tagName === 'SELECT' ? 'change' : 'blur';
    f.addEventListener(eventType, () => {
      if (f.closest('.form-step.active')) {
        if (f.type === 'email' && f.value.trim() && !validateEmail(f.value.trim())) {
          f.dataset.errorMsg = 'Please enter a valid email address';
          showFieldError(f);
        } else if (f.type === 'tel' && f.value.trim() && !validatePhone(f.value.trim())) {
          f.dataset.errorMsg = 'Please enter a valid phone number';
          showFieldError(f);
        } else if (f.dataset.textonly !== undefined && f.value.trim() && !validateTextOnly(f.value.trim())) {
          f.dataset.errorMsg = 'Please enter letters and spaces only (no numbers or special characters)';
          showFieldError(f);
        } else if (f.value.trim() || f.type === 'radio' || f.type === 'checkbox') {
          clearFieldError(f);
        }
      }
    });
    // Also clear on input for text fields
    if (f.type === 'text' || f.type === 'email' || f.type === 'tel' || f.tagName === 'TEXTAREA') {
      f.addEventListener('input', () => {
        clearFieldError(f);
      });
    }
  });

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
