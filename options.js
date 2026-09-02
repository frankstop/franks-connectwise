const DEFAULTS = {
  groupTitle: "Today's Tickets",
  groupColor: "purple",
  collapseGroup: false,
  keepCalendarActive: true,
  tabRenameEnabled: true
};

async function load() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  document.getElementById("groupTitle").value = settings.groupTitle;
  document.getElementById("groupColor").value = settings.groupColor;
  document.getElementById("collapseGroup").checked = settings.collapseGroup;
  document.getElementById("keepCalendarActive").checked = settings.keepCalendarActive;
  document.getElementById("tabRenameEnabled").checked = settings.tabRenameEnabled;
}

document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    groupTitle: document.getElementById("groupTitle").value.trim() || DEFAULTS.groupTitle,
    groupColor: document.getElementById("groupColor").value,
    collapseGroup: document.getElementById("collapseGroup").checked,
    keepCalendarActive: document.getElementById("keepCalendarActive").checked,
    tabRenameEnabled: document.getElementById("tabRenameEnabled").checked
  });

  const saved = document.getElementById("saved");
  saved.textContent = "Saved.";
  setTimeout(() => { saved.textContent = ""; }, 1500);
});

load().catch((error) => {
  document.getElementById("saved").textContent = `Could not load settings: ${error.message}`;
});
