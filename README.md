# Form Mirror

A Chrome extension that mirrors matching form fields between two open tabs. Type a date of birth into one form and it appears in the other, without the value ever leaving the browser.

Built for the case where the same intake data has to go into two systems, HMIS on Clarity and Apricot, and retyping it twice is both slow and an extra chance to get it wrong.

## Install for testing

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Choose "Load unpacked" and select this `form-mirror` folder
4. Pin the extension so the popup is reachable

## Use

1. Open the first form, click the extension, choose "Add this tab"
2. Open the second form in another tab, click the extension, "Add this tab" again
3. The popup lists every field found on both tabs. Those are the ones that will mirror
4. Type in either tab. Matched fields fill on the other side and flash briefly
5. "End session" clears everything

## How it works

**`src/schema.js`** holds the canonical field list and the synonyms that map onto it. "DOB", "Birth Date", and "Date of Birth" all resolve to `dob`. If a label does not match anything in the table, the field is left alone. A field we cannot confidently name is a field we do not touch.

**`src/normalizer.js`** turns a DOM input into a canonical key. It reads, in order of confidence: `aria-label`, `aria-labelledby`, `<label for>`, a wrapping `<label>`, the table cell to the left, a labelish sibling in the same wrapper, then `placeholder` and `name`. Label text comes first because Apricot rotates element IDs between page loads, so anchoring to IDs breaks. Longest synonym wins, so "emergency contact phone" does not get captured by "phone".

**`src/content.js`** runs once per frame, which matters because HMIS deployments are often inside iframes. It inventories fields, watches for input, and writes incoming values. Writes go through the native value setter rather than `el.value = x`, because React and Angular track value internally and would otherwise overwrite it on the next render. It then fires both `input` and `change`, since Clarity runs assessment logic on change and will not register the value without it.

**`src/background.js`** is the service worker. It holds the paired tabs and the last value for each key in memory. Nothing is written to `chrome.storage`, IndexedDB, or disk. When the session ends or the worker is torn down, the data is gone.

## Sensitive fields

Social Security number is in the schema but held back by default. It only mirrors if you tick the box in the popup, and that setting resets when the session ends. The popup shows it in the list as "held back" so it is visible that the field was recognized and deliberately skipped, rather than silently missed.

## Known limits and open items

- **Checkboxes and radios** are recognized but not yet written. Mirroring a checked state needs a different path than setting a value, and group semantics differ between the two platforms.
- **Selects** only match when the option text or value matches the source string. HMIS and Apricot use different picklist vocabularies for gender, race, and living situation, so those need a per-field value translation map, not just a field name map.
- **Multi-page forms.** The rescan fires on DOM mutation, but a value typed before the matching field exists on the other tab will not backfill. Worth adding: replay the stored session values when a new field appears.
- **Conflict handling.** Right now last write wins. Decide what should happen when both fields are already populated with different values.
- **Frame reporting.** Each frame reports its own keys and the worker merges them. A field count in the popup can therefore exceed what is visible on screen if a page has hidden frames.
- **Synonym coverage** is a first pass. The fastest way to improve it is to run the extension on a real intake form, see which fields go unmatched, and add their labels to the table.

## A note on scope

This mirrors between two tabs you already have open and are already authorized to use. It does not extract, store, or transmit anything. That framing matters if this ever goes past your own machine, since anything that persists or transmits client data changes the compliance picture entirely.
