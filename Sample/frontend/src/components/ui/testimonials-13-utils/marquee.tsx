import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends ComponentProps<"div"> {
  /**
   * pause the marquee animation on hover
   * The animation stops when the cursor is over the marquee
   */
  pauseOnHover?: boolean;
  /**
   * vertical or horizontal direction
   * The animation runs in the direction defined by the CSS variable --direction
   */
  vertical?: boolean;
  /**
   * number of times to repeat the content
   */
  repeat?: number;
}

export function Marquee({
  className,
  pauseOnHover = false,
  vertical = false,
  repeat = 4,
  children,
  style: styleProp,
  ...props
}: MarqueeProps) {
  const direction = vertical ? "marquee-vertical" : "marquee";

  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
        className,
      )}
      style={
        {
          "--direction": direction,
          ...styleProp,
        } as React.CSSProperties
      }
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 justify-around [gap:var(--gap)]",
            vertical ? "[flex-direction:column]" : "[flex-direction:row]",
            "animate-[var(--direction)_var(--duration)_linear_infinite]",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
