// Highlights the stored search term on a supplier's results page.
//
// As of v1.2 this only runs on supplier domains (registered dynamically by
// background.js), not on every page in the browser.
//
// As of v1.5 it never changes the page. Earlier versions split text nodes and
// wrapped matches in <mark>. Digi-Key (and other React sites) keep references to
// their own text nodes, so when React next re-renders - e.g. swapping a
// placeholder for the product image - it tries to remove a node that is no
// longer there, throws, and the images never appear.
//
// Matches are now painted with the CSS Custom Highlight API: we hand the
// browser a list of text ranges and it colours them, with no DOM edits at all.
// The ::highlight() style lives in highlight.css, injected alongside this file.

const HIGHLIGHT_NAME = 'bom-clean-search';
const RESCAN_DELAY_MS = 400;

// Bail out on bot-check / challenge interstitials. Even reading the page
// heavily while a challenge script is measuring it is best avoided.
function isChallengePage() {
  if (document.getElementById('challenge-running')) return true;
  if (document.getElementById('challenge-form')) return true;
  if (document.getElementById('cf-challenge-running')) return true;
  if (document.querySelector('[class*="cf-browser-verification"]')) return true;
  if (document.querySelector('script[src*="challenge-platform"]')) return true;

  const t = (document.title || '').trim().toLowerCase();
  if (t === 'just a moment...' || t === 'just a moment…') return true;
  if (t.startsWith('attention required')) return true;
  if (t.includes('access denied') || t.includes('forbidden')) return true;

  return false;
}

// Build ranges for every match and register them. Returns the match count.
function highlightTerm(term) {
  if (!term || !document.body) return 0;
  if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return 0;

  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedTerm, 'gi');
  const ranges = [];

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const tag = node.parentNode && node.parentNode.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.nodeValue;
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[0].length === 0) { regex.lastIndex++; continue; }
      const range = new Range();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      ranges.push(range);
    }
  }

  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
  return ranges.length;
}

// Tab title shows the match count, e.g. "(3) Digi-Key ...".
function showCount(count) {
  const originalTitle = document.title.replace(/^\(\d+\)\s/, '');
  const wanted = count > 0 ? `(${count}) ${originalTitle}` : originalTitle;
  if (document.title !== wanted) document.title = wanted;
}

function run(term) {
  if (isChallengePage()) return;
  showCount(highlightTerm(term));
}

if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.get('searchTerm', ({ searchTerm }) => {
    if (!searchTerm || !document.body) return;
    run(searchTerm);

    // Results on React sites often arrive after document_idle, and React can
    // replace text nodes on re-render (which empties our ranges). Re-scan once
    // things go quiet. Observing is read-only, so it cannot upset the page.
    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => run(searchTerm), RESCAN_DELAY_MS);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
}

// Bridge between webpage and extension.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const message = event.data;
  if (!message || !message.fromPage) return;

  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) return;
    window.postMessage({ fromExtension: true, type: message.type, response }, '*');
  });
});
