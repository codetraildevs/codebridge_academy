import type { ComponentProps } from "react";
import { Quote } from "lucide-react";
import {
  Logo01,
  Logo02,
  Logo03,
  Logo04,
  Logo05,
  Logo06,
} from "@/components/ui/testimonials-13-utils/logos";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Marquee } from "@/components/ui/testimonials-13-utils/marquee";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    id: 1,
    name: "Dr. Jean Pierre Habimana",
    designation: "Director of Academics",
    company: "Rwanda Polytechnic",
    testimonial:
      "Qualexas has completely transformed how we assess our TVET students. The AI-powered code evaluation and oral defense features have reduced our assessment time by 70% while improving accuracy.",
    initials: "JH",
    logo: Logo01,
  },
  {
    id: 2,
    name: "Alice Uwimana",
    designation: "CEO",
    company: "Workforce Development Authority",
    testimonial:
      "The platform's multi-tenant architecture allows us to manage assessments across multiple partner schools seamlessly. Digital certificates with QR verification have been a game-changer for our certification process.",
    initials: "AU",
    logo: Logo02,
  },
  {
    id: 3,
    name: "Patrick Mugisha",
    designation: "Head of Talent Acquisition",
    company: "MTN Rwanda",
    testimonial:
      "We've scaled our technical recruitment process efficiently using Qualexas. Interview templates and AI-scored responses help us identify top talent faster than ever before.",
    initials: "PM",
    logo: Logo03,
  },
  {
    id: 4,
    name: "Emma Umuhoza",
    designation: "Assessment Coordinator",
    company: "NESA",
    testimonial:
      "The exam scheduling and proctoring tools give us full confidence in our national assessments. Reporting is clear, accurate, and instantly available to all stakeholders.",
    initials: "EU",
    logo: Logo04,
  },
  {
    id: 5,
    name: "Daniel Niyonzima",
    designation: "Head of IT",
    company: "IPRC Kigali",
    testimonial:
      "Integrating Qualexas with our existing systems was effortless. The support team is responsive, and the platform has made our IT skills verification far more reliable.",
    initials: "DN",
    logo: Logo05,
  },
  {
    id: 6,
    name: "Chantal Ingabire",
    designation: "Training & Development Lead",
    company: "CodeBridge Academy",
    testimonial:
      "The user experience is top-notch. Our instructors love how clean, intuitive, and easy the assessment builder is to navigate every single day.",
    initials: "CI",
    logo: Logo06,
  },
];

const Testimonials = () => (
  <section id="testimonials" className="px-6 py-20 bg-white">
    <h2 className="landing-section-heading text-center font-normal text-4xl tracking-[-0.04em] md:text-[2.75rem] text-text-primary" style={{ fontFamily: 'Kaio, PPMori, sans-serif' }}>
      Success Stories
    </h2>
    <p className="landing-subheading mt-3.5 text-center text-text-tertiary">
      Real stories from institutions across East Africa that rely on Qualexas
    </p>
    <div
      className="mt-14 space-y-px border bg-surface-tertiary"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <Marquee className="py-0 [--duration:60s] [--gap:0px]" pauseOnHover>
        <TestimonialList />
      </Marquee>
    </div>
  </section>
);

const TestimonialList = ({ className, ...props }: ComponentProps<"div">) =>
  testimonials.map((testimonial) => (
    <div
      className="-mx-1 flex w-full max-w-sm flex-col odd:flex-col-reverse"
      key={testimonial.id}
    >
      <div
        className={cn("rounded-xl border bg-white shadow-sm", className)}
        {...props}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary-100 font-medium text-primary-700 text-sm">
                  {testimonial.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-text-primary">{testimonial.name}</p>
                <p className="text-text-tertiary text-sm">
                  {testimonial.designation}
                </p>
              </div>
            </div>
            <Quote className="h-5 w-5 text-text-tertiary/40" />
          </div>
          <p className="mt-5 text-[17px] text-text-secondary">
            &ldquo;{testimonial.testimonial}&rdquo;
          </p>
        </div>
      </div>
      <div className="relative flex h-40 w-96 items-center justify-center p-6">
        <testimonial.logo className="text-muted-foreground" />
      </div>
    </div>
  ));

export default Testimonials;
