"use client"

import { LayoutGrid } from "lucide-react"
import { Component } from "@/components/ui/feature-carousel"

const images: Record<number, string> = {
  0: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&h=630&q=70",
  1: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&h=630&q=70",
  2: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&h=630&q=70",
  3: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&h=630&q=70",
  4: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&h=630&q=70",
  5: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&h=630&q=70",
  6: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&h=630&q=70",
  7: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&h=630&q=70",
}

export function FeatureCarouselSection() {
  return (
    <section id="features" className="relative bg-white py-16 sm:py-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-100/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent-100/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700">
            <LayoutGrid className="h-4 w-4" />
            Platform Features
          </div>
          <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
            Everything you need for modern{' '}
            <span className="text-primary-600">competency assessment</span>
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            From AI-powered evaluation to digital certification — Qualexas provides a complete
            end-to-end platform for skills assessment and verification.
          </p>
        </div>

        <div className="mt-12 px-2 sm:mt-16 sm:px-4">
          <Component
            image={{
              images: [0, 1, 2, 3, 4, 5, 6, 7].map((idx) => images[idx]!),
              alt: "Qualexas platform feature demonstration",
            }}
          />
        </div>
      </div>
    </section>
  )
}

export default FeatureCarouselSection