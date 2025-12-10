import { useEffect } from "react";

const Logo = () => {
  useEffect(() => {
    // Redirect to the logo SVG (try logo.svg first, then favicon.svg as fallback)
    window.location.href = "/logo.svg";
  }, []);

  return null;
};

export default Logo;

