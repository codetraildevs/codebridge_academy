import { AnimatedCarousel } from "@/components/ui/logo-carousel";

const partnerLogos = [
  { src: "/logos/mtn-rwanda.svg", alt: "MTN Rwanda" },
  { src: "/logos/rwanda-polytechnic.svg", alt: "Rwanda Polytechnic" },
  { src: "/logos/rwanda-tvet-board.svg", alt: "Rwanda TVET Board" },
  { src: "/logos/codebridge-academy.svg", alt: "CodeBridge Academy" },
  { src: "/logos/nesa.svg", alt: "NESA" },
  { src: "/logos/iprc-kigali.svg", alt: "IPRC Kigali" },
];

export function LogoCarouselSection() {
  return (
    <AnimatedCarousel
      title="Trusted Partner Institutions"
      titleClassName="landing-section-heading"
      logos={partnerLogos.map((logo) => logo.src)}
      autoPlay={true}
      autoPlayInterval={1800}
      itemsPerViewMobile={3}
      itemsPerViewDesktop={5}
      logoContainerWidth="w-36"
      logoContainerHeight="h-24"
      logoImageWidth="w-auto"
      logoImageHeight="h-12"
      padding="py-16 sm:py-24"
      containerClassName="bg-white"
      spacing="gap-8"
    />
  );
}

export default LogoCarouselSection;
