const siteListElement = document.getElementById('siteList');
const newSiteInput    = document.getElementById('newSiteInput');
const searchInput     = document.getElementById('searchInput');
const searchButton    = document.getElementById('searchButton');
const statusEl        = document.getElementById('status');
const emptyState      = document.getElementById('emptyState');

let sites = [];

function showStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (isError ? ' status-error' : '');
}

function enabledCount() {
  return sites.filter(s => s.enabled).length;
}

function refreshSearchButton() {
  const n = enabledCount();
  searchButton.textContent = n ? `🔎 Search ${n} site${n === 1 ? '' : 's'}` : '🔎 No sites selected';
  searchButton.disabled = n === 0;
}

function persist(callback) {
  setSites(sites, () => {
    refreshSearchButton();
    if (callback) callback();
  });
}

function render() {
  siteListElement.innerHTML = '';
  emptyState.hidden = sites.length > 0;

  sites.forEach((site, index) => {
    const li = document.createElement('li');
    li.className = site.enabled ? 'site on' : 'site off';

    const row = document.createElement('div');
    row.className = 'site-row';

    const label = document.createElement('label');
    label.className = 'switch';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = site.enabled;
    checkbox.addEventListener('change', () => {
      sites[index].enabled = checkbox.checked;
      li.className = checkbox.checked ? 'site on' : 'site off';
      persist();
    });

    const slider = document.createElement('span');
    slider.className = 'slider';

    label.appendChild(checkbox);
    label.appendChild(slider);

    const nameEl = document.createElement('span');
    nameEl.className = 'site-name';
    nameEl.textContent = site.name;
    nameEl.addEventListener('click', () => checkbox.click());

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '🗑️';
    removeBtn.title = `Remove ${site.name}`;
    removeBtn.addEventListener('click', () => {
      sites.splice(index, 1);
      persist(render);
    });

    row.appendChild(label);
    row.appendChild(nameEl);
    row.appendChild(removeBtn);

    const urlEl = document.createElement('div');
    urlEl.className = 'site-url';
    urlEl.textContent = site.url;
    urlEl.title = site.url;

    li.appendChild(row);
    li.appendChild(urlEl);
    siteListElement.appendChild(li);
  });

  refreshSearchButton();
}

function load() {
  getSites(loaded => {
    sites = loaded;
    render();
  });
}

document.getElementById('enableAll').addEventListener('click', () => {
  sites.forEach(s => { s.enabled = true; });
  persist(render);
});

document.getElementById('disableAll').addEventListener('click', () => {
  sites.forEach(s => { s.enabled = false; });
  persist(render);
});

document.getElementById('resetDefaults').addEventListener('click', () => {
  if (!confirm('Replace your supplier list with the built-in defaults?')) return;
  sites = DEFAULT_SITES.map(s => ({ ...s }));
  persist(() => { showStatus('Supplier list reset to defaults.'); render(); });
});

function addSite() {
  const raw = newSiteInput.value.trim();
  if (!raw) return;

  let url;
  try {
    url = new URL(raw).href;
  } catch {
    showStatus('That does not look like a valid URL.', true);
    return;
  }

  if (sites.some(s => s.url === url)) {
    showStatus('That site is already in the list.', true);
    return;
  }

  sites.push({ url, name: siteNameFromUrl(url), enabled: true });
  persist(() => {
    newSiteInput.value = '';
    showStatus('');
    render();
  });
}

document.getElementById('addSiteButton').addEventListener('click', addSite);
newSiteInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addSite(); }
});

function runSearch() {
  const term = searchInput.value.trim();
  if (!term) { showStatus('Enter an MPN first.', true); return; }
  if (!enabledCount()) { showStatus('Turn at least one supplier on.', true); return; }

  showStatus('Opening tabs…');
  chrome.runtime.sendMessage({ type: 'BOMCLEANSEARCH', term }, response => {
    if (chrome.runtime.lastError) {
      showStatus('Could not reach the extension background.', true);
      return;
    }
    if (response && response.status) showStatus(response.status);
  });
}

searchButton.addEventListener('click', runSearch);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
});
searchInput.addEventListener('click', e => e.target.select());

document.addEventListener('DOMContentLoaded', () => {
  searchInput.focus();
  searchInput.select();
});

load();
