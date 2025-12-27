import React, { useEffect, useRef, useCallback } from "react";

/**
 * Hook to measure and report Web Vitals (LCP, FID, CLS)
 */
export function useWebVitals() {
  useEffect(() => {
    // Report Largest Contentful Paint (LCP)
    if ("PerformanceObserver" in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log("LCP:", lastEntry.renderTime || lastEntry.loadTime);
        });
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

        // Report Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
              console.log("CLS:", clsValue);
            }
          }
        });
        clsObserver.observe({ entryTypes: ["layout-shift"] });

        // Report First Input Delay (FID)
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            console.log("FID:", (entry as any).processingDuration);
          });
        });
        fidObserver.observe({ entryTypes: ["first-input"] });

        return () => {
          lcpObserver.disconnect();
          clsObserver.disconnect();
          fidObserver.disconnect();
        };
      } catch (error) {
        console.error("Error setting up Web Vitals observer:", error);
      }
    }
  }, []);
}

/**
 * Hook to measure component render time
 */
export function useRenderTime(componentName: string) {
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - startTimeRef.current;
    if (renderTime > 16.67) {
      // Longer than one frame (60fps)
      console.warn(`${componentName} render took ${renderTime.toFixed(2)}ms`);
    }
  });
}

/**
 * Hook to debounce expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to throttle event handlers
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef(Date.now());

  return useCallback(
    (...args: any[]) => {
      const now = Date.now();
      if (now - lastRunRef.current >= delay) {
        callback(...args);
        lastRunRef.current = now;
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Hook to measure API request performance
 */
export function useRequestPerformance(requestName: string) {
  const startTimeRef = useRef(performance.now());

  const recordMetric = useCallback(() => {
    const duration = performance.now() - startTimeRef.current;
    console.log(`${requestName} took ${duration.toFixed(2)}ms`);

    // Report to analytics if needed
    if (window.gtag) {
      window.gtag("event", "api_request", {
        request_name: requestName,
        duration_ms: Math.round(duration),
      });
    }
  }, [requestName]);

  return { recordMetric };
}

/**
 * Hook to implement infinite scroll with performance optimization
 */
export function useInfiniteScroll(
  callback: () => void,
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || "100px",
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [callback, options]);

  return observerTarget;
}

/**
 * Hook to lazy load images with blur-up effect
 */
export function useLazyImage(src: string) {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [imageRef, setImageRef] = React.useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let observer: IntersectionObserver;

    if (imageRef && imageSrc === null) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setImageSrc(src);
            observer.unobserve(imageRef);
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(imageRef);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [imageRef, imageSrc, src]);

  return { ref: setImageRef, src: imageSrc };
}

/**
 * Hook to prefetch resources
 */
export function usePrefetch(urls: string[]) {
  useEffect(() => {
    urls.forEach((url) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      document.head.appendChild(link);
    });
  }, [urls]);
}

/**
 * Hook to preload resources
 */
export function usePreload(urls: string[]) {
  useEffect(() => {
    urls.forEach((url) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.href = url;
      link.as = url.endsWith(".css") ? "style" : "script";
      document.head.appendChild(link);
    });
  }, [urls]);
}
