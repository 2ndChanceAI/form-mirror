/*
 * Service worker. Holds the session in memory only.
 *
 * Nothing here writes to chrome.storage, IndexedDB, or disk. When the worker
 * is torn down the values go with it. That is the point: the client data
 * never lands anywhere it could be recovered from.
 */

const session = {
  tabs: [], // [{ id, title, url, keys: [] }]
  values: new Map(), // canonical key -> last value seen
  allowSensitive: false
};

function tabRecord(tabId) {
  return session.tabs.find((t) => t.id === tabId);
}

async function enroll(tab) {
  if (tabRecord(tab.id)) return;
  if (session.tabs.length >= 2) return;

  session.tabs.push({ id: tab.id, title: tab.title, url: tab.url, keys: [] });
  await send(tab.id, { type: "ENROLL" });
}

async function unenroll(tabId) {
  const index = session.tabs.findIndex((t) => t.id === tabId);
  if (index === -1) return;
  session.tabs.splice(index, 1);
  await send(tabId, { type: "UNENROLL" });
  if (session.tabs.length === 0) session.values.clear();
}

function endSession() {
  const ids = session.tabs.map((t) => t.id);
  session.tabs = [];
  session.values.clear();
  session.allowSensitive = false;
  for (const id of ids) send(id, { type: "UNENROLL" });
}

function send(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message).catch(() => {});
}

function broadcast(fromTabId, message) {
  for (const t of session.tabs) {
    if (t.id === fromTabId) continue;
    send(t.id, message);
  }
}

// Which keys exist on both tabs, meaning they will actually mirror.
function sharedKeys() {
  if (session.tabs.length < 2) return [];
  const [a, b] = session.tabs;
  const setB = new Set(b.keys);
  return a.keys.filter((k) => setB.has(k));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab && sender.tab.id;

  switch (msg.type) {
    case "WHO_AM_I":
      sendResponse({ enrolled: Boolean(tabId && tabRecord(tabId)) });
      return true;

    case "FIELDS_FOUND": {
      const record = tabRecord(tabId);
      if (record) {
        // Merge, because each frame reports separately.
        record.keys = [...new Set([...record.keys, ...msg.keys])];
      }
      sendResponse({ ok: true });
      return true;
    }

    case "VALUE_CHANGED": {
      if (!tabRecord(tabId)) return;
      const isSensitive = msg.key === "ssn";
      if (isSensitive && !session.allowSensitive) return;
      session.values.set(msg.key, msg.value);
      broadcast(tabId, { type: "SET_FIELD", key: msg.key, value: msg.value });
      return;
    }

    case "GET_STATE":
      sendResponse({
        tabs: session.tabs.map((t) => ({
          id: t.id,
          title: t.title,
          keyCount: t.keys.length
        })),
        shared: sharedKeys(),
        allowSensitive: session.allowSensitive
      });
      return true;

    case "SET_ALLOW_SENSITIVE":
      session.allowSensitive = Boolean(msg.value);
      sendResponse({ ok: true });
      return true;

    case "END_SESSION":
      endSession();
      sendResponse({ ok: true });
      return true;
  }
});

// Popup asks us to add the current tab.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "ENROLL_ACTIVE_TAB") return;
  chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
    if (tab) await enroll(tab);
    sendResponse({ ok: true });
  });
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => unenroll(tabId));
