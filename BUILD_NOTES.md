# Form Mirroring Extension — Build Notes

## Goal

A browser extension that reads the form fields on two open tabs, works out which fields are asking for the same piece of data, and mirrors input between them. Type a date of birth once and it lands in both forms.

Client data stays on the machine. Nothing written to disk, nothing sent anywhere, session state dies when the tabs close.

## Systems to bridge

- HMIS, running on Clarity
- Apricot

## Architecture

**1. Content script** — injected into all tabs and all frames. Walks the DOM and inventories every input, capturing:

- visible label text
- `name` attribute
- `placeholder`
- `aria-label`
- input type

**2. Normalizer** — maps messy real-world labels onto a canonical schema, so "DOB", "Birth Date", and "Date of Birth" all collapse to a single key. Start with a rules and synonyms table rather than a model. It's faster, and more importantly it's auditable, which matters when the data is client PII.

**3. Background service worker** — holds the shared session state in memory and broadcasts changes between tabs.

## Flow

1. User types in tab A.
2. Content script fires on the `input` event, tags the field with its canonical key.
3. Sends the key and value to the service worker.
4. Worker tells tab B to set the matching field.
5. Tab B dispatches synthetic events so the page's own validation logic actually runs.

## Platform constraints

**Apricot** — renders forms dynamically and element IDs shift between page loads, so you can't anchor to IDs. Anchor to visible label text instead.

**Clarity** — Angular-based. Fields carry stable `name` attributes even when IDs rotate, so anchor on `name`. Clarity fires assessment logic on field change, so dispatch both `input` and `change` events when writing, or the page won't register the value.

**Iframes** — many HMIS deployments run inside iframes. The extension needs `all_frames` permission, and each frame gets its own content script instance.

## Open items

- Field matching rules and the synonym table
- Extension scaffolding and manifest
- Decide how to handle a field that exists on one form but not the other
- Decide behavior on conflict, meaning both fields already populated with different values
