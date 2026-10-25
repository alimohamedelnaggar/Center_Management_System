import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function Barcode({
  value,
  height = 44,
  width = 1.5,
  fontSize = 12,
  className = "",
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      JsBarcode(svgRef.current, String(value), {
        format: "CODE128",
        height,
        width,
        fontSize,
        displayValue: true,
        margin: 4,
        background: "#ffffff",
        lineColor: "#0f172a",
      });
    } catch {
      // ignore invalid values
    }
  }, [value, height, width, fontSize]);

  return <svg ref={svgRef} className={className} />;
}
