const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createReport } = require('../report.js');
const profiles = require('../profiles.js');

const createdAt = new Date('2026-11-19T18:30:00Z');

test('báo cáo lấy cấu hình đang chỉnh và giữ nguyên hồ sơ gốc', () => {
  const draft = structuredClone(profiles.A);
  draft.wps = false;
  draft.guest.isolateLan = true;
  const { html, filename } = createReport(profiles.A, draft, createdAt);
  assert.match(html, /3\/6 tiêu chí đạt/);
  assert.match(html, /Mạng khách bật, cách ly bật/);
  assert.match(html, /Chưa có bằng chứng firmware/);
  assert.match(html, /Đạt: 3 · Cần cải thiện: 2 · Chưa xác minh: 1 · Không áp dụng: 0/);
  assert.equal(filename, 'bao-cao-wifi-A-2026-11-20.html');
  assert.match(html, /20 tháng 11, 2026/);
  assert.match(html, /01:30:00/);
  assert.equal(profiles.A.wps, true);
  assert.equal(profiles.A.guest.isolateLan, false);
});

test('báo cáo phản ánh mục không áp dụng và bằng chứng firmware', () => {
  const reportC = createReport(profiles.C, profiles.C, createdAt).html;
  assert.match(reportC, /2\/5 tiêu chí đạt/);
  assert.match(reportC, /Không áp dụng: 1/);
  const reportB = createReport(profiles.B, profiles.B, createdAt).html;
  assert.match(reportB, /6\/6 tiêu chí đạt/);
  for (const value of ['B-FW', 'TB-MẪU-B', 'MẪU-R1', 'MẪU-03', 'Danh mục hỗ trợ giả định']) {
    assert.ok(reportB.includes(value));
  }
  assert.match(reportB, /@media print/);
  assert.doesNotMatch(reportB, /<script|<link|<iframe|<img/i);
});

test('dữ liệu trong báo cáo được escape và tên tệp không chứa đường dẫn', () => {
  const injection = '<script>alert("x")</script>&\'';
  const draft = structuredClone(profiles.B);
  draft.firmware.source = injection;
  draft.firmware.recordId = injection;
  const { html, filename } = createReport({ id: '../../A', title: injection }, draft, createdAt);
  assert.doesNotMatch(html, /<script/i);
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;'));
  assert.equal(filename, 'bao-cao-wifi-A-2026-11-20.html');
});


test('báo cáo dùng kết luận firmware chung khi thiếu maintenanceStatus', () => {
  const { interpretFirmware } = require('../audit.js');
  const draft = structuredClone(profiles.B);
  delete draft.firmware.maintenanceStatus;
  const interpreted = interpretFirmware(draft.firmware);
  const { html } = createReport(profiles.B, draft, createdAt);
  assert.match(html, /5\/6 tiêu chí đạt/);
  assert.ok(html.includes('<dt>Kết luận</dt><dd>' + interpreted.label + '</dd>'));
  assert.ok(html.includes('<dt>Lý do</dt><dd>' + interpreted.reason + '</dd>'));
  assert.match(html, /<dt>Trạng thái cập nhật<\/dt><dd>Chưa xác minh<\/dd>/);
});


test('báo cáo chứa cảnh báo nhất quán chung và dữ liệu xác thực', () => {
  const { validateConsistency } = require('../audit.js');
  const draft = { ...profiles.B, pmf: 'disabled', wps: true, remoteAdmin: true, remoteAdminStrongAuth: false };
  const { html } = createReport(profiles.B, draft, createdAt);
  for (const warning of validateConsistency(draft)) assert.ok(html.includes(warning.message));
  assert.match(html, /3\/6 tiêu chí đạt/);
  assert.match(html, /Bật; xác thực mạnh: Không/);
  assert.match(createReport(profiles.B, profiles.B, createdAt).html, /Không có cảnh báo nhất quán/);
});

test('báo cáo escape nội dung cảnh báo trước khi dựng HTML', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const audit = require('../audit.js');
  const sandbox = { module: { exports: {} }, require: request => request === './audit.js' ? ({ ...audit,
    validateConsistency: () => [{ id: 'test', message: '<img src=x onerror=alert(1)>&' }],
  }) : request === './recommendations.js' ? require('../recommendations.js') : require('../what-if.js') };
  vm.runInNewContext(fs.readFileSync(require.resolve('../report.js'), 'utf8'), sandbox);
  const { html } = sandbox.module.exports.createReport(profiles.B, profiles.B, createdAt);
  assert.doesNotMatch(html, /<img/i);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;&amp;'));
});


test('báo cáo có việc cần làm dùng chung theo đúng thứ tự ưu tiên', () => {
  const { JSDOM } = require('jsdom');
  const { buildTodo } = require('../recommendations.js');
  const dom = new JSDOM(createReport(profiles.A, profiles.A, createdAt).html);
  const items = [...dom.window.document.querySelectorAll('.todo-list li')];
  const todos = buildTodo(profiles.A);
  assert.equal(items.length, todos.length);
  for (const [index, todo] of todos.entries()) {
    assert.ok(items[index].textContent.includes(todo.id));
    assert.ok(items[index].textContent.includes(todo.risk));
    assert.ok(items[index].textContent.includes(todo.action));
    assert.ok(items[index].textContent.includes(todo.priority));
  }
  dom.window.close();
});

