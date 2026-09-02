(() => {
  const TITLE_SELECTOR = ".detailLabel";
  const SETTINGS_DEFAULTS = { tabRenameEnabled: true };
  const UPDATE_DELAY_MS = 50;

  let enabled = true;
  let pendingUpdate = null;

  function readTicketTitle() {
    const label = document.querySelector(TITLE_SELECTOR);
    return (label?.innerText || label?.textContent || "").trim();
  }

  function applyTicketTitle() {
    pendingUpdate = null;
    if (!enabled) return;

    const ticketTitle = readTicketTitle();
    if (ticketTitle && document.title !== ticketTitle) {
      document.title = ticketTitle;
    }
  }

  function scheduleTitleUpdate() {
    if (!enabled || pendingUpdate !== null) return;
    pendingUpdate = setTimeout(applyTicketTitle, UPDATE_DELAY_MS);
  }

  const observer = new MutationObserver(scheduleTitleUpdate);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.tabRenameEnabled) return;

    enabled = changes.tabRenameEnabled.newValue !== false;
    if (enabled) scheduleTitleUpdate();
  });

  async function initialize() {
    const settings = await chrome.storage.sync.get(SETTINGS_DEFAULTS);
    enabled = settings.tabRenameEnabled !== false;

    observer.observe(document.documentElement, {
      childList: true,
      characterData: true,
      subtree: true
    });

    scheduleTitleUpdate();
  }

  initialize().catch((error) => {
    console.error("Franks ConnectWise TabRename failed to initialize:", error);
  });
})();
