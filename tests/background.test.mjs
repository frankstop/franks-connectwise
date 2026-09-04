import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile("background.js", "utf8");

function loadBackground(overrides = {}) {
  const runtimeListeners = [];
  const commandListeners = [];
  const calls = {
    create: [],
    executeScript: [],
    group: [],
    groupUpdate: [],
    tabUpdate: [],
    query: []
  };
  let nextTabId = 100;

  const chrome = {
    commands: {
      onCommand: { addListener(listener) { commandListeners.push(listener); } }
    },
    runtime: {
      onInstalled: { addListener() {} },
      onMessage: { addListener(listener) { runtimeListeners.push(listener); } }
    },
    scripting: {
      async executeScript(options) {
        calls.executeScript.push(options);
        return [{ result: { ok: true, found: 0, urls: [] } }];
      }
    },
    storage: {
      sync: {
        async get(defaults) { return { ...defaults, ...overrides }; },
        async set() {}
      }
    },
    tabs: {
      async query(options) {
        calls.query.push(options);
        return [{ id: 7, index: 3, windowId: 2, url: "https://example.com/" }];
      },
      async create(options) {
        calls.create.push(options);
        return { id: nextTabId++ };
      },
      async group(options) {
        calls.group.push(options);
        return 12;
      },
      async update(tabId, options) {
        calls.tabUpdate.push({ tabId, options });
      }
    },
    tabGroups: {
      async update(groupId, options) {
        calls.groupUpdate.push({ groupId, options });
      }
    }
  };

  vm.runInNewContext(source, { chrome, console, Set });

  return {
    calls,
    async command(name) {
      await commandListeners[0](name);
    },
    message(message, sender = { tab: { id: 7, index: 3, windowId: 2 } }) {
      return new Promise((resolve, reject) => {
        const handled = runtimeListeners[0](message, sender, resolve);
        if (!handled) reject(new Error(`Message was not handled: ${message.type}`));
      });
    }
  };
}

test("region shortcut injects the selector only when enabled", async () => {
  const enabled = loadBackground();
  await enabled.command("select-links-in-region");
  assert.deepEqual(JSON.parse(JSON.stringify(enabled.calls.executeScript)), [{
    target: { tabId: 7 },
    files: ["selector.js"]
  }]);

  const disabled = loadBackground({ regionLinkOpenerEnabled: false });
  await disabled.command("select-links-in-region");
  assert.equal(disabled.calls.query.length, 0);
  assert.equal(disabled.calls.executeScript.length, 0);
});

test("region links are deduplicated, backgrounded, and grouped with settings", async () => {
  const extension = loadBackground({
    regionGroupTitle: "Research",
    regionGroupColor: "green",
    regionCollapseGroup: true
  });

  const result = await extension.message({
    type: "OPEN_REGION_LINKS",
    urls: ["https://example.com/a", "https://example.com/a", "mailto:test@example.com", "https://example.com/b"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.opened, 2);
  assert.deepEqual(extension.calls.create.map((call) => call.url), [
    "https://example.com/a",
    "https://example.com/b"
  ]);
  assert.ok(extension.calls.create.every((call) => call.active === false));
  assert.deepEqual(JSON.parse(JSON.stringify(extension.calls.group)), [{ tabIds: [100, 101] }]);
  assert.deepEqual(JSON.parse(JSON.stringify(extension.calls.groupUpdate)), [{
    groupId: 12,
    options: { title: "Research (2)", color: "green", collapsed: true }
  }]);
  assert.deepEqual(JSON.parse(JSON.stringify(extension.calls.tabUpdate)), [
    { tabId: 7, options: { active: true } }
  ]);
});

test("region links can preserve duplicates, open in front, and skip grouping", async () => {
  const extension = loadBackground({
    regionRemoveDuplicates: false,
    regionOpenInBackground: false,
    regionGroupTabs: false
  });

  const result = await extension.message({
    type: "OPEN_REGION_LINKS",
    urls: ["https://example.com/a", "https://example.com/a"]
  });

  assert.equal(result.opened, 2);
  assert.equal(extension.calls.create.length, 2);
  assert.ok(extension.calls.create.every((call) => call.active === true));
  assert.equal(extension.calls.group.length, 0);
  assert.equal(extension.calls.groupUpdate.length, 0);
  assert.equal(extension.calls.tabUpdate.length, 0);
});