test('báo cáo escape toàn bộ nội dung khuyến nghị và việc cần làm', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const injection = '<img src=x onerror=alert(1)>&';
  const sandbox = { module: { exports: {} }, require: request => request === './audit.js'
    ? require('../audit.js') : request === './recommendations.js' ? { buildTodo: () => [{ id: 'C1', title: injection,
      priority: injection, risk: injection, action: injection }] } : require('../what-if.js') };
  vm.runInNewContext(fs.readFileSync(require.resolve('../report.js'), 'utf8'), sandbox);
  const { html } = sandbox.module.exports.createReport(profiles.A, profiles.A, createdAt);
  assert.doesNotMatch(html, /<img/i);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;&amp;'));
});


test('báo cáo so với baseline gốc, thể hiện +2 và chuyển trạng thái C2/C4', () => {
  const { JSDOM } = require('jsdom');
  const draft = structuredClone(profiles.A);
  draft.wps = false;
  draft.guest.isolateLan = true;
  const dom = new JSDOM(createReport(profiles.A, draft, createdAt).html);
  const section = dom.window.document.querySelector('.baseline-section');
  assert.match(section.textContent, /\+2 so với hồ sơ gốc/);
  assert.match(section.textContent, /Gốc 1\/6; hiện tại 3\/6/);
  const rows = [...section.querySelectorAll('tbody tr')];
  assert.equal(rows.length, 6);
  assert.equal(rows[1].cells[2].textContent, 'Cần cải thiện');
  assert.equal(rows[1].cells[4].textContent, 'Đạt');
  assert.equal(rows[3].cells[2].textContent, 'Cần cải thiện');
  assert.equal(rows[3].cells[4].textContent, 'Đạt');
  dom.window.close();
});

test('báo cáo so baseline nêu mẫu số thay đổi và C4 không áp dụng', () => {
  const draft = { ...profiles.A, guest: { enabled: false, isolateLan: null } };
  const { html } = createReport(profiles.A, draft, createdAt);
  assert.match(html, /Gốc 1\/6; hiện tại 1\/5/);
  assert.match(html, /Số tiêu chí áp dụng thay đổi từ 6 thành 5/);
  assert.match(html, /Không áp dụng/);
});

test('báo cáo ghi thời điểm tạo, hồ sơ nguồn và tuyên bố mô phỏng', () => {
  const { html } = createReport(profiles.B, profiles.B, createdAt);
  assert.match(html, /Hồ sơ nguồn: B — Cấu hình mục tiêu/);
  assert.match(html, /Thời điểm tạo:/);
  assert.ok(html.includes('<time datetime="' + createdAt.toISOString() + '">'));
  assert.match(html, /Đây là mô phỏng phục vụ giáo dục, không kết nối router thật/);
  assert.doesNotMatch(html, /<script|<link|<iframe|<img/i);
});

test('CSS in giữ nguyên bảng, lặp tiêu đề và ngắt trước phần việc cần làm', () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(createReport(profiles.A, profiles.A, createdAt).html);
  const rules = [...dom.window.document.styleSheets[0].cssRules];
  const print = rules.find(rule => rule.media?.mediaText === 'print');
  assert.ok(print);
  const styles = [...print.cssRules];
  const table = styles.find(rule => rule.selectorText === 'table');
  assert.equal(table.style.getPropertyValue('break-inside'), 'avoid');
  assert.equal(table.style.getPropertyValue('page-break-inside'), 'avoid');
  const headers = styles.find(rule => rule.selectorText === 'thead');
  assert.equal(headers.style.display, 'table-header-group');
  const tasks = styles.find(rule => rule.selectorText === '.todo-section');
  assert.equal(tasks.style.getPropertyValue('break-before'), 'page');
  assert.ok(styles.some(rule => rule.selectorText.includes('.baseline-section')
    && rule.style.getPropertyValue('break-inside') === 'avoid'));
  dom.window.close();
});

test('báo cáo escape dữ liệu firmware cả ở bảng baseline', () => {
  const { JSDOM } = require('jsdom');
  const source = structuredClone(profiles.B);
  source.firmware.recordId = '<img src=x onerror=alert(1)>';
  const draft = structuredClone(source);
  draft.firmware.recordId = '<script>alert(2)</script>';
  const { html } = createReport(source, draft, createdAt);
  const dom = new JSDOM(html);
  const baseline = dom.window.document.querySelector('.baseline-table');
  assert.ok(baseline.textContent.includes(source.firmware.recordId));
  assert.ok(baseline.textContent.includes(draft.firmware.recordId));
  assert.equal(baseline.querySelector('img, script'), null);
  assert.doesNotMatch(html, /<img|<script/i);
  dom.window.close();
});
