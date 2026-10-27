BOM Clean Search v1.4
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

CARRIED OVER FROM v1.2
- Tabs open one at a time rather than all at once
- Highlighter only injects on your enabled supplier domains, not <all_urls>
- Highlighter bails out on bot-check / challenge pages

INSTALLING (unpacked)
1. Unzip somewhere permanent
2. chrome://extensions -> Developer mode ON
3. "Load unpacked", select the folder, pin it
