import { config } from "../config.js";

function describeBrowser(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return null;
}

function describeOs(ua) {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return null;
}

/** "Chrome on Windows" */
export function describeDevice(userAgent = "") {
  const browser = describeBrowser(userAgent);
  const os = describeOs(userAgent);
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Unknown device";
}

function isPrivateIp(ip = "") {
  const v4 = ip.replace(/^::ffff:/, "");
  return (
    ip === "::1" ||
    /^(127|10)\./.test(v4) ||
    /^192\.168\./.test(v4) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(v4) ||
    /^f[cd]/i.test(ip) ||
    /^fe80/i.test(ip)
  );
}

function approximateLocation(req) {
  if (config.TRUST_GEO_HEADERS) {
    const city = req.get("cf-ipcity") ?? req.get("x-vercel-ip-city");
    const country = req.get("cf-ipcountry") ?? req.get("x-vercel-ip-country") ?? req.get("x-appengine-country");
    if (city || country) return [city && decodeURIComponent(city), country].filter(Boolean).join(", ");
  }
  return isPrivateIp(req.ip) ? "Local network" : "Unknown location";
}

export function getRequestContext(req) {
  const userAgent = (req.get("user-agent") ?? "").slice(0, 512);
  return {
    ip: req.ip ?? "unknown",
    userAgent,
    device: describeDevice(userAgent),
    location: approximateLocation(req),
  };
}
