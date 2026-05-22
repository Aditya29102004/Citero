import { useEffect } from "react";

const Logo = () => {
  useEffect(() => {
    // Redirect to the logo PNG
    window.location.href = "/logo.png";
  }, []);

  return null;
};

export default Logo;

