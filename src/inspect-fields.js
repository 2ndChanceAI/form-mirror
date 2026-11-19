/* Paste into the browser console while the form is open and logged in.
   Prints a table of every field and the text around it.
   Reads only. Changes nothing, sends nothing. */

(() => {
  const rows = [];
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    const type = (el.type || el.tagName).toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;

    const labelFor = el.id
      ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
      : null;
    const wrap = el.closest("label");
    const box = el.closest("div, li, td, fieldset");
    const near = box ? box.innerText.replace(/\s+/g, " ").trim().slice(0, 60) : "";

    rows.push({
      type,
      name: el.name || "",
      id: el.id || "",
      ariaLabel: el.getAttribute("aria-label") || "",
      placeholder: el.getAttribute("placeholder") || "",
      label: (labelFor?.textContent || wrap?.textContent || "").replace(/\s+/g, " ").trim(),
      nearbyText: near
    });
  });

  console.table(rows);
  console.log(`${rows.length} fields found`);
  copy(JSON.stringify(rows, null, 2));
  console.log("Copied to clipboard.");
})();
