// Highlights the stored search term on a supplier's results page.
//
// As of v1.2 this only runs on supplier domains (registered dynamically by
// background.js), not on every page in the browser.

// Bail out on bot-check / challenge interstitials. Rewriting the DOM while a
// challenge script is measuring the page can stop it completing, which turns a
// transient check into a persistent block.
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

function highlightTerm(term) {
  if (!term || !document.body) return;
  if (isChallengePage()) return;

  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedTerm, 'gi');
  let matchCount = 0;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const tag = node.parentNode && node.parentNode.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'MARK') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const targets = [];
  while (walker.nextNode()) targets.push(walker.currentNode);

  targets.forEach(node => {
    const text = node.nodeValue;
    regex.lastIndex = 0;
    if (!regex.test(text)) return;
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      matchCount++;
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const mark = document.createElement('mark');
      mark.textContent = match[0];
      fragment.appendChild(mark);
      lastIndex = match.index + match[0].length;
      if (match[0].length === 0) regex.lastIndex++;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode.replaceChild(fragment, node);
  });

  if (matchCount > 0) {
    const originalTitle = document.title.replace(/^\(\d+\)\s/, '');
    document.title = `(${matchCount}) ${originalTitle}`;
  }
}

if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.get('searchTerm', ({ searchTerm }) => {
    if (searchTerm) highlightTerm(searchTerm);
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
