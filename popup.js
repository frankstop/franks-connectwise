const openButton = document.getElementById("openTickets");
const status = document.getElementById("status");
const optionsButton = document.getElementById("options");
const descriptionOnly = document.getElementById("descriptionOnly");
const groupModeHelp = document.getElementById("groupModeHelp");

async function loadPopup() {
  const settings = await chrome.storage.sync.get({
    theme: "system",
    ticketLauncherEnabled: true,
    tabRenameEnabled: true
  });
  document.documentElement.dataset.theme = settings.theme;
  if (!settings.ticketLauncherEnabled) {
    openButton.disabled = true;
    status.textContent = "The calendar ticket opener is disabled in Settings.";
  }

  const mode = await chrome.runtime.sendMessage({ type: "GET_CURRENT_GROUP_TITLE_MODE" });
  if (!mode?.ok) throw new Error(mode?.error || "Could not read the current tab group.");

  if (!mode.grouped) {
    descriptionOnly.disabled = true;
    groupModeHelp.textContent = "Open the extension from a tab in a group to change its ticket title format.";
    return;
  }

  descriptionOnly.checked = mode.descriptionOnly === true;
  if (settings.tabRenameEnabled === false || mode.enabled === false) {
    descriptionOnly.disabled = true;
    groupModeHelp.textContent = "Automatic ticket tab renaming is disabled in Settings.";
    return;
  }

  groupModeHelp.textContent = "This setting affects only ConnectWise ticket tabs in this group.";
}

openButton.addEventListener("click", async () => {
  openButton.disabled = true;
  status.className = "status";
  status.textContent = "Reading today's calendar and collecting ticket links…";

  try {
    const result = await chrome.runtime.sendMessage({ type: "OPEN_TODAYS_TICKETS" });

    if (!result?.ok) throw new Error(result?.error || "Unknown error.");

    status.className = "status success";
    status.textContent = `Done. Opened ${result.opened} ticket${result.opened === 1 ? "" : "s"} in one tab group.`;
  } catch (error) {
    status.className = "status error";
    status.textContent = error?.message || String(error);
  } finally {
    openButton.disabled = false;
  }
});

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

descriptionOnly.addEventListener("change", async () => {
  descriptionOnly.disabled = true;
  groupModeHelp.textContent = "Updating ticket titles in this group…";

  try {
    const result = await chrome.runtime.sendMessage({
      type: "SET_CURRENT_GROUP_TITLE_MODE",
      descriptionOnly: descriptionOnly.checked
    });
    if (!result?.ok) throw new Error(result?.error || "Could not update the tab group.");
    groupModeHelp.textContent = `Updated ${result.updated} ConnectWise ticket tab${result.updated === 1 ? "" : "s"} in this group.`;
  } catch (error) {
    descriptionOnly.checked = !descriptionOnly.checked;
    groupModeHelp.textContent = error?.message || String(error);
  } finally {
    descriptionOnly.disabled = false;
  }
});

loadPopup().catch((error) => {
  descriptionOnly.disabled = true;
  groupModeHelp.textContent = error?.message || String(error);
});
