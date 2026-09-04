(() => {
  const TITLE_SELECTOR = ".detailLabel";
  const DESCRIPTION_PATTERN = /^(?:Project|Service)\s+Ticket\s+#\d+\s*-\s*(.+)$/i;
  const SETTINGS_DEFAULTS = { tabRenameEnabled: true };
  const UPDATE_DELAY_MS = 50;

  let enabled = true;
  let descriptionOnly = false;
  let pendingUpdate = null;

  function readTicketTitle() {
    const label = document.querySelector(TITLE_SELECTOR);
    return (label?.innerText || label?.textContent || "").trim();
  }

  function applyTicketTitle() {
    pendingUpdate = null;
    if (!enabled) return;

    const fullTitle = readTicketTitle();
    const match = descriptionOnly ? fullTitle.match(DESCRIPTION_PATTERN) : null;
    const description = match?.[1]?.trim();
    const ticketTitle = description || fullTitle;
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

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "APPLY_TAB_RENAME_MODE") return;
    enabled = message.enabled !== false;
    descriptionOnly = message.descriptionOnly === true;
    if (enabled) scheduleTitleUpdate();
  });

  async function initialize() {
    const settings = await chrome.storage.sync.get(SETTINGS_DEFAULTS);
    let mode = null;
    try {
      mode = await chrome.runtime.sendMessage({ type: "GET_TAB_RENAME_MODE" });
    } catch (error) {
      console.warn("Franks ConnectWise could not read this tab group's title mode:", error);
    }
    enabled = settings.tabRenameEnabled !== false && mode?.enabled !== false;
    descriptionOnly = mode?.descriptionOnly === true;

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
