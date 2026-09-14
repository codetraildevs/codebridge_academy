import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { SectionContainer } from '@components/ui/section-container';

const footerColumns = [
  {
    title: 'Platform',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Integrations', href: '#integrations' },
      { label: 'Security', href: '#security' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'For Individuals', href: '#pricing' },
      { label: 'For Organizations', href: '#pricing' },
      { label: 'For Enterprises', href: '#pricing' },
      { label: 'Case Studies', href: '#testimonials' },
      { label: 'Contact Sales', href: '#demo-section' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'AI Assessment', href: '#features' },
      { label: 'AI Oral Defense', href: '#features' },
      { label: 'Proctoring', href: '#features' },
      { label: 'Digital Certificates', href: '#features' },
      { label: 'Dynamic Workspace', href: '#features' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#docs' },
      { label: 'Contact', href: '#demo-section' },
      { label: 'Partners', href: '#partners' },
      { label: 'Help Center', href: '#help' },
      { label: 'Sitemap', href: '#sitemap' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#privacy' },
      { label: 'Terms of Service', href: '#terms' },
      { label: 'Trust Center', href: '#trust-center' },
    ],
  },
];

const socialLinks = [
  { label: 'X', href: '#x', icon: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )},
  { label: 'LinkedIn', href: '#linkedin', icon: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )},
  { label: 'YouTube', href: '#youtube', icon: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )},
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

export function Footer() {
  return (
    <footer className="bg-[#fcf9f7]">
      <SectionContainer className="py-12 sm:py-16">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white">
              <Rocket className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold text-gray-900">Qualexas</span>
          </div>
        </motion.div>

        {/* Main footer columns */}
        <motion.div
          className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {footerColumns.map((column) => (
            <motion.div key={column.title} variants={itemVariants}>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                {column.title}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 flex flex-col items-start justify-end gap-6 border-t border-gray-200 pt-8 sm:flex-row sm:items-center"
        >
          <div className="flex gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-all"
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </motion.div>

        {/* Copyright and disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
        >
          <p className="text-sm text-gray-600">
            Qualexas. All rights reserved. © {new Date().getFullYear()}
          </p>
          <p className="text-sm text-gray-600">
            AI-Powered Assessment Platform
          </p>
        </motion.div>
      </SectionContainer>
    </footer>
  );
}

export default Footer;