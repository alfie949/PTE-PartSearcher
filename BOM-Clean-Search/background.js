importScripts('sites.js');

const HIGHLIGHTER_ID = 'bom-highlighter';

// ---------------------------------------------------------------------------
// Content script registration
//
// v1.1 registered content.js against <all_urls> in the manifest, so the
// highlighter ran on every page the browser loaded - including bot-check and
// challenge interstitials, which do not appreciate a third party rewriting
// their DOM underneath them.
//
// We now register it dynamically for the supplier domains only, and re-register
// whenever the site list changes.
//
// Calls are queued so they run one after another. On install, onInstalled and
// storage.onChanged both fire at once; run in parallel, they could each clear
// the other's registration and leave the highlighter registered nowhere.
// ---------------------------------------------------------------------------
let syncQueue = Promise.resolve();

function syncHighlighterRegistration() {
  syncQueue = syncQueue.then(doSyncHighlighterRegistration, doSyncHighlighterRegistration);
  return syncQueue;
}

async function doSyncHighlighterRegistration() {
  const sites = await new Promise(resolve => getSites(resolve));

  const matches = [...new Set(
    sites.filter(s => s.enabled).flatMap(s => matchPatternsFor(s.url))
  )];

  // Clear any previous registration first; unregistering a missing id throws.
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [HIGHLIGHTER_ID] });
    if (existing.length) {
      await chrome.scripting.unregisterContentScripts({ ids: [HIGHLIGHTER_ID] });
    }
  } catch (e) {
    // Nothing registered yet - fine.
  }

  if (matches.length === 0) return; // registerContentScripts rejects an empty match list

  try {
    await chrome.scripting.registerContentScripts([{
      id: HIGHLIGHTER_ID,
      matches,
      js: ['content.js'],
      css: ['highlight.css'],
      runAt: 'document_idle',
      allFrames: false,
      persistAcrossSessions: true
    }]);
  } catch (e) {
    console.warn('BOM Clean Search: could not register highlighter', e);
  }
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  chrome.storage.local.get({ searchSites: [] }, ({ searchSites }) => {
    const migrated = migrateSites(searchSites);
    if (migrated.length === 0 && reason === 'install') {
      chrome.storage.local.set({ searchSites: DEFAULT_SITES }, syncHighlighterRegistration);
    } else if (JSON.stringify(migrated) !== JSON.stringify(searchSites)) {
      chrome.storage.local.set({ searchSites: migrated }, syncHighlighterRegistration);
    } else {
      syncHighlighterRegistration();
    }
  });
});

chrome.runtime.onStartup.addListener(syncHighlighterRegistration);

// Keep the injection list in step with the toggles.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.searchSites) syncHighlighterRegistration();
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BOMCLEANSEARCH') {
    const { term } = message;

    getSites(async sites => {
      const active = sites.filter(s => s.enabled);

      if (active.length === 0) {
        sendResponse({ status: 'No suppliers are switched on.' });
        return;
      }

      await chrome.storage.local.set({ searchTerm: term });

      const allTabs = await chrome.tabs.query({});

      // Open one at a time with a gap, rather than firing the whole set at once.
      for (let i = 0; i < active.length; i++) {
        const site = active[i];
        const fullUrl = site.url + encodeURIComponent(term);
        const host = baseHost(site.url);

        const existingTab = host
          ? allTabs.find(tab => tab.url && baseHost(tab.url) === host)
          : null;

        try {
          if (existingTab) {
            await chrome.tabs.update(existingTab.id, { url: fullUrl, active: false });
          } else {
            await chrome.tabs.create({ url: fullUrl, active: false });
          }
        } catch (e) {
          console.warn('BOM Clean Search: could not open', site.name, e);
        }

        if (i < active.length - 1) await wait(TAB_STAGGER_MS);
      }

      const names = active.map(s => s.name).join(', ');
      sendResponse({ status: `Searching "${term}" on ${names}.` });
    });

    return true;
  }

  if (message.type === 'BOM_GET_SITES') {
    getSites(sites => sendResponse({ sites }));
    return true;
  }

  if (message.type === 'BOM_SET_SITES') {
    setSites(migrateSites(message.sites), () => sendResponse({ status: 'saved' }));
    return true;
  }
});
