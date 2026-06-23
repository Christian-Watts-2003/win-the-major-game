// HLTV 3.0 stat tier classification.
// Thresholds derived from the actual CS2 Major player pool (n=601),
// using p25/p75/p90 percentiles as tier boundaries.
//
// Tiers: red (below avg) | yellow (avg) | green (above avg) | blue (outlier)
//
// DPR is inverted — lower values are better.
// RSW% spans negative values; thresholds reflect the actual distribution.
const TIERS = {
  rating3:      { p25: 0.92, p75: 1.09, p90: 1.16, invert: false },
  kast:         { p25: 69,   p75: 74,   p90: 76,   invert: false },
  kpr:          { p25: 0.59, p75: 0.70, p90: 0.74, invert: false },
  dpr:          { p25: 0.63, p75: 0.70, p90: 0.73, invert: true  },
  multiKill:    { p25: 12.9, p75: 17.6, p90: 19.4, invert: false },
  roundSwingPct:{ p25: -1.2, p75: 0.81, p90: 1.67, invert: false },
};
// Returns one of: "blue" | "green" | "yellow" | "red" | null (no data)
export function statTier(statKey, value) {
  if (value === null || value === undefined || value === 0) return null;
  const t = TIERS[statKey];
  if (!t) return null;
  if (t.invert) {
    if (value < t.p25)  return "blue";
    if (value < t.p75)  return "green";
    if (value <= t.p90) return "yellow";
    return "red";
  } else {
    if (value > t.p90)  return "blue";
    if (value > t.p75)  return "green";
    if (value >= t.p25) return "yellow";
    return "red";
  }
}
// Tailwind text-color class for a tier.
export function tierTextClass(tier) {
  switch (tier) {
    case "blue":   return "text-blue-400";
    case "green":  return "text-broadcast-green";
    case "yellow": return "text-broadcast-orange";
    case "red":    return "text-broadcast-red";
    default:       return "text-broadcast-muted";
  }
}
// Tailwind bg-color class for attribute bars (vertical/horizontal).
export function tierBgClass(tier) {
  switch (tier) {
    case "blue":   return "bg-blue-400";
    case "green":  return "bg-broadcast-green";
    case "yellow": return "bg-broadcast-orange";
    case "red":    return "bg-broadcast-red";
    default:       return "bg-broadcast-muted/20";
  }
}
