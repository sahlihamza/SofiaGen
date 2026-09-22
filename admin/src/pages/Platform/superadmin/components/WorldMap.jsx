import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * WorldMap
 *
 * Lightweight, self-contained SVG "dot map".
 * Plots approximate country centroids on a simple equirectangular projection.
 * No external map library required.
 *
 * props:
 *  - data: [{ country, value, label }]
 *  - countryField: "country" (ISO-2 / alpha-3 / name)
 *  - valueField: "value"
 *  - color: hex for dots
 *  - height
 */
const COUNTRY_COORDS = {
  // ISO-2 -> [lon, lat]
  US: [-98.5, 39.8], CA: [-106.3, 56.1], MX: [-102.5, 23.6], BR: [-51.9, -14.2],
  AR: [-63.6, -38.4], CO: [-74.3, 4.6], CL: [-71.5, -35.7], PE: [-75.0, -9.2],
  VE: [-66.6, 6.4], EC: [-78.2, -1.8], BO: [-64.2, -16.5], PY: [-58.4, -23.4],
  UY: [-55.8, -32.5], GB: [-3.4, 54.0], FR: [2.2, 46.6], DE: [10.4, 51.2],
  IT: [12.5, 42.8], ES: [-3.7, 40.2], PT: [-8.2, 39.6], NL: [5.3, 52.1],
  BE: [4.5, 50.5], CH: [8.2, 46.8], AT: [14.5, 47.5], SE: [15.3, 62.2],
  NO: [8.5, 61.1], DK: [9.5, 56.2], FI: [26.0, 63.1], PL: [19.1, 51.9],
  CZ: [15.5, 49.8], RO: [24.9, 45.9], GR: [22.0, 39.1], IE: [-8.2, 53.2],
  RU: [96.7, 61.5], UA: [31.2, 48.4], TR: [35.2, 39.0], EG: [30.0, 26.8],
  MA: [-6.5, 31.8], DZ: [2.6, 28.0], TN: [9.6, 34.0], LY: [17.2, 27.0],
  ZA: [24.7, -29.0], NG: [8.0, 9.1], KE: [37.9, -0.1], GH: [-1.2, 7.9],
  SN: [-14.5, 14.5], CI: [-5.6, 7.5], ET: [39.6, 9.1], TZ: [34.9, -6.4],
  UG: [32.3, 1.4], CM: [12.4, 5.7], CD: [23.6, -2.9], ZM: [27.8, -13.1],
  ZW: [29.1, -19.0], MZ: [35.5, -18.7], AO: [17.8, -12.3], BW: [24.7, -22.3],
  NA: [18.5, -22.0], IN: [78.9, 21.8], CN: [104.2, 35.9], JP: [138.2, 36.2],
  KR: [127.8, 36.5], ID: [113.9, -2.5], TH: [101.0, 15.1], VN: [108.3, 14.1],
  PH: [122.9, 12.9], MY: [101.7, 3.9], SG: [103.8, 1.4], PK: [69.4, 29.4],
  BD: [90.4, 23.7], NP: [83.9, 28.4], LK: [80.8, 7.8], MM: [96.0, 21.5],
  KH: [104.9, 12.8], LA: [102.5, 18.4], TW: [121.0, 23.7], HK: [114.1, 22.3],
  AU: [134.5, -25.7], NZ: [172.8, -41.6], PG: [146.4, -6.3], FJ: [177.9, -17.8],
  SA: [45.1, 23.9], AE: [54.0, 23.9], QA: [51.2, 25.3], KW: [47.5, 29.3],
  IQ: [43.6, 33.2], IR: [53.7, 32.4], IL: [34.9, 31.4], JO: [36.3, 31.0],
  LB: [35.9, 33.9], SY: [38.9, 34.8], YE: [48.5, 15.5], OM: [56.1, 21.0],
  KZ: [66.9, 48.2], UZ: [64.6, 41.4], AF: [65.2, 33.9], MN: [103.1, 46.9],
};

const FALLBACK = { US: [-98.5, 39.8], FR: [2.2, 46.6], DE: [10.4, 51.2], GB: [-3.4, 54.0] };

const project = (lon, lat, width, height) => {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
};

const WorldMap = ({
  data = [],
  valueField = "value",
  color = "#3B82F6",
  height = 300,
  showLegend = true,
  className = "",
}) => {
  const { t } = useTranslation();
  const points = useMemo(() => {
    const max = Math.max(...data.map((d) => Number(d[valueField] || 0)), 1);
    return data
      .map((d) => {
        const countryKey = String(d.country || "").toUpperCase();
        const coord = COUNTRY_COORDS[countryKey] || FALLBACK[countryKey] || null;
        if (!coord) return null;
        const [x, y] = project(coord[0], coord[1], 800, 400);
        return {
          x,
          y,
          value: Number(d[valueField] || 0),
          r: Math.max(3, Math.min(16, Math.sqrt(d[valueField] / max) * 16)),
          country: d.country,
          label: d.label || d.country,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value);
  }, [data, valueField]);

  const total = useMemo(() => points.reduce((s, p) => s + p.value, 0), [points]);

  if (!points.length) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-dashed border-gray-300 py-10 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 ${className}`}>
        {t("superadminDashboard.geographic.noData")}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
<svg viewBox="0 0 800 400" className="w-full" style={{ height }} role="img" aria-label={t("superadminDashboard.geographic.mapAria")}>
        {/* Simple graticule */}
        {Array.from({ length: 13 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={(i / 12) * 800}
            y1={0}
            x2={(i / 12) * 800}
            y2={400}
            stroke="rgba(128,128,128,0.08)"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={(i / 6) * 400}
            x2={800}
            y2={(i / 6) * 400}
            stroke="rgba(128,128,128,0.08)"
            strokeWidth="1"
          />
        ))}

        {points.map((p, i) => (
          <g key={`${p.country}-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r + 3}
              fill={color}
              opacity={0.15}
            />
            <circle cx={p.x} cy={p.y} r={p.r} fill={color} opacity={0.85} />
            <title>{`${p.label}: ${p.value.toLocaleString()}`}</title>
          </g>
        ))}
      </svg>

      {showLegend && (
        <div className="mt-3 flex items-center justify-between px-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {t("superadminDashboard.geographic.regions", { count: points.length, total: total.toLocaleString() })}
          </span>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span>{t("superadminDashboard.geographic.mapLegend")}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldMap;
