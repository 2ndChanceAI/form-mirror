const LABELS = {
  first_name: "First name",
  middle_name: "Middle name",
  last_name: "Last name",
  preferred_name: "Preferred name",
  suffix: "Suffix",
  dob: "Date of birth",
  ssn: "Social Security number",
  phone_primary: "Primary phone",
  phone_alt: "Alternate phone",
  email: "Email",
  address_line1: "Street address",
  address_line2: "Address line 2",
  city: "City",
  state: "State",
  zip: "ZIP code",
  county: "County",
  gender: "Gender",
  pronouns: "Pronouns",
  race: "Race",
  ethnicity: "Ethnicity",
  primary_language: "Primary language",
  marital_status: "Marital status",
  client_id: "Client ID",
  entry_date: "Program entry date",
  exit_date: "Program exit date",
  veteran_status: "Veteran status",
  disabling_condition: "Disabling condition",
  household_size: "Household size",
  living_situation: "Living situation",
  income_monthly: "Monthly income",
  emergency_contact_name: "Emergency contact name",
  emergency_contact_phone: "Emergency contact phone",
  case_manager: "Case manager"
};

const els = {
  status: document.getElementById("status"),
  slotA: document.getElementById("slot-a"),
  slotB: document.getElementById("slot-b"),
  add: document.getElementById("add"),
  list: document.getElementById("shared-list"),
  head: document.getElementById("shared-head"),
  sensitive: document.getElementById("sensitive"),
  end: document.getElementById("end")
};

function paintSlot(slot, tab) {
  const name = slot.querySelector(".slot-name");
  const count = slot.querySelector(".slot-count");
  if (!tab) {
    slot.classList.remove("filled");
    name.textContent = "Empty";
    count.textContent = "";
    return;
  }
  slot.classList.add("filled");
  name.textContent = tab.title || "Untitled tab";
  count.textContent = `${tab.keyCount} fields`;
}

function render(state) {
  const [a, b] = state.tabs;
  paintSlot(els.slotA, a);
  paintSlot(els.slotB, b);

  const paired = state.tabs.length === 2;
  els.add.disabled = paired;
  els.add.textContent = paired ? "Both slots filled" : "Add this tab";

  els.status.textContent = paired
    ? "Mirroring"
    : state.tabs.length === 1
    ? "Waiting for second tab"
    : "No session";
  els.status.classList.toggle("live", paired);

  els.sensitive.checked = state.allowSensitive;

  els.list.innerHTML = "";
  if (!paired) {
    els.head.textContent = "Fields that will mirror";
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Pair two tabs to see matched fields.";
    els.list.appendChild(li);
    return;
  }

  const shared = state.shared;
  els.head.textContent = `Fields that will mirror (${shared.length})`;

  if (!shared.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No matching fields found on both tabs yet.";
    els.list.appendChild(li);
    return;
  }

  for (const key of shared) {
    const li = document.createElement("li");
    li.textContent = LABELS[key] || key;
    if (key === "ssn") {
      li.className = "sensitive";
      if (!state.allowSensitive) li.textContent += " (held back)";
    }
    els.list.appendChild(li);
  }
}

async function refresh() {
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  if (state) render(state);
}

els.add.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "ENROLL_ACTIVE_TAB" });
  setTimeout(refresh, 300);
});

els.end.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "END_SESSION" });
  refresh();
});

els.sensitive.addEventListener("change", async () => {
  await chrome.runtime.sendMessage({
    type: "SET_ALLOW_SENSITIVE",
    value: els.sensitive.checked
  });
  refresh();
});

refresh();
setInterval(refresh, 1500);
