import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile("tab-rename.js", "utf8");

async function loadContentScript({ initialEnabled = true, label = "Ticket #123 - Printer" } = {}) {
  const storageListeners = [];
  let observerCallback;
  let title = "ConnectWise";

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
  await Promise.resolve();
  await Promise.resolve();

  return {
    get title() { return title; },
    set title(value) { title = value; },
    mutate() { observerCallback(); },
    changeEnabled(value) {
      storageListeners[0]({ tabRenameEnabled: { newValue: value } }, "sync");
    }
  };
}

test("renames a ticket tab from the detail label", async () => {
  const page = await loadContentScript();
  assert.equal(page.title, "Ticket #123 - Printer");
});

test("restores the ticket title after ConnectWise overwrites it", async () => {
  const page = await loadContentScript();
  page.title = "ConnectWise";
  page.mutate();
  assert.equal(page.title, "Ticket #123 - Printer");
});

test("respects the disabled setting and responds when re-enabled", async () => {
  const page = await loadContentScript({ initialEnabled: false });
  assert.equal(page.title, "ConnectWise");

  page.mutate();
  assert.equal(page.title, "ConnectWise");

  page.changeEnabled(true);
  assert.equal(page.title, "Ticket #123 - Printer");

  page.changeEnabled(false);
  page.title = "ConnectWise changed";
  page.mutate();
  assert.equal(page.title, "ConnectWise changed");
});

test("leaves non-ticket pages unchanged", async () => {
  const page = await loadContentScript({ label: null });
  assert.equal(page.title, "ConnectWise");
});
