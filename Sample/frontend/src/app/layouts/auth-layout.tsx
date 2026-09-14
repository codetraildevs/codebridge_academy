import { Outlet, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Sparkles, Shield, Zap, BarChart3, ArrowLeft } from 'lucide-react';

export function AuthLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/auth/login';

  const benefits = [
    { icon: Award, text: 'Industry-recognized competency assessments' },
    { icon: Sparkles, text: 'AI-powered skill evaluation & feedback' },
    { icon: Shield, text: 'Secure digital credentials & certificates' },
    { icon: BarChart3, text: 'Detailed analytics & skill insights' },
    { icon: Zap, text: 'Real-time assessment & instant results' },
  ];

  const authContent = (
    <div className="w-full">
      {/* Brand header */}
      <div className="mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-[28px] font-semibold tracking-tight text-[#000100]">
            Qualexas
          </h1>
          <p className="mt-1 text-[13px] text-[#b8b8b8]">
            Competency Assessment Platform
          </p>
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="rounded-xl bg-white"
      >
        <div className="p-6 sm:p-8">
          <Outlet />
        </div>
      </motion.div>

      {/* Footer */}
      <p className="mt-6 text-center text-[11px] text-[#b8b8b8]">
        &copy; {new Date().getFullYear()} Qualexas. All rights reserved.
      </p>
    </div>
  );

  // Split-screen layout for login
  if (isLoginPage) {
    return (
      <div className="flex min-h-screen">
        {/* Left: Brand/benefits panel */}
        <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-[#000100] p-12 lg:flex">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative z-10 max-w-sm"
          >
            <h2 className="text-[32px] font-semibold leading-tight text-white">
              Welcome to{'\n'}Qualexas
            </h2>
            <p className="mt-4 text-[15px] text-[#b8b8b8] leading-relaxed">
              The next-generation competency assessment platform powering skills verification.
            </p>

            <div className="mt-10 space-y-4">
              {benefits.map((item, i) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                    <item.icon className="h-4 w-4 text-[#b8b8b8]" />
                  </div>
                  <span className="text-[13px] text-[#b8b8b8]">{item.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Tags */}
            <div className="mt-12 flex items-center gap-2">
              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-[#b8b8b8]">
                TVET Certified
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-[#b8b8b8]">
                AI Powered
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-[#b8b8b8]">
                Rwanda Made
              </span>
            </div>
          </motion.div>
        </div>

        {/* Right: Form panel */}
        <div className="flex w-full items-center justify-center bg-white p-4 lg:w-1/2">
          <div className="w-full max-w-md">
            {authContent}
          </div>
        </div>
      </div>
    );
  }

  // Centered layout for registration and other auth pages
  return (
    <div className="relative flex min-h-screen items-start justify-center bg-white p-4 pt-12 sm:items-center sm:pt-4">
      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#b8b8b8] hover:text-[#000100] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Home
      </Link>
      <div className="w-full max-w-lg">
        {authContent}
      </div>
    </div>
  );
}

export default AuthLayout;
