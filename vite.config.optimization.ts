/**
 * Vite optimization configuration for production builds
 * Enables code splitting, lazy loading, and bundle size optimization
 */

export const optimizationConfig = {
  build: {
    // Enable minification
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      output: {
        comments: false,
      },
    },

    // Code splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          "vendor-react": ["react", "react-dom"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select"],
          "vendor-trpc": ["@trpc/client", "@trpc/react-query"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-routing": ["wouter"],
          "vendor-utils": ["nanoid", "date-fns", "zod"],
        },
      },
    },

    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    reportCompressedSize: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@trpc/client",
      "@trpc/react-query",
      "@tanstack/react-query",
      "wouter",
      "zod",
    ],
    exclude: ["@vite/client"],
  },
};

/**
 * Performance monitoring configuration
 * Tracks Web Vitals: LCP, FID, CLS
 */
export const performanceConfig = {
  // Report Web Vitals to analytics
  reportWebVitals: true,

  // Performance thresholds (in milliseconds)
  thresholds: {
    LCP: 2500, // Largest Contentful Paint
    FID: 100, // First Input Delay
    CLS: 0.1, // Cumulative Layout Shift
    TTFB: 600, // Time to First Byte
  },

  // Enable performance observer
  enablePerformanceObserver: true,
};

/**
 * Image optimization configuration
 */
export const imageOptimizationConfig = {
  formats: ["webp", "avif", "png", "jpg"],
  sizes: {
    thumbnail: 150,
    small: 300,
    medium: 600,
    large: 1200,
    xlarge: 1920,
  },
  quality: {
    webp: 80,
    avif: 75,
    jpg: 85,
  },
};

/**
 * Caching strategy configuration
 */
export const cachingConfig = {
  // Service worker caching
  serviceworker: {
    enabled: true,
    cacheVersion: "v1",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },

  // HTTP caching headers
  httpCaching: {
    staticAssets: {
      "max-age": 31536000, // 1 year for versioned assets
      "immutable": true,
    },
    htmlPages: {
      "max-age": 3600, // 1 hour
      "must-revalidate": true,
    },
    apiResponses: {
      "max-age": 300, // 5 minutes
      "stale-while-revalidate": 86400, // 24 hours
    },
  },

  // Query result caching
  queryCache: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (garbage collection)
  },
};

/**
 * Font optimization configuration
 */
export const fontOptimizationConfig = {
  // Use system fonts as fallback
  fontFamily: {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"Fira Code", "Courier New", monospace',
  },

  // Font display strategy
  fontDisplay: "swap", // Show fallback font immediately

  // Preload critical fonts
  preload: [
    // Add critical fonts here
  ],
};
