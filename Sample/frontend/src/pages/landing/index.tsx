import { Reveal } from '@components/ui/reveal';
import { ScrollToTop } from '@components/ui/scroll-to-top';
import { HeroSection } from './HeroSection';
import { StatsSection } from './StatsSection';
import Features8Section from './Features8Section';
import { HowItWorksSection } from './HowItWorksSection';
import { PricingSection } from './PricingSection';
import { LogoCarouselSection } from './LogoCarouselSection';
import TestimonialsSection from './TestimonialsDemo';
import { CTASection } from './CTASection';
import { Footer } from './Footer';
import NavbarDemo from './NavbarDemo';

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#fcf9f7]">
      <NavbarDemo />

      <main>
        <HeroSection />

        <Reveal>
          <LogoCarouselSection />
        </Reveal>

        {/* Scroll-reveal sections — each section slides up when scrolled into view */}
        <Reveal delay={0.1}>
          <StatsSection />
        </Reveal>

        <Reveal delay={0.1}>
          <Features8Section />
        </Reveal>

        <Reveal delay={0.1}>
          <HowItWorksSection />
        </Reveal>

        <Reveal delay={0.1}>
          <PricingSection />
        </Reveal>

        <Reveal delay={0.1}>
          <TestimonialsSection />
        </Reveal>

        <Reveal delay={0.1}>
          <CTASection />
        </Reveal>
      </main>

      <Reveal delay={0.1}>
        <Footer />
      </Reveal>

      {/* Floating back-to-top button */}
      <ScrollToTop />
    </div>
  );
}

export default LandingPage;
