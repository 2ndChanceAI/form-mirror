/*
 * Content script. One instance per frame.
 *
 * Responsibilities:
 *  - inventory the mirrorable fields in this frame
 *  - report the canonical keys it found to the service worker
 *  - on user input, publish {key, value}
 *  - on an incoming value, write it into the matching field the way the
 *    host framework expects
 */

(function () {
  const { identify } = self.FormMirrorNormalizer;

  // key -> Set<Element>
  const fieldIndex = new Map();
  let enrolled = false;
  let writing = false;
  let rescanTimer = null;

  // ---------- scanning ----------

  function scan() {
    fieldIndex.clear();
    const nodes = document.querySelectorAll("input, textarea, select");
    for (const el of nodes) {
      const match = identify(el);
      if (!match) continue;
      if (!fieldIndex.has(match.key)) fieldIndex.set(match.key, new Set());
      fieldIndex.get(match.key).add(el);
      el.dataset.fmKey = match.key;
    }
    report();
  }

  function report() {
    if (!enrolled) return;
    chrome.runtime.sendMessage({
      type: "FIELDS_FOUND",
      keys: [...fieldIndex.keys()],
      url: location.href
    }).catch(() => {});
  }

  function scheduleRescan() {
    clearTimeout(rescanTimer);
    rescanTimer = setTimeout(scan, 400);
  }

  // Apricot and Clarity both swap form sections in without a page load.
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.addedNodes.length || record.removedNodes.length) {
        scheduleRescan();
        return;
      }
    }
  });

  // ---------- writing ----------

  // React and Angular track the value internally. Setting .value directly
  // gets overwritten on the next render, so go through the native setter
  // and then fire the events the framework listens for.
  function setNativeValue(el, value) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }
  }

  function applyValue(key, value) {
    const targets = fieldIndex.get(key);
    if (!targets || !targets.size) return;

    writing = true;
    for (const el of targets) {
      if (!el.isConnected) continue;
      if (el.value === value) continue;

      if (el.tagName === "SELECT") {
        const wanted = String(value).trim().toLowerCase();
        const option = [...el.options].find(
          (o) =>
            o.value.trim().toLowerCase() === wanted ||
            o.textContent.trim().toLowerCase() === wanted
        );
        if (!option) continue;
        el.value = option.value;
      } else if (el.type === "checkbox" || el.type === "radio") {
        continue; // handled separately, see README open items
      } else {
        setNativeValue(el, value);
      }

      // Clarity fires assessment logic on change; most React forms want input.
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      flash(el);
    }
    writing = false;
  }

  function flash(el) {
    const previous = el.style.outline;
    el.style.outline = "2px solid #3fb6a8";
    setTimeout(() => {
      el.style.outline = previous;
    }, 600);
  }

  // ---------- listening ----------

  function onInput(event) {
    if (!enrolled || writing) return;
    const el = event.target;
    const key = el && el.dataset && el.dataset.fmKey;
    if (!key) return;

    chrome.runtime.sendMessage({
      type: "VALUE_CHANGED",
      key,
      value: el.value
    }).catch(() => {});
  }

  document.addEventListener("input", onInput, true);
  document.addEventListener("change", onInput, true);

  // ---------- messaging ----------

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "SET_FIELD") {
      applyValue(msg.key, msg.value);
    } else if (msg.type === "ENROLL") {
      enrolled = true;
      observer.observe(document.documentElement, { childList: true, subtree: true });
      scan();
    } else if (msg.type === "UNENROLL") {
      enrolled = false;
      observer.disconnect();
      fieldIndex.clear();
    } else if (msg.type === "PING") {
      sendResponse({ ok: true, keys: [...fieldIndex.keys()] });
      return true;
    }
  });

  // Ask the worker whether this tab is already part of a session
  // (covers navigation within an enrolled tab).
  chrome.runtime.sendMessage({ type: "WHO_AM_I" }).then((res) => {
    if (res && res.enrolled) {
      enrolled = true;
      observer.observe(document.documentElement, { childList: true, subtree: true });
      scan();
    }
  }).catch(() => {});
})();
