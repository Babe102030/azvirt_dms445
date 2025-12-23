import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

// Languages that use RTL (Right-to-Left) layout
const RTL_LANGUAGES = ["ar", "fa", "he", "ur"];

interface RTLInitializerProps {
  children: React.ReactNode;
}

/**
 * Component to manage RTL layout based on current language
 * Automatically sets the dir attribute on the HTML element
 * and applies RTL CSS classes to the document
 */
export default function RTLInitializer({ children }: RTLInitializerProps) {
  const { language } = useLanguage();

  useEffect(() => {
    const htmlElement = document.getElementById("root-html");
    const isRTL = RTL_LANGUAGES.includes(language);

    if (htmlElement) {
      htmlElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
      htmlElement.setAttribute("lang", language);
      
      // Apply RTL class to document for CSS-based styling
      if (isRTL) {
        document.documentElement.classList.add("rtl");
      } else {
        document.documentElement.classList.remove("rtl");
      }
    }
  }, [language]);

  return <>{children}</>;
}
