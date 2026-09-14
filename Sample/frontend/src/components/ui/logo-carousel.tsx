"use client";

import { useEffect, useMemo, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/logo-carousel-utils/carousel";
import { TextRoll } from "@/components/ui/logo-carousel-utils/text-roll";

export const AnimatedCarousel = ({
  title = "Trusted by thousands of businesses worldwide",
  logoCount = 15,
  autoPlay = true,
  autoPlayInterval = 1000,
  logos = null,
  containerClassName = "",
  titleClassName = "",
  carouselClassName = "",
  logoClassName = "",
  itemsPerViewMobile = 4,
  itemsPerViewDesktop = 6,
  spacing = "gap-10",
  padding = "py-20 lg:py-40",
  logoContainerWidth = "w-48",
  logoContainerHeight = "h-24",
  logoImageWidth = "w-full",
  logoImageHeight = "h-full",
  logoMaxWidth = "",
  logoMaxHeight = "",
}: {
  title?: string;
  logoCount?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  logos?: string[] | null;
  containerClassName?: string;
  titleClassName?: string;
  carouselClassName?: string;
  logoClassName?: string;
  itemsPerViewMobile?: number;
  itemsPerViewDesktop?: number;
  spacing?: string;
  padding?: string;
  logoContainerWidth?: string;
  logoContainerHeight?: string;
  logoImageWidth?: string;
  logoImageHeight?: string;
  logoMaxWidth?: string;
  logoMaxHeight?: string;
}) => {
  const [api, setApi] = useState<CarouselApi>();

  const plugin = useMemo(
    () =>
      Autoplay({
        delay: autoPlayInterval,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    [autoPlayInterval],
  );

  useEffect(() => {
    if (!api || !autoPlay) {
      return;
    }
    if (api.plugins()?.autoplay) {
      api.plugins().autoplay.play();
    }
  }, [api, autoPlay]);

  const logoItemsSource =
    logos ||
    Array.from(
      { length: logoCount },
      (_, i) =>
        `https://th.bing.com/th/id/R.4aa108082e7d3cbd55add79f84612aaa?rik=I4dbPhSe%2fbHHSg&riu=http%3a%2f%2fpurepng.com%2fpublic%2fuploads%2flarge%2fpurepng.com-google-logo-2015brandlogobrand-logoiconssymbolslogosgoogle-6815229372333mqrr.png&ehk=ewmaCOvP0Ji4QViEJnxSdlrYUrTSTWhi8nZ9XdyCgAI%3d&risl=&pid=ImgRaw&r=0100x100?text=Logo+${i + 1}`,
    );

  // Duplicate the logos so the loop has enough content to scroll continuously
  const logoItems = [...logoItemsSource, ...logoItemsSource];

  const logoImageSizeClasses =
    `${logoImageWidth} ${logoImageHeight} ${logoMaxWidth} ${logoMaxHeight}`.trim();

  return (
    <div className={`w-full ${padding} bg-background ${containerClassName}`}>
      <div className="container mx-auto">
        <div className={`flex flex-col ${spacing} items-center text-center`}>
          <h2
            className={`text-xl md:text-3xl md:text-5xl tracking-tighter lg:max-w-2xl font-regular text-center text-foreground ${titleClassName}`}
          >
            <TextRoll>{title}</TextRoll>
          </h2>

          <div className="w-full">
            <Carousel
              setApi={setApi}
              plugins={autoPlay ? [plugin] : undefined}
              opts={{
                loop: true,
                align: "center",
                dragFree: true,
              }}
              className={`w-full ${carouselClassName}`}
            >
              <CarouselContent className="-ml-8">
                {logoItems.map((logo, index) => (
                  <CarouselItem
                    className={`basis-1/${itemsPerViewMobile} lg:basis-1/${itemsPerViewDesktop} pl-8`}
                    key={index}
                  >
                    <div
                      className={`flex rounded-md ${logoContainerWidth} ${logoContainerHeight} items-center justify-center p-4 hover:bg-accent transition-colors ${logoClassName}`}
                    >
                      <img
                        src={typeof logo === "string" ? logo : logo}
                        alt={`Logo ${index + 1}`}
                        className={`${logoImageSizeClasses} object-contain filter brightness-0 dark:brightness-0 dark:invert`}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedCarousel;
