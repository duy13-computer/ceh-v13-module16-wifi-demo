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
