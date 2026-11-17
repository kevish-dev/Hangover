const channelKey = "hangover_discovery_channel";
const channels = new Set(["chatgpt", "claude", "gemini", "perplexity", "google", "bing"]);

export function saveDiscoveryChannel() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("share")) return;
    const source = url.searchParams.get("utm_source")?.toLowerCase();
    const paid = /^(?:cpc|ppc|paid(?:[_-].*)?|display)$/i.test(url.searchParams.get("utm_medium") ?? "") || url.searchParams.has("gclid") || url.searchParams.has("msclkid");
    if (paid) {
      sessionStorage.removeItem(channelKey);
      return;
    }
    let referrer = "";
    if (document.referrer) referrer = new URL(document.referrer).hostname.toLowerCase();
    const channel = referrer === "gemini.google.com" || source === "gemini" ? "gemini"
      : /(^|\.)chatgpt\.com$/.test(referrer) || source === "chatgpt.com" || source === "chatgpt" ? "chatgpt"
      : /(^|\.)claude\.ai$/.test(referrer) || source === "claude" ? "claude"
      : /(^|\.)perplexity\.ai$/.test(referrer) || source === "perplexity" ? "perplexity"
      : /(^|\.)google\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(referrer) ? "google"
      : /(^|\.)bing\.com$/.test(referrer) ? "bing" : null;
    if (channel) sessionStorage.setItem(channelKey, channel);
  } catch {
    // Storage and referral metadata are optional.
  }
}

export function getDiscoveryChannel() {
  try {
    const channel = sessionStorage.getItem(channelKey);
    return channel && channels.has(channel) ? channel : null;
  } catch {
    return null;
  }
}
