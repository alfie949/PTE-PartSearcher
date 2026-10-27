// Shared helpers used by both popup.js and background.js.
// Storage schema (v1.1+):
//   searchSites: [ { url: string, name: string, enabled: boolean } ]

const DEFAULT_SITES = [
  // Aggregators that index brokers, independents and non-authorised stock.
  // These are what the authorised-channel APIs cannot see.
  { url: 'https://www.findchips.com/search/',        name: 'Findchips',    enabled: true },
  { url: 'https://www.oemsecrets.com/compare/',      name: 'OEMsecrets',   enabled: true },
  { url: 'https://octopart.com/search?q=',           name: 'Octopart',     enabled: true },
  { url: 'https://www.oemstrade.com/search/',        name: 'OEMsTrade',    enabled: true },
  { url: 'https://www.trustedparts.com/en/search/',  name: 'TrustedParts', enabled: false },

  // Authorised distributors with no API key held.
  { url: 'https://uk.rs-online.com/web/c/?searchTerm=',                          name: 'RS',     enabled: true },
  { url: 'https://www.arrow.com/en/products/search?q=',                          name: 'Arrow',  enabled: true },
  // VERIFY THESE TWO - search path confirmed, free-text parameter inferred.
  { url: 'https://www.ttieurope.com/content/ttieurope/en/apps/part-search.html?q=', name: 'TTI',  enabled: true },
  { url: 'https://www.anglia-live.com/Search/tiers.aspx?q=',                     name: 'Anglia', enabled: true },
  { url: 'https://www.tme.eu/gb/katalog/?search=',   name: 'TME',        enabled: false },

  // Obsolete / EOL / last-time-buy specialists.
  { url: 'https://www.rocelec.com/search?q=',        name: 'Rochester',  enabled: false },

  // Covered by your parts-finder API - off by default to avoid duplicating it
  // and to keep you off the rate limiters.
  { url: 'https://uk.farnell.com/search?st=',                      name: 'Farnell',  enabled: false },
  { url: 'https://www.digikey.co.uk/en/products/result?keywords=', name: 'Digi-Key', enabled: false },
  { url: 'https://www.mouser.co.uk/c/?q=',                         name: 'Mouser',   enabled: false }
];

// Gap between opening each tab, in milliseconds. Firing several search-page
// loads in the same instant is the pattern rate-limiters flag hardest, so we
// space them out. Raise this if you still get challenged.
const TAB_STAGGER_MS = 600;

const NOISE = new Set([
  'www', 'com', 'net', 'org', 'io', 'co', 'uk', 'eu', 'de', 'fr', 'nl',
  'ie', 'us', 'shop', 'store', 'search', 'gb'
]);

const PRETTY = {
  digikey: 'Digi-Key',
  'rs-online': 'RS',
  farnell: 'Farnell',
  mouser: 'Mouser',
  octopart: 'Octopart',
  arrow: 'Arrow',
  avnet: 'Avnet',
  tme: 'TME',
  rutronik24: 'Rutronik',
  findchips: 'Findchips',
  oemsecrets: 'OEMsecrets',
  oemstrade: 'OEMsTrade',
  trustedparts: 'TrustedParts',
  rocelec: 'Rochester',
  ttieurope: 'TTI',
  'anglia-live': 'Anglia'
};

function siteNameFromUrl(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
  const parts = host.split('.').filter(p => p && !NOISE.has(p));
  const token = parts.sort((a, b) => b.length - a.length)[0] || host;
  if (PRETTY[token]) return PRETTY[token];
  return token.charAt(0).toUpperCase() + token.slice(1);
}

// Hostname without www., used for matching an already-open tab.
// Returns null for chrome://, about:, file:// etc.
function baseHost(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Build match patterns for one supplier URL.
// Counting labels does not work here (digikey.co.uk has three), so we emit the
// hostname exactly as given plus its www-stripped and www-prefixed forms, then
// dedupe. A pattern that never matches anything is harmless.
function matchPatternsFor(url) {
  let host;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return [];
    host = parsed.hostname.toLowerCase();
  } catch {
    return [];
  }

  const bare = host.replace(/^www\./, '');
  return [...new Set([host, bare, `www.${bare}`])].map(h => `*://${h}/*`);
}

function migrateSites(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(entry => {
      if (typeof entry === 'string') {
        return { url: entry, name: siteNameFromUrl(entry), enabled: true };
      }
      if (entry && typeof entry.url === 'string') {
        return {
          url: entry.url,
          name: entry.name || siteNameFromUrl(entry.url),
          enabled: entry.enabled !== false
        };
      }
      return null;
    })
    .filter(Boolean);
}

function getSites(callback) {
  chrome.storage.local.get({ searchSites: [] }, ({ searchSites }) => {
    const migrated = migrateSites(searchSites);
    if (JSON.stringify(migrated) !== JSON.stringify(searchSites)) {
      chrome.storage.local.set({ searchSites: migrated }, () => callback(migrated));
    } else {
      callback(migrated);
    }
  });
}

function setSites(sites, callback) {
  chrome.storage.local.set({ searchSites: sites }, () => callback && callback(sites));
}
