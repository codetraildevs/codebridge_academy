"use client";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const navLinks = [
  {
    name: "Features",
    link: "#features",
  },
  {
    name: "How It Works",
    link: "#how-it-works",
  },
  {
    name: "Pricing",
    link: "#pricing",
  },
  {
    name: "Testimonials",
    link: "#testimonials",
  },
];

export default function NavbarDemo() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative w-full">
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <NavItems items={navLinks} />
          <div className="relative z-20 flex shrink-0 items-center gap-4 pl-4">
            <NavbarButton
              variant="secondary"
              onClick={() => navigate("/auth/login")}
            >
              Sign In
            </NavbarButton>
            <NavbarButton
              variant="primary"
              onClick={() => navigate("/auth/register")}
            >
              Get Started Free
            </NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navLinks.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-neutral-600"
              >
                <span className="block">{item.name}</span>
              </a>
            ))}
            <div className="flex w-full flex-col gap-4">
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/auth/login");
                }}
                variant="primary"
                className="w-full"
              >
                Sign In
              </NavbarButton>
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/auth/register");
                }}
                variant="primary"
                className="w-full"
              >
                Get Started Free
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
