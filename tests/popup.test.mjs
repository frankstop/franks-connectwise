import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile("popup.js", "utf8");

function createElement() {
  const listeners = {};
  return {
    checked: false,
    className: "",
    disabled: false,
    textContent: "",
    addEventListener(type, listener) { listeners[type] = listener; },
    async dispatch(type) { await listeners[type]?.(); }
  };
}

async function loadPopup({ grouped = true, enabled = true, descriptionOnly = false } = {}) {
  const ids = ["openTickets", "status", "options", "descriptionOnly", "groupModeHelp"];
  const elements = Object.fromEntries(ids.map((id) => [id, createElement()]));
  const messages = [];
  const document = {
    documentElement: { dataset: {} },
    getElementById(id) { return elements[id]; }
  };

  const chrome = {
    runtime: {
      async openOptionsPage() {},
      async sendMessage(message) {
        messages.push(message);
        if (message.type === "GET_CURRENT_GROUP_TITLE_MODE") {
          return { ok: true, grouped, enabled, descriptionOnly };
        }
        if (message.type === "SET_CURRENT_GROUP_TITLE_MODE") {
          return { ok: true, updated: 2 };
        }
        return { ok: true, opened: 0 };
      }
    },
    storage: {
      sync: {
        async get() {
          return { theme: "system", ticketLauncherEnabled: true, tabRenameEnabled: enabled };
        }
      }
    }
  };

  vm.runInNewContext(source, { chrome, document, setTimeout });
  await new Promise((resolve) => setImmediate(resolve));
  return { elements, messages };
}

test("popup disables the group toggle and explains ungrouped tabs", async () => {
  const popup = await loadPopup({ grouped: false });

  assert.equal(popup.elements.descriptionOnly.disabled, true);
  assert.match(popup.elements.groupModeHelp.textContent, /tab in a group/i);
});

test("popup reads and immediately updates the current group's title mode", async () => {
  const popup = await loadPopup({ descriptionOnly: false });
  assert.equal(popup.elements.descriptionOnly.disabled, false);
  assert.equal(popup.elements.descriptionOnly.checked, false);

  popup.elements.descriptionOnly.checked = true;
  await popup.elements.descriptionOnly.dispatch("change");

  assert.deepEqual(JSON.parse(JSON.stringify(popup.messages.at(-1))), {
    type: "SET_CURRENT_GROUP_TITLE_MODE",
    descriptionOnly: true
  });
  assert.match(popup.elements.groupModeHelp.textContent, /Updated 2 ConnectWise ticket tabs/i);
});

test("popup honors the global TabRename master switch", async () => {
  const popup = await loadPopup({ enabled: false, descriptionOnly: true });

  assert.equal(popup.elements.descriptionOnly.checked, true);
  assert.equal(popup.elements.descriptionOnly.disabled, true);
  assert.match(popup.elements.groupModeHelp.textContent, /disabled in Settings/i);
});
