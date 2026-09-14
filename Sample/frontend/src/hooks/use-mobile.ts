import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const updateIsMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    const mediaQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
      : null

    const onChange = () => updateIsMobile()

    if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange)
    }

    updateIsMobile()

    return () => {
      if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onChange)
      }
    }
  }, [])

  return !!isMobile
}
