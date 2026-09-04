const DEFAULTS = {
  groupTitle: "Today's Tickets",
  groupColor: "purple",
  collapseGroup: false,
  keepCalendarActive: true,
  ticketLauncherEnabled: true,
  tabRenameEnabled: true,
  regionLinkOpenerEnabled: true,
  regionRemoveDuplicates: true,
  regionOpenInBackground: true,
  regionGroupTabs: true,
  regionGroupTitle: "Region Links",
  regionGroupColor: "blue",
  regionCollapseGroup: false,
  theme: "system"
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

  if (message?.type === "OPEN_REGION_LINKS") {
    openRegionLinks(message.urls, sender.tab)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "select-links-in-region") return;

  const settings = await chrome.storage.sync.get(DEFAULTS);
  if (!settings.regionLinkOpenerEnabled) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["selector.js"]
    });
  } catch (error) {
    console.error("Franks ConnectWise region selector could not run on this page:", error);
  }
});

async function openTodaysTickets() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  if (!settings.ticketLauncherEnabled) {
    throw new Error("The calendar ticket opener is disabled in Settings.");
  }

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

async function openRegionLinks(requestedUrls, sourceTab) {
  if (!sourceTab?.id || sourceTab.windowId == null) {
    throw new Error("Could not determine the source tab.");
  }

  const settings = await chrome.storage.sync.get(DEFAULTS);
  if (!settings.regionLinkOpenerEnabled) {
    throw new Error("The region link opener is disabled in Settings.");
  }

  const validUrls = (requestedUrls || [])
    .filter((url) => typeof url === "string")
    .filter((url) => /^https?:\/\//i.test(url));
  const urls = settings.regionRemoveDuplicates ? [...new Set(validUrls)] : validUrls;

  if (!urls.length) return { ok: true, opened: 0 };

  const createdTabIds = [];
  const startIndex = typeof sourceTab.index === "number" ? sourceTab.index + 1 : undefined;

  for (let index = 0; index < urls.length; index++) {
    try {
      const created = await chrome.tabs.create({
        url: urls[index],
        active: !settings.regionOpenInBackground,
        windowId: sourceTab.windowId,
        ...(startIndex == null ? {} : { index: startIndex + index })
      });
      if (created?.id != null) createdTabIds.push(created.id);
    } catch (error) {
      console.warn("Could not open region URL:", urls[index], error);
    }
  }

  if (!createdTabIds.length) throw new Error("No selected links could be opened.");

  let groupId = null;
  if (settings.regionGroupTabs) {
    groupId = await chrome.tabs.group({ tabIds: createdTabIds });
    const title = (settings.regionGroupTitle || DEFAULTS.regionGroupTitle).trim();
    await chrome.tabGroups.update(groupId, {
      title: `${title} (${createdTabIds.length})`,
      color: normalizeColor(settings.regionGroupColor),
      collapsed: Boolean(settings.regionCollapseGroup)
    });
  }

  if (settings.regionOpenInBackground) {
    await chrome.tabs.update(sourceTab.id, { active: true });
  }

  return { ok: true, opened: createdTabIds.length, groupId };
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
