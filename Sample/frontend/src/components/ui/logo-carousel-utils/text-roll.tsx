"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TextRollProps {
  children: string;
  className?: string;
  /** Delay between each character animation in seconds */
  delay?: number;
  /** Duration of each character animation in seconds */
  duration?: number;
}

export function TextRoll({
  children,
  className,
  delay = 0.03,
  duration = 0.4,
}: TextRollProps) {
  const characters = children.split("");

  return (
    <span className={cn("inline-flex flex-wrap", className)} aria-label={children}>
      {characters.map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="inline-block overflow-hidden"
          aria-hidden="true"
        >
          <span
            className="inline-block animate-[textRollIn_0.4s_ease-out_forwards] opacity-0"
            style={{
              animationDelay: `${index * delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        </span>
      ))}
    </span>
  );
}
