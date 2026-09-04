import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile("background.js", "utf8");

function createCalendarFixture(entries = []) {
  let currentEntry = null;
  const document = {
    lastSelector: null,
    querySelectorAll(selector) {
      this.lastSelector = selector;
      const selectedTypes = selector.split(", ").map((part) => part.replace(".appointment.", ""));
      return entries
        .filter((entry) => selectedTypes.includes(entry.type))
        .map((entry) => ({
          style: { top: String(entry.top), left: String(entry.left) },
          getBoundingClientRect() {
            return { top: entry.top, left: entry.left, width: 100, height: 30 };
          },
          dispatchEvent(event) {
            if (event.type === "contextmenu") currentEntry = entry;
          }
        }));
    },
    getElementById(id) {
      if (id !== "OpenInNewTab" || !currentEntry) return null;
      return {
        dispatchEvent(event) {
          if (event.type === "click") window.open(currentEntry.url);
        }
      };
    }
  };
  const window = { open() {} };
  return { document, window };
}

function loadBackground(overrides = {}, fixtureOptions = {}) {
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
  const calendar = createCalendarFixture(fixtureOptions.calendarEntries);

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
        if (options.func) {
          return [{ result: await options.func(...(options.args || [])) }];
        }
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
        return [fixtureOptions.activeTab || {
          id: 7, index: 3, windowId: 2, url: "https://example.com/"
        }];
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

  class MouseEvent {
    constructor(type) { this.type = type; }
  }

  vm.runInNewContext(source, {
    chrome,
    console,
    document: calendar.document,
    MouseEvent,
    Set,
    setTimeout(resolve) { resolve(); },
    window: calendar.window
  });

  return {
    calendar,
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

const SANITIZED_CALENDAR_ENTRIES = [
  { type: "meeting", url: "https://example.com/tickets/meeting", top: 30, left: 10 },
  { type: "service", url: "https://example.com/tickets/service", top: 10, left: 20 },
  { type: "project", url: "https://example.com/tickets/project", top: 20, left: 10 },
  { type: "activity", url: "https://example.com/tickets/activity", top: 40, left: 10 },
  { type: "misc-entry", url: "https://example.com/tickets/misc", top: 50, left: 10 }
];

const CONNECTWISE_TAB = {
  id: 7,
  index: 3,
  windowId: 2,
  url: "https://na.myconnectwise.net/v2026_1/connectwise.aspx"
};

async function openCalendar(overrides = {}) {
  const extension = loadBackground(overrides, {
    activeTab: CONNECTWISE_TAB,
    calendarEntries: SANITIZED_CALENDAR_ENTRIES
  });
  const result = await extension.message({ type: "OPEN_TODAYS_TICKETS" });
  return { extension, result };
}

test("calendar defaults include Service and Project but exclude other entry types", async () => {
  const { extension, result } = await openCalendar();

  assert.equal(result.ok, true);
  assert.deepEqual(extension.calls.create.map((call) => call.url), [
    "https://example.com/tickets/service",
    "https://example.com/tickets/project"
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(extension.calls.executeScript[0].args)), [[
    "service",
    "project"
  ]]);
  assert.equal(extension.calendar.document.lastSelector, ".appointment.service, .appointment.project");
});

test("Meeting is included only when enabled", async () => {
  const disabled = await openCalendar({ calendarTypes: ["service"] });
  assert.deepEqual(disabled.extension.calls.create.map((call) => call.url), [
    "https://example.com/tickets/service"
  ]);

  const enabled = await openCalendar({ calendarTypes: ["meeting"] });
  assert.deepEqual(enabled.extension.calls.create.map((call) => call.url), [
    "https://example.com/tickets/meeting"
  ]);
});

test("multiple selected calendar types work together in calendar order", async () => {
  const { extension } = await openCalendar({
    calendarTypes: ["misc-entry", "service", "activity"]
  });

  assert.deepEqual(extension.calls.create.map((call) => call.url), [
    "https://example.com/tickets/service",
    "https://example.com/tickets/activity",
    "https://example.com/tickets/misc"
  ]);
});

test("no selected calendar types returns the Settings error", async () => {
  const { extension, result } = await openCalendar({ calendarTypes: [] });

  assert.equal(result.ok, false);
  assert.equal(result.error, "Select at least one calendar type in Settings.");
  assert.equal(extension.calls.executeScript.length, 0);
  assert.equal(extension.calls.create.length, 0);
});

test("invalid stored calendar type names are ignored before selector construction", async () => {
  const { extension } = await openCalendar({
    calendarTypes: ["service", "not-a-calendar-type", "meeting] .appointment"]
  });

  assert.deepEqual(JSON.parse(JSON.stringify(extension.calls.executeScript[0].args)), [["service"]]);
  assert.equal(extension.calendar.document.lastSelector, ".appointment.service");
  assert.deepEqual(extension.calls.create.map((call) => call.url), [
    "https://example.com/tickets/service"
  ]);
});

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
