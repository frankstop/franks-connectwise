const openButton = document.getElementById("openTickets");
const status = document.getElementById("status");
const optionsButton = document.getElementById("options");

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
