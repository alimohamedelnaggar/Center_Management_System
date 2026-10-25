import { useContext } from "react";
import { BrandingContext } from "./BrandingContext.jsx";

export function useBranding() {
  return useContext(BrandingContext);
}
