import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { cn } from '@utils/cn';
import { Menu, X, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Contact', href: '#contact' },
];

export function LandingNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Detect active section for nav indicator
      const sections = navLinks.map((l) => l.href.replace('#', ''));
      for (const id of sections.reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 150) {
          setActiveSection(id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (href: string) => {
    const id = href.replace('#', '');
    const scrollToEl = () => {
      const el = document.getElementById(id) || document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    if (mobileOpen) {
      // Close mobile menu first, then scroll after the exit animation completes
      setMobileOpen(false);
      setTimeout(scrollToEl, 250);
    } else {
      setMobileOpen(false);
      scrollToEl();
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-border/50 shadow-sm'
          : 'bg-white/70 backdrop-blur-sm border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group flex items-center gap-2.5"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-lg shadow-primary-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-primary-500/40">
            <Rocket className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-text-primary">
            Qualexas
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = activeSection === link.href.replace('#', '');
            return (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                className={cn(
                  'relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  'text-text-secondary hover:text-text-primary',
                  isActive && 'text-primary-600',
                )}
              >
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg -z-10 bg-primary-50"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/auth/login')}
          >
            Sign In
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-200"
            onClick={() => navigate('/auth/register')}
          >
            Get Started Free
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn(
            'rounded-lg p-2.5 transition-all duration-200 md:hidden min-h-[44px] min-w-[44px]',
            'text-text-primary hover:bg-surface-tertiary',
          )}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/50 bg-white shadow-xl overflow-hidden md:hidden"
          >
            <div className="px-4 pb-6 pt-4">
              <nav className="flex flex-col gap-1">
                {navLinks.map((link, i) => (
                  <motion.button
                    key={link.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => scrollTo(link.href)}
                    className="rounded-lg px-3 py-3 text-left text-sm font-medium text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors min-h-[44px]"
                  >
                    {link.label}
                  </motion.button>
                ))}
                <hr className="my-3 border-border" />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col gap-2"
                >
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setMobileOpen(false);
                      navigate('/auth/login');
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    className="bg-primary-600 hover:bg-primary-700"
                    onClick={() => {
                      setMobileOpen(false);
                      navigate('/auth/register');
                    }}
                  >
                    Get Started Free
                  </Button>
                </motion.div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default LandingNav;
