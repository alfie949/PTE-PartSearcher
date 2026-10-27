BOM Clean Search v1.5
=====================

PURPOSE
Finding the parts the parts-finder API cannot: broker and independent stock,
obsolete/EOL lines, allocation parts, and partial MPN searches an API rejects.

ON by default (8 tabs per search):
  Aggregators : Findchips, OEMsecrets, Octopart, OEMsTrade
  Authorised  : RS, Arrow, TTI, Anglia   (no API key held for these)

OFF by default:
  TrustedParts, TME          - flip on as needed
  Rochester                  - obsolete / EOL / last-time-buy
  Farnell, Digi-Key, Mouser  - your API covers these; leaving them off
                               avoids duplication and rate limits

Use the "Reset" link beside All/None to adopt this list if upgrading.

>> VERIFY TTI AND ANGLIA BEFORE YOU TRUST THEM <<
RS and Arrow use their long-standing, confirmed search patterns.
TTI and Anglia were NOT fully confirmed - the search page path is right, but
the free-text query parameter is inferred:
  TTI    https://www.ttieurope.com/content/ttieurope/en/apps/part-search.html?q=
  Anglia https://www.anglia-live.com/Search/tiers.aspx?q=

If either lands on a blank or error page, fix it in 10 seconds:
  1. Search any part number on that site manually
  2. Copy the resulting URL from the address bar
  3. Delete your part number off the end
  4. Bin the old entry in the popup, paste the corrected URL in

Do the same for any distributor that changes its search path later.

EIGHT TABS IS A LOT
That is 8 tabs per BOM line and roughly 4 seconds before the last one opens
(600ms stagger, set by TAB_STAGGER_MS in sites.js). Consider running the four
aggregators as your default sweep and switching the named distributors on only
when a line actually turns awkward.

NEW IN v1.5 - DIGI-KEY IMAGES
Digi-Key product images were failing to load while the extension was on.
Cause: the highlighter wrapped each match in a <mark> by cutting up the page's
text. Digi-Key's site is built with React, which keeps hold of its own text
and expects to find it where it left it. When React next updated the page
(e.g. swapping a placeholder for the product image) it could not find that
text, threw an error and stopped - so the images never appeared.

The highlighter now uses the browser's CSS Custom Highlight API. It tells
Chrome which bits of text to colour and changes nothing in the page itself, so
React sites are left exactly as they built themselves. It also re-checks the
page when results load in late, so matches on React sites still get coloured.

Also fixed: switching suppliers on/off could occasionally leave the
highlighter registered on no sites at all, and a supplier added by IP address
stopped the highlighter working everywhere.

CARRIED OVER FROM v1.2
- Tabs open one at a time rather than all at once
- Highlighter only injects on your enabled supplier domains, not <all_urls>
- Highlighter bails out on bot-check / challenge pages

UPGRADING FROM v1.4
Replace the folder contents, then hit the reload arrow on the extension card in
chrome://extensions. Your supplier list and toggles are kept.

INSTALLING (unpacked)
1. Unzip somewhere permanent
2. chrome://extensions -> Developer mode ON
3. "Load unpacked", select the folder, pin it
