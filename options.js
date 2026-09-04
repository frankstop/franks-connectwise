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

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

async function load() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  document.getElementById("groupTitle").value = settings.groupTitle;
  document.getElementById("groupColor").value = settings.groupColor;
  document.getElementById("collapseGroup").checked = settings.collapseGroup;
  document.getElementById("keepCalendarActive").checked = settings.keepCalendarActive;
  document.getElementById("ticketLauncherEnabled").checked = settings.ticketLauncherEnabled;
  document.getElementById("tabRenameEnabled").checked = settings.tabRenameEnabled;
  document.getElementById("regionLinkOpenerEnabled").checked = settings.regionLinkOpenerEnabled;
  document.getElementById("regionRemoveDuplicates").checked = settings.regionRemoveDuplicates;
  document.getElementById("regionOpenInBackground").checked = settings.regionOpenInBackground;
  document.getElementById("regionGroupTabs").checked = settings.regionGroupTabs;
  document.getElementById("regionGroupTitle").value = settings.regionGroupTitle;
  document.getElementById("regionGroupColor").value = settings.regionGroupColor;
  document.getElementById("regionCollapseGroup").checked = settings.regionCollapseGroup;
  document.getElementById("theme").value = settings.theme;
  applyTheme(settings.theme);
}

document.getElementById("theme").addEventListener("change", (event) => {
  applyTheme(event.target.value);
});

document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    groupTitle: document.getElementById("groupTitle").value.trim() || DEFAULTS.groupTitle,
    groupColor: document.getElementById("groupColor").value,
    collapseGroup: document.getElementById("collapseGroup").checked,
    keepCalendarActive: document.getElementById("keepCalendarActive").checked,
    ticketLauncherEnabled: document.getElementById("ticketLauncherEnabled").checked,
    tabRenameEnabled: document.getElementById("tabRenameEnabled").checked,
    regionLinkOpenerEnabled: document.getElementById("regionLinkOpenerEnabled").checked,
    regionRemoveDuplicates: document.getElementById("regionRemoveDuplicates").checked,
    regionOpenInBackground: document.getElementById("regionOpenInBackground").checked,
    regionGroupTabs: document.getElementById("regionGroupTabs").checked,
    regionGroupTitle: document.getElementById("regionGroupTitle").value.trim() || DEFAULTS.regionGroupTitle,
    regionGroupColor: document.getElementById("regionGroupColor").value,
    regionCollapseGroup: document.getElementById("regionCollapseGroup").checked,
    theme: document.getElementById("theme").value
  });

  const saved = document.getElementById("saved");
  saved.textContent = "Saved.";
  setTimeout(() => { saved.textContent = ""; }, 1500);
});

load().catch((error) => {
  document.getElementById("saved").textContent = `Could not load settings: ${error.message}`;
});
