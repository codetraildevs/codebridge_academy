import { useEffect, useState } from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function resolveTheme(): ToasterProps['theme'] {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return 'light';
}

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState<ToasterProps['theme']>(resolveTheme);

  // Follow the app's `.dark` class toggle (no next-themes in this project).
  useEffect(() => {
    const element = document.documentElement;
    setTheme(resolveTheme());
    const observer = new MutationObserver(() => setTheme(resolveTheme()));
    observer.observe(element, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      {...props}
    />
  );
};

export { Toaster };