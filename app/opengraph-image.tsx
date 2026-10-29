import { ImageResponse } from "next/og";

import { PAGE_TITLE, SITE_NAME } from "@/lib/constants";

export const alt = PAGE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A year of daylight in New York, as bar heights: short winter days, long summer ones. */
const BARS = Array.from({ length: 52 }, (_, week) => 9.25 + 2.9 * (1 - Math.cos((2 * Math.PI * (week - 1)) / 52)));

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0e1510", padding: "60px 72px", color: "#e7efe4", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "26px", color: "#f3d36b" }}>{SITE_NAME}</div>
          <div style={{ display: "flex", marginTop: "16px", fontSize: "68px", fontWeight: 700, lineHeight: 1.05 }}>When do the days start getting longer?</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", height: "200px", gap: "6px" }}>
          {BARS.map((hours, index) => (
            <div key={index} style={{ display: "flex", width: "14px", height: `${(hours / 24) * 200}px`, background: "#f3d36b", borderRadius: "3px" }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
