/*
 * Normalizer: turns a DOM input element into a canonical field key.
 *
 * Strategy is label-text first, because Apricot rotates element IDs between
 * page loads and Clarity rotates IDs but keeps `name` stable. Reading the
 * visible label works on both, and it is also what a human would do.
 */

(function () {
  const { SYNONYM_INDEX, SENSITIVE_KEYS } = self.FormMirrorSchema;

  const IGNORED_TYPES = new Set([
    "hidden",
    "submit",
    "button",
    "reset",
    "image",
    "file",
    "password"
  ]);

  function clean(text) {
    if (!text) return "";
    return text
      .replace(/[\u00a0\s]+/g, " ")
      .replace(/[*:?]+/g, " ")
      .replace(/\(.*?\)/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  // Walk outward looking for text that describes this input.
  function candidateTexts(el) {
    const out = [];

    // 1. aria-label
    if (el.getAttribute("aria-label")) out.push(el.getAttribute("aria-label"));

    // 2. aria-labelledby
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      for (const id of labelledBy.split(/\s+/)) {
        const node = document.getElementById(id);
        if (node) out.push(node.textContent);
      }
    }

    // 3. <label for="...">
    if (el.id) {
      const escaped = (window.CSS && CSS.escape) ? CSS.escape(el.id) : el.id;
      const forLabel = document.querySelector(`label[for="${escaped}"]`);
      if (forLabel) out.push(forLabel.textContent);
    }

    // 4. wrapping <label>
    const wrapping = el.closest("label");
    if (wrapping) out.push(wrapping.textContent);

    // 5. table layouts: the cell to the left
    const cell = el.closest("td");
    if (cell && cell.previousElementSibling) {
      out.push(cell.previousElementSibling.textContent);
    }

    // 6. a labelish sibling in the same wrapper
    const wrapper = el.closest("div, li, fieldset, section");
    if (wrapper) {
      const labelish = wrapper.querySelector("label, .field-label, .form-label, legend");
      if (labelish && !labelish.contains(el)) out.push(labelish.textContent);
    }

    // 7. attributes, lowest confidence
    if (el.getAttribute("placeholder")) out.push(el.getAttribute("placeholder"));
    if (el.name) out.push(el.name.replace(/[_\-.\[\]]+/g, " "));

    return out;
  }

  function matchKey(text) {
    const normalized = clean(text);
    if (!normalized || normalized.length > 60) return null;

    // Exact hit.
    if (SYNONYM_INDEX.has(normalized)) return SYNONYM_INDEX.get(normalized);

    // Contained hit, longest synonym wins so "emergency contact phone"
    // beats "phone".
    let best = null;
    let bestLength = 0;
    for (const [synonym, key] of SYNONYM_INDEX) {
      if (synonym.length <= bestLength) continue;
      if (normalized === synonym || normalized.includes(synonym)) {
        best = key;
        bestLength = synonym.length;
      }
    }
    return best;
  }

  function isMirrorable(el) {
    if (!el || el.disabled || el.readOnly) return false;
    const tag = el.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag !== "INPUT") return false;
    return !IGNORED_TYPES.has((el.type || "text").toLowerCase());
  }

  function identify(el) {
    if (!isMirrorable(el)) return null;
    for (const text of candidateTexts(el)) {
      const key = matchKey(text);
      if (key) {
        return { key, sensitive: SENSITIVE_KEYS.has(key) };
      }
    }
    return null;
  }

  self.FormMirrorNormalizer = { identify, isMirrorable, clean, matchKey };
})();
