const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Blob } = require('node:buffer');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '../..');

function openApp(t, { setup, beforeMain } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: 'https://wifi-demo.test/', runScripts: 'outside-only', virtualConsole,
  });
  const { window } = dom;
  t.after(() => {
    dom.window.close();
    assert.deepEqual(errors, [], 'không có lỗi JavaScript chưa xử lý');
  });
  const downloads = [];
  const blobs = [];
  const revoked = [];
  const timers = [];
  window.Blob = Blob;
  window.URL.createObjectURL = blob => {
    blobs.push(blob);
    return 'blob:https://wifi-demo.test/' + blobs.length;
  };
  window.URL.revokeObjectURL = url => revoked.push(url);
  window.HTMLAnchorElement.prototype.click = function () {
    downloads.push({ href: this.href, filename: this.download, connected: this.isConnected });
  };
  window.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return timers.length; };
  setup?.(window);
  for (const script of window.document.querySelectorAll('script[src]')) {
    const filename = script.getAttribute('src');
    if (filename === 'main.js') beforeMain?.(window);
    window.eval(fs.readFileSync(path.join(root, filename), 'utf8'));
  }
  const byId = id => window.document.getElementById(id);
  return {
    window, byId, downloads, blobs, revoked, timers,
    change(id, value) {
      const control = byId(id);
      control.value = value;
      control.dispatchEvent(new window.Event('change', { bubbles: true }));
    },
    selectProfile(id) { window.document.querySelector('[data-profile="' + id + '"]').click(); },
    score() { return byId('passed').textContent + '/' + byId('applicable').textContent; },
    firmwareDetails() {
      return Object.fromEntries([...byId('firmware-record').querySelectorAll('dt')]
        .map(term => [term.textContent, term.nextElementSibling.textContent]));
    },
  };
}
module.exports = { openApp };
