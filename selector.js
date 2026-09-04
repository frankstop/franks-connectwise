(() => {
  const STATE_KEY = "__franksConnectWiseRegionSelector";

  if (window[STATE_KEY]?.cancel) {
    window[STATE_KEY].cancel();
    return;
  }

  let startX = 0;
  let startY = 0;
  let dragging = false;
  let selectionBox = null;

  const overlay = document.createElement("div");
  overlay.id = "__franks-connectwise-region-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    cursor: "crosshair",
    background: "rgba(255, 255, 255, 0.18)",
    userSelect: "none",
    WebkitUserSelect: "none"
  });

  const hint = document.createElement("div");
  hint.textContent = "Drag over links • Esc to cancel";
  Object.assign(hint.style, {
    position: "fixed",
    top: "18px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "9px 14px",
    border: "1px solid rgba(79, 70, 229, .24)",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.96)",
    color: "#312e81",
    font: "600 13px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    boxShadow: "0 8px 24px rgba(49, 46, 129, .18)",
    pointerEvents: "none"
  });

  overlay.appendChild(hint);
  document.documentElement.appendChild(overlay);

  function cleanup() {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDown, true);
    delete window[STATE_KEY];
  }

  function cancel() {
    cleanup();
  }

  window[STATE_KEY] = { cancel };

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  }

  document.addEventListener("keydown", onKeyDown, true);

  function rectsIntersect(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function normalizeSelectionRect(x1, y1, x2, y2) {
    return {
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      right: Math.max(x1, x2),
      bottom: Math.max(y1, y2)
    };
  }

  function collectLinks(selection) {
    const urls = [];

    for (const anchor of document.querySelectorAll("a[href]")) {
      if (!anchor.href) continue;

      let parsed;
      try {
        parsed = new URL(anchor.href, location.href);
      } catch {
        continue;
      }

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;

      for (const rect of anchor.getClientRects()) {
        if (rect.width > 0 && rect.height > 0 && rectsIntersect(selection, rect)) {
          urls.push(parsed.href);
          break;
        }
      }
    }

    return urls;
  }

  overlay.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    selectionBox = document.createElement("div");
    Object.assign(selectionBox.style, {
      position: "fixed",
      left: `${startX}px`,
      top: `${startY}px`,
      width: "0",
      height: "0",
      border: "2px solid #4f46e5",
      borderRadius: "6px",
      background: "rgba(99, 102, 241, 0.16)",
      boxSizing: "border-box",
      boxShadow: "0 0 0 1px rgba(255, 255, 255, .7) inset",
      pointerEvents: "none"
    });
    overlay.appendChild(selectionBox);
  });

  overlay.addEventListener("mousemove", (event) => {
    if (!dragging || !selectionBox) return;

    const selection = normalizeSelectionRect(startX, startY, event.clientX, event.clientY);
    selectionBox.style.left = `${selection.left}px`;
    selectionBox.style.top = `${selection.top}px`;
    selectionBox.style.width = `${selection.right - selection.left}px`;
    selectionBox.style.height = `${selection.bottom - selection.top}px`;
  });

  overlay.addEventListener("mouseup", async (event) => {
    if (!dragging || event.button !== 0) return;

    event.preventDefault();
    dragging = false;
    const selection = normalizeSelectionRect(startX, startY, event.clientX, event.clientY);
    const width = selection.right - selection.left;
    const height = selection.bottom - selection.top;

    if (width < 4 || height < 4) {
      cleanup();
      return;
    }

    const urls = collectLinks(selection);
    cleanup();
    if (!urls.length) return;

    try {
      await chrome.runtime.sendMessage({ type: "OPEN_REGION_LINKS", urls });
    } catch (error) {
      console.error("Franks ConnectWise region link opener failed:", error);
    }
  });
})();
