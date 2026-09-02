const DEFAULTS = {
  groupTitle: "Today's Tickets",
  groupColor: "purple",
  collapseGroup: false,
  keepCalendarActive: true,
  tabRenameEnabled: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set(current);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_TODAYS_TICKETS") {
    openTodaysTickets()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  }
});

async function openTodaysTickets() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error("No active tab was found.");
  }

  if (!tab.url?.startsWith("https://na.myconnectwise.net/")) {
    throw new Error("Open your ConnectWise calendar first, then run Franks ConnectWise.");
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: collectTicketUrlsFromCalendar
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Could not collect ticket URLs.");
  }

  const urls = [...new Set(result.urls || [])];

  if (!urls.length) {
    throw new Error("No brown/pink calendar tickets were found.");
  }

  const settings = await chrome.storage.sync.get(DEFAULTS);
  const createdTabIds = [];

  for (const url of urls) {
    const created = await chrome.tabs.create({
      url,
      active: !settings.keepCalendarActive
    });
    if (created?.id) createdTabIds.push(created.id);
  }

  if (!createdTabIds.length) {
    throw new Error("Ticket URLs were found, but Edge did not create any tabs.");
  }

  const groupId = await chrome.tabs.group({ tabIds: createdTabIds });

  await chrome.tabGroups.update(groupId, {
    title: settings.groupTitle || DEFAULTS.groupTitle,
    color: normalizeColor(settings.groupColor),
    collapsed: Boolean(settings.collapseGroup)
  });

  await chrome.tabs.update(
    settings.keepCalendarActive ? tab.id : createdTabIds[0],
    { active: true }
  );

  return {
    ok: true,
    found: result.found,
    opened: createdTabIds.length,
    urls,
    groupId
  };
}

function normalizeColor(color) {
  const allowed = new Set([
    "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"
  ]);
  return allowed.has(color) ? color : "purple";
}

// This executes in ConnectWise's MAIN world so its window.open calls can be captured.
async function collectTicketUrlsFromCalendar() {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    const targets = [...document.querySelectorAll(
      ".appointment.meeting, .appointment.project"
    )].sort((a, b) => {
      const atop = parseFloat(a.style.top) || a.getBoundingClientRect().top || 0;
      const btop = parseFloat(b.style.top) || b.getBoundingClientRect().top || 0;

      if (atop !== btop) return atop - btop;

      const aleft = parseFloat(a.style.left) || a.getBoundingClientRect().left || 0;
      const bleft = parseFloat(b.style.left) || b.getBoundingClientRect().left || 0;
      return aleft - bleft;
    });

    if (!targets.length) {
      return {
        ok: false,
        error: "No .appointment.meeting or .appointment.project elements were found."
      };
    }

    const realOpen = window.open;
    const captured = [];

    window.open = function(url) {
      if (typeof url === "string" && url) captured.push(url);

      return {
        closed: false,
        focus() {},
        blur() {},
        close() {},
        location: {}
      };
    };

    try {
      for (const target of targets) {
        const bounds = target.getBoundingClientRect();

        target.dispatchEvent(new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 2,
          buttons: 2,
          clientX: bounds.left + Math.min(10, Math.max(2, bounds.width / 2)),
          clientY: bounds.top + Math.min(10, Math.max(2, bounds.height / 2))
        }));

        await sleep(120);

        const menuItem = document.getElementById("OpenInNewTab");

        if (menuItem) {
          for (const type of ["mouseover", "mousedown", "mouseup", "click"]) {
            menuItem.dispatchEvent(new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window,
              button: 0,
              buttons: type === "mousedown" ? 1 : 0
            }));
          }
        }

        await sleep(180);
      }
    } finally {
      window.open = realOpen;
    }

    return { ok: true, found: targets.length, urls: captured };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}
