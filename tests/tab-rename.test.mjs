import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile("tab-rename.js", "utf8");

async function loadContentScript({
  initialEnabled = true,
  descriptionOnly = false,
  label: initialLabel = "Service Ticket #123456 - Printer unavailable"
} = {}) {
  const storageListeners = [];
  const runtimeListeners = [];
  let observerCallback;
  let title = "ConnectWise";
  let label = initialLabel;

  const document = {
    documentElement: {},
    querySelector(selector) {
      assert.equal(selector, ".detailLabel");
      return label === null ? null : { innerText: label };
    },
    get title() { return title; },
    set title(value) { title = value; }
  };

  class MutationObserver {
    constructor(callback) { observerCallback = callback; }
    observe(target, options) {
      assert.equal(target, document.documentElement);
      assert.equal(options.subtree, true);
    }
  }

  const context = {
    chrome: {
      runtime: {
        onMessage: { addListener(listener) { runtimeListeners.push(listener); } },
        async sendMessage(message) {
          assert.equal(message.type, "GET_TAB_RENAME_MODE");
          return { ok: true, enabled: initialEnabled, descriptionOnly };
        }
      },
      storage: {
        sync: { async get() { return { tabRenameEnabled: initialEnabled }; } },
        onChanged: { addListener(listener) { storageListeners.push(listener); } }
      }
    },
    console,
    document,
    MutationObserver,
    setTimeout(callback) { callback(); return null; }
  };

  vm.runInNewContext(source, context);
  await new Promise((resolve) => setImmediate(resolve));

  return {
    get title() { return title; },
    set title(value) { title = value; },
    mutate() { observerCallback(); },
    navigate(nextLabel) {
      label = nextLabel;
      observerCallback();
    },
    applyMode(nextDescriptionOnly, nextEnabled = true) {
      runtimeListeners[0]({
        type: "APPLY_TAB_RENAME_MODE",
        enabled: nextEnabled,
        descriptionOnly: nextDescriptionOnly
      });
    },
    changeEnabled(value) {
      storageListeners[0]({ tabRenameEnabled: { newValue: value } }, "sync");
    }
  };
}

test("full ticket titles remain the default", async () => {
  const page = await loadContentScript();
  assert.equal(page.title, "Service Ticket #123456 - Printer unavailable");
});

test("description-only mode supports Service and Project ticket headers", async () => {
  const service = await loadContentScript({ descriptionOnly: true });
  assert.equal(service.title, "Printer unavailable");

  const project = await loadContentScript({
    descriptionOnly: true,
    label: "Project Ticket #123457 - Server migration"
  });
  assert.equal(project.title, "Server migration");
});

test("description-only mode preserves capitalization and additional hyphens", async () => {
  const page = await loadContentScript({
    descriptionOnly: true,
    label: "Service Ticket #123458 - VPN - East Office - Urgent"
  });
  assert.equal(page.title, "VPN - East Office - Urgent");
});

test("unknown or empty ticket header formats retain the full title", async () => {
  const unknown = await loadContentScript({
    descriptionOnly: true,
    label: "Change Ticket #123459 - Firewall review"
  });
  assert.equal(unknown.title, "Change Ticket #123459 - Firewall review");

  const empty = await loadContentScript({
    descriptionOnly: true,
    label: "Project Ticket #123460 -    "
  });
  assert.equal(empty.title, "Project Ticket #123460 -");
});

test("restores the ticket title after ConnectWise overwrites it", async () => {
  const page = await loadContentScript();
  page.title = "ConnectWise";
  page.mutate();
  assert.equal(page.title, "Service Ticket #123456 - Printer unavailable");
});

test("navigation between tickets keeps the current group title mode", async () => {
  const page = await loadContentScript({ descriptionOnly: true });
  page.navigate("Project Ticket #123461 - Replacement server");
  assert.equal(page.title, "Replacement server");

  page.navigate("Service Ticket #123462 - Monitor - intermittent signal");
  assert.equal(page.title, "Monitor - intermittent signal");
});

test("a new group mode immediately reformats the current ticket", async () => {
  const page = await loadContentScript();
  page.applyMode(true);
  assert.equal(page.title, "Printer unavailable");

  page.applyMode(false);
  assert.equal(page.title, "Service Ticket #123456 - Printer unavailable");
});

test("respects the disabled setting and responds when re-enabled", async () => {
  const page = await loadContentScript({ initialEnabled: false });
  assert.equal(page.title, "ConnectWise");

  page.mutate();
  assert.equal(page.title, "ConnectWise");

  page.changeEnabled(true);
  assert.equal(page.title, "Service Ticket #123456 - Printer unavailable");

  page.changeEnabled(false);
  page.title = "ConnectWise changed";
  page.mutate();
  assert.equal(page.title, "ConnectWise changed");

  page.applyMode(true, false);
  page.mutate();
  assert.equal(page.title, "ConnectWise changed");
});

test("leaves non-ticket pages unchanged", async () => {
  const page = await loadContentScript({ label: null });
  assert.equal(page.title, "ConnectWise");
});
