const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openApp } = require('./helpers/app.cjs');

test('giao diện chuyển A/B/C đúng điểm gốc và bảng so sánh', t => {
  const app = openApp(t);
  for (const [id, score] of [['A', '1/6'], ['B', '6/6'], ['C', '2/5'], ['A', '1/6']]) {
    app.selectProfile(id);
    assert.equal(app.score(), score);
    assert.equal(app.byId('score-profile').textContent, id);
    assert.equal(app.window.document.querySelector('[data-profile="' + id + '"]').getAttribute('aria-pressed'), 'true');
    assert.equal(app.byId('reset').disabled, true);
  }
  assert.equal(app.byId('comparison-table').tBodies[0].rows.length, 6);
  assert.deepEqual([...app.byId('comparison-table').tFoot.rows[0].cells].slice(1).map(c => c.textContent), ['1/6', '6/6', '2/5']);
});

test('khôi phục trả tất cả trường về baseline và cập nhật nút reset', t => {
  const app = openApp(t);
  app.change('wps', 'off');
  assert.equal(app.byId('reset').disabled, false);
  app.change('wps', 'on');
  assert.equal(app.byId('reset').disabled, true);
  app.change('mode', 'wpa3-personal');
  app.change('firmware', 'outdated');
  app.change('remote-admin', 'on');
  app.change('remote-admin-strong-auth', 'on');
  app.byId('reset').click();
  assert.equal(app.score(), '1/6');
  assert.equal(app.byId('mode').value, 'wpa2-wpa3-transition');
  assert.equal(app.byId('firmware').value, 'missing');
  assert.equal(app.byId('remote-admin').value, 'off');
  assert.equal(app.byId('remote-admin-strong-auth').value, '');
  assert.equal(app.byId('reset').disabled, true);
  assert.equal(app.window.document.activeElement.dataset.profile, 'A');
});

test('tắt mạng khách khóa cách ly và chỉ loại C4 khi xác nhận tắt', t => {
  const app = openApp(t);
  app.change('guest-enabled', 'off');
  assert.equal(app.byId('guest-isolation').disabled, true);
  assert.equal(app.byId('applicable').textContent, '5');
  app.change('guest-enabled', '');
  assert.equal(app.byId('guest-isolation').disabled, true);
  assert.equal(app.byId('applicable').textContent, '6');
  app.change('guest-enabled', 'on');
  assert.equal(app.byId('guest-isolation').disabled, false);
});

test('giao diện nạp đúng firmware riêng cho mỗi hồ sơ và kịch bản', t => {
  const app = openApp(t);
  for (const id of ['A', 'B', 'C']) {
    app.selectProfile(id);
    assert.equal(app.byId('firmware').value, id === 'B' ? 'verified' : 'missing');
    for (const scenario of ['verified', 'outdated']) {
      app.change('firmware', scenario);
      const details = app.firmwareDetails();
      assert.equal(details['Thiết bị'], 'TB-MẪU-' + id);
      assert.equal(details['Mã bản ghi'], id + '-FW' + (scenario === 'outdated' ? '-CŨ' : ''));
      assert.equal(details['Kết luận'], scenario === 'verified' ? 'Đạt' : 'Cần cải thiện');
    }
  }
});

test('giao diện dùng cùng kết luận khi firmware thiếu maintenanceStatus', t => {
  const app = openApp(t, { beforeMain(window) {
    const record = { ...window.WifiFirmware.B.verified };
    delete record.maintenanceStatus;
    window.WifiFirmware = { ...window.WifiFirmware, B: { ...window.WifiFirmware.B, verified: record } };
  } });
  app.selectProfile('B');
  assert.equal(app.score(), '5/6');
  assert.equal(app.firmwareDetails()['Kết luận'], 'Chưa xác minh');
  assert.equal(app.firmwareDetails()['Trạng thái cập nhật'], 'Chưa xác minh');
  assert.equal(app.firmwareDetails()['Lý do'], app.byId('reason-C6').textContent);
});

test('tải báo cáo tạo Blob, tên tệp đúng, dọn liên kết và thu hồi URL', async t => {
  const app = openApp(t);
  app.selectProfile('B');
  app.byId('export-report').click();
  assert.equal(app.downloads.length, 1);
  assert.match(app.downloads[0].filename, /^bao-cao-wifi-B-\d{4}-\d{2}-\d{2}\.html$/);
  assert.equal(app.downloads[0].connected, true);
  assert.equal(app.blobs[0].type, 'text/html;charset=utf-8');
  const html = await app.blobs[0].text();
  assert.match(html, /6\/6 tiêu chí đạt/);
  assert.match(html, /B-FW/);
  assert.equal(app.window.document.querySelectorAll('a[download]').length, 0);
  assert.match(app.byId('export-message').textContent, /Đã tạo báo cáo/);
  assert.equal(app.timers[0].delay, 1000);
  app.timers[0].callback();
  assert.deepEqual(app.revoked, [app.downloads[0].href]);
});

test('kịch bản A → tắt WPS → bật cách ly → 3/6 → xuất báo cáo', async t => {
  const app = openApp(t);
  assert.equal(app.score(), '1/6');
  app.change('wps', 'off');
  assert.equal(app.score(), '2/6');
  app.change('guest-isolation', 'on');
  assert.equal(app.score(), '3/6');
  app.byId('export-report').click();
  const html = await app.blobs[0].text();
  assert.match(html, /3\/6 tiêu chí đạt/);
  assert.match(html, /Mạng khách bật, cách ly bật/);
  assert.match(html, /Ghép nối nhanh qua WPS đã tắt/);
  assert.equal(app.window.WifiProfiles.A.wps, true);
  assert.equal(app.window.WifiProfiles.A.guest.isolateLan, false);
});

test('cảnh báo có aria-live, cập nhật theo cấu hình và không đổi điểm xác thực', t => {
  const app = openApp(t);
  assert.equal(app.byId('consistency-warnings').getAttribute('aria-live'), 'polite');
  app.selectProfile('B');
  assert.match(app.byId('consistency-warnings').textContent, /Không có cảnh báo/);
  app.change('pmf', 'disabled');
  assert.match(app.byId('consistency-warnings').textContent, /PMF/);
  app.change('remote-admin', 'on');
  assert.equal(app.byId('remote-admin-strong-auth').disabled, false);
  assert.match(app.byId('consistency-warnings').textContent, /xác thực mạnh chưa/);
  const score = app.score();
  app.change('remote-admin-strong-auth', 'on');
  assert.doesNotMatch(app.byId('consistency-warnings').textContent, /xác thực mạnh chưa/);
  assert.equal(app.score(), score);
});

test('cảnh báo dùng textContent, không chèn HTML vào DOM', t => {
  const injection = '<img src=x onerror=alert(1)>';
  const app = openApp(t, { beforeMain(window) {
    window.WifiAudit = { ...window.WifiAudit, validateConsistency: () => [{ id: 'test', message: injection }] };
  } });
  assert.equal(app.byId('consistency-warnings').textContent, injection);
  assert.equal(app.byId('consistency-warnings').querySelector('img'), null);
});

test('lỗi xuất báo cáo được thông báo và không để liên kết rác', t => {
  const app = openApp(t);
  app.window.URL.createObjectURL = () => { throw new Error('download unavailable'); };
  app.byId('export-report').click();
  assert.match(app.byId('export-message').textContent, /Chưa xuất được báo cáo/);
  assert.equal(app.downloads.length, 0);
  assert.equal(app.window.document.querySelectorAll('a[download]').length, 0);
  app.change('wps', 'off');
  assert.equal(app.byId('export-message').textContent, '');
});


test('giữ bản nháp riêng A/B/C khi đổi hồ sơ, không sửa hồ sơ gốc', t => {
  const app = openApp(t);
  app.change('wps', 'off');
  app.change('guest-isolation', 'on');
  app.selectProfile('B');
  assert.equal(app.score(), '6/6');
  app.change('firmware', 'outdated');
  app.selectProfile('C');
  assert.equal(app.score(), '2/5');
  app.change('pmf', 'required');
  app.selectProfile('A');
  assert.equal(app.score(), '3/6');
  assert.equal(app.byId('wps').value, 'off');
  assert.match(app.byId('profile-description').textContent, /Bản nháp/);
  app.selectProfile('B');
  assert.equal(app.byId('firmware').value, 'outdated');
  assert.equal(app.firmwareDetails()['Mã bản ghi'], 'B-FW-CŨ');
  app.selectProfile('C');
  assert.equal(app.byId('pmf').value, 'required');
  assert.equal(app.window.WifiProfiles.A.wps, true);
  assert.equal(app.window.WifiProfiles.B.firmware.maintenanceStatus, 'up-to-date');
});

test('localStorage khôi phục bản nháp sau mở lại và xóa riêng hồ sơ hiện tại', t => {
  const first = openApp(t);
  first.change('wps', 'off');
  first.change('guest-isolation', 'on');
  first.selectProfile('B');
  first.change('pmf', 'optional');
  const storage = first.window.localStorage;
  const saved = Object.fromEntries(Array.from({ length: storage.length }, (_, i) => {
    const key = storage.key(i); return [key, storage.getItem(key)];
  }));
  const restored = openApp(t, { setup(window) {
    for (const [key, value] of Object.entries(saved)) window.localStorage.setItem(key, value);
  } });
  assert.equal(restored.score(), '3/6');
  assert.equal(restored.byId('reset').disabled, false);
  restored.byId('reset').click();
  assert.equal(restored.score(), '1/6');
  assert.equal(restored.byId('reset').disabled, true);
  assert.equal(restored.window.localStorage.getItem('wifi-audit:draft:v1:A'), null);
  restored.selectProfile('B');
  assert.equal(restored.byId('pmf').value, 'optional');
  restored.selectProfile('A');
  assert.equal(restored.score(), '1/6');
});

test('bỏ qua bản nháp hỏng, thiếu trường hoặc chứa lựa chọn không hợp lệ', t => {
  for (const value of ['{broken', 'null', '[]', '{}', JSON.stringify({ mode: '<script>alert(1)</script>' })]) {
    const app = openApp(t, { setup(window) { window.localStorage.setItem('wifi-audit:draft:v1:A', value); } });
    assert.equal(app.score(), '1/6');
    assert.equal(app.byId('reset').disabled, true);
  }
  const first = openApp(t);
  first.change('wps', 'off');
  const values = JSON.parse(first.window.localStorage.getItem('wifi-audit:draft:v1:A'));
  values.firmware = '../B';
  const app = openApp(t, { setup(window) {
    window.localStorage.setItem('wifi-audit:draft:v1:A', JSON.stringify(values));
  } });
  assert.equal(app.score(), '1/6');
});

test('localStorage bị chặn vẫn giữ bản nháp trong phiên và khôi phục được', t => {
  const app = openApp(t, { setup(window) {
    Object.defineProperty(window, 'localStorage', { get() { throw new window.DOMException('blocked', 'SecurityError'); } });
  } });
  assert.equal(app.score(), '1/6');
  app.change('wps', 'off');
  app.selectProfile('B');
  app.selectProfile('A');
  assert.equal(app.score(), '2/6');
  assert.match(app.byId('draft-message').textContent, /chỉ được giữ trong phiên/);
  app.byId('reset').click();
  assert.equal(app.score(), '1/6');
});

test('localStorage hết dung lượng không làm gián đoạn đánh giá và xuất báo cáo', async t => {
  const app = openApp(t, { setup(window) {
    window.Storage.prototype.setItem = () => { throw new window.DOMException('full', 'QuotaExceededError'); };
  } });
  app.change('wps', 'off');
  assert.equal(app.score(), '2/6');
  app.selectProfile('B');
  app.selectProfile('A');
  assert.equal(app.score(), '2/6');
  app.byId('export-report').click();
  assert.match(await app.blobs[0].text(), /2\/6 tiêu chí đạt/);
});


test('giao diện hiển thị khuyến nghị và việc cần làm theo cùng thứ tự ưu tiên', t => {
  const app = openApp(t);
  const todos = app.window.WifiRecommendations.buildTodo(app.window.WifiProfiles.A);
  const items = [...app.byId('todo-list').children];
  assert.deepEqual(items.map(item => item.dataset.criterion), Array.from(todos, todo => todo.id));
  for (const todo of todos) {
    const detail = app.byId('recommendation-' + todo.id);
    assert.equal(detail.hidden, false);
    for (const value of [todo.risk, todo.action, todo.priority]) assert.ok(detail.textContent.includes(value));
  }
  app.change('wps', 'off');
  assert.equal(app.byId('recommendation-C2').hidden, true);
  app.selectProfile('B');
  assert.equal(app.byId('todo-list').children.length, 0);
  assert.equal(app.byId('todo-empty').hidden, false);
  app.selectProfile('C');
  assert.equal(app.byId('recommendation-C4').hidden, true);
});

test('giao diện chèn khuyến nghị bằng textContent', t => {
  const injection = '<img src=x onerror=alert(1)>';
  const app = openApp(t, { beforeMain(window) {
    window.WifiRecommendations = { ...window.WifiRecommendations,
      buildTodo: () => [{ id: 'C1', title: injection, priority: injection, risk: injection, action: injection }],
    };
  } });
  for (const id of ['recommendation-C1', 'todo-list']) {
    assert.ok(app.byId(id).textContent.includes(injection));
    assert.equal(app.byId(id).querySelector('img'), null);
  }
});


test('what-if cập nhật delta và chỉ nêu tiêu chí vừa đổi trạng thái', t => {
  const app = openApp(t);
  assert.match(app.byId('score-delta').textContent, /0 so với hồ sơ gốc/);
  assert.equal(app.byId('what-if-summary').getAttribute('aria-live'), 'polite');
  app.change('wps', 'off');
  assert.match(app.byId('score-delta').textContent, /\+1 so với hồ sơ gốc/);
  assert.match(app.byId('last-status-change').textContent, /C2 · Cần cải thiện → Đạt/);
  app.change('guest-isolation', 'on');
  assert.match(app.byId('score-delta').textContent, /\+2 so với hồ sơ gốc/);
  assert.match(app.byId('last-status-change').textContent, /C4 · Cần cải thiện → Đạt/);
  assert.doesNotMatch(app.byId('last-status-change').textContent, /C2/);
  assert.equal(app.window.document.querySelector('[data-criterion="C4"]').dataset.recentlyChanged, 'true');
  app.byId('reset').click();
  assert.match(app.byId('score-delta').textContent, /0 so với hồ sơ gốc/);
  assert.doesNotMatch(app.byId('last-status-change').textContent, /Vừa đổi trạng thái/);
});

test('what-if hiển thị mẫu số mới và đặt lại baseline khi chuyển hồ sơ', t => {
  const app = openApp(t);
  app.change('guest-enabled', 'off');
  assert.equal(app.byId('denominator-note').hidden, false);
  assert.match(app.byId('score-delta').textContent, /Gốc 1\/6; hiện tại 1\/5/);
  assert.match(app.byId('last-status-change').textContent, /Không áp dụng/);
  app.selectProfile('B');
  assert.equal(app.byId('denominator-note').hidden, true);
  app.change('pmf', 'disabled');
  assert.match(app.byId('score-delta').textContent, /-1 so với hồ sơ gốc/);
});

test('gợi ý mở/đóng, tự cập nhật khi chỉnh trường và không sửa cấu hình', t => {
  const app = openApp(t);
  app.byId('suggest-path').click();
  assert.equal(app.byId('shortest-path').hidden, false);
  assert.equal(app.byId('suggest-path').getAttribute('aria-expanded'), 'true');
  assert.equal(app.byId('path-list').children.length, 5);
  assert.equal(app.score(), '1/6');
  assert.equal(app.window.localStorage.length, 0);
  app.change('wps', 'off');
  assert.equal(app.byId('path-list').children.length, 4);
  app.byId('suggest-path').click();
  assert.equal(app.byId('shortest-path').hidden, true);
  assert.equal(app.byId('suggest-path').getAttribute('aria-expanded'), 'false');
});

test('gợi ý B rỗng, C giữ mạng khách tắt, chưa rõ khách có thông báo xác minh', t => {
  const app = openApp(t);
  app.selectProfile('B');
  app.byId('suggest-path').click();
  assert.equal(app.byId('path-list').children.length, 0);
  assert.match(app.byId('path-summary').textContent, /Đã đạt điểm tối đa/);
  app.selectProfile('C');
  assert.equal(app.byId('shortest-path').hidden, true);
  app.byId('suggest-path').click();
  assert.equal(app.byId('path-list').children.length, 3);
  assert.equal(app.byId('guest-enabled').value, 'off');
  app.change('guest-enabled', '');
  assert.match(app.byId('path-summary').textContent, /chưa thể kết luận/);
});

test('bản nháp khôi phục vẫn so với hồ sơ gốc và đổi xác thực không báo trạng thái giả', t => {
  const first = openApp(t);
  first.change('wps', 'off');
  first.change('guest-isolation', 'on');
  const saved = first.window.localStorage.getItem('wifi-audit:draft:v1:A');
  const app = openApp(t, { setup(window) { window.localStorage.setItem('wifi-audit:draft:v1:A', saved); } });
  assert.match(app.byId('score-delta').textContent, /\+2 so với hồ sơ gốc/);
  app.change('remote-admin', 'on');
  app.change('remote-admin-strong-auth', 'on');
  assert.match(app.byId('last-status-change').textContent, /Không có tiêu chí đổi trạng thái/);
});


test('báo cáo tải từ kịch bản demo chứa baseline và việc còn lại', async t => {
  const { JSDOM } = require('jsdom');
  const app = openApp(t);
  app.change('wps', 'off');
  app.change('guest-isolation', 'on');
  app.byId('export-report').click();
  const dom = new JSDOM(await app.blobs[0].text());
  assert.match(dom.window.document.querySelector('.baseline-section').textContent, /\+2 so với hồ sơ gốc/);
  const ids = [...dom.window.document.querySelectorAll('.todo-list h3')].map(node => node.textContent.slice(0, 2));
  assert.deepEqual(ids, ['C1', 'C3', 'C6']);
  dom.window.close();
});


function prepareJsonImport(app, text, { size, failure = false } = {}) {
  app.window.FileReader = class {
    readAsText() {
      queueMicrotask(() => { this.result = text; failure ? this.onerror() : this.onload(); });
    }
  };
  const input = app.byId('import-config');
  Object.defineProperty(input, 'files', { configurable: true, value: [{ size: size ?? Buffer.byteLength(text) }] });
  input.dispatchEvent(new app.window.Event('change', { bubbles: true }));
  return new Promise(resolve => setImmediate(resolve));
}

test('xuất JSON lấy đúng cấu hình đang chỉnh và hồ sơ nguồn', async t => {
  const app = openApp(t);
  app.change('wps', 'off');
  app.change('guest-isolation', 'on');
  app.byId('export-config').click();
  const data = JSON.parse(await app.blobs[0].text());
  assert.equal(app.blobs[0].type, 'application/json;charset=utf-8');
  assert.equal(app.downloads[0].filename, 'cau-hinh-wifi-A.json');
  assert.equal(data.profileId, 'A');
  assert.equal(data.config.wps, false);
  assert.equal(data.config.guest.isolateLan, true);
  assert.equal(Object.hasOwn(data.config, 'firmware'), false);
});

test('nhập JSON hợp lệ chuyển hồ sơ, giữ baseline và dùng đúng firmware của hồ sơ', async t => {
  const app = openApp(t);
  app.selectProfile('C');
  app.change('firmware', 'outdated');
  app.byId('export-config').click();
  const json = await app.blobs[0].text();
  app.selectProfile('A');
  await prepareJsonImport(app, json);
  assert.equal(app.byId('score-profile').textContent, 'C');
  assert.equal(app.byId('firmware').value, 'outdated');
  assert.equal(app.firmwareDetails()['Mã bản ghi'], 'C-FW-CŨ');
  assert.equal(app.byId('import-config').getAttribute('aria-invalid'), 'false');
  assert.match(app.byId('json-message').textContent, /Đã nhập cấu hình JSON/);
  app.byId('reset').click();
  assert.equal(app.score(), '2/5');
});

test('xuất rồi nhập lại kịch bản A 3/6 phục hồi đúng bản nháp', async t => {
  const app = openApp(t);
  app.change('wps', 'off');
  app.change('guest-isolation', 'on');
  app.byId('export-config').click();
  const json = await app.blobs[0].text();
  app.byId('reset').click();
  await prepareJsonImport(app, json);
  assert.equal(app.score(), '3/6');
  assert.match(app.byId('score-delta').textContent, /\+2 so với hồ sơ gốc/);
  app.selectProfile('B');
  app.selectProfile('A');
  assert.equal(app.score(), '3/6');
});

test('JSON sai không thay đổi hồ sơ, biểu mẫu hoặc bản nháp đang dùng', async t => {
  const app = openApp(t);
  app.change('wps', 'off');
  const original = app.window.localStorage.getItem('wifi-audit:draft:v1:A');
  for (const text of ['{broken', '{}', '{"schemaVersion":1,"profileId":"D","config":{}}']) {
    await prepareJsonImport(app, text);
    assert.equal(app.score(), '2/6');
    assert.equal(app.byId('score-profile').textContent, 'A');
    assert.equal(app.window.localStorage.getItem('wifi-audit:draft:v1:A'), original);
    assert.equal(app.byId('import-config').getAttribute('aria-invalid'), 'true');
  }
});

test('lỗi trường lạ hiển thị bằng textContent và không thực thi HTML', async t => {
  const app = openApp(t);
  const key = '<img src=x onerror=alert(1)>';
  await prepareJsonImport(app, JSON.stringify({ schemaVersion: 1, profileId: 'A', config: {}, [key]: true }));
  assert.ok(app.byId('json-message').textContent.includes(key));
  assert.equal(app.byId('json-message').querySelector('img'), null);
  assert.equal(app.score(), '1/6');
});

test('file quá lớn và lỗi đọc file được báo bằng tiếng Việt', async t => {
  const app = openApp(t);
  await prepareJsonImport(app, '{}', { size: 65537 });
  assert.match(app.byId('json-message').textContent, /vượt giới hạn 64 KiB/);
  await prepareJsonImport(app, '{}', { failure: true });
  assert.match(app.byId('json-message').textContent, /Không đọc được tệp JSON/);
  assert.equal(app.score(), '1/6');
});


test('bàn phím mũi tên, Home/End chuyển và focus đúng hồ sơ', t => {
  const app = openApp(t);
  const press = (id, key) => app.window.document.querySelector('[data-profile="' + id + '"]')
    .dispatchEvent(new app.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  press('A', 'ArrowRight');
  assert.equal(app.score(), '6/6');
  assert.equal(app.window.document.activeElement.dataset.profile, 'B');
  press('B', 'End');
  assert.equal(app.score(), '2/5');
  press('C', 'Home');
  assert.equal(app.score(), '1/6');
  press('A', 'ArrowLeft');
  assert.equal(app.window.document.activeElement.dataset.profile, 'C');
});

test('trạng thái có biểu tượng ẩn khỏi trình đọc màn hình và nhãn chữ vẫn đầy đủ', t => {
  const app = openApp(t);
  const icons = app.window.WifiAudit.STATUS_ICONS;
  const check = () => {
    for (const badge of app.window.document.querySelectorAll('[data-status-for]')) {
      const icon = badge.querySelector('.status-icon');
      assert.equal(icon.getAttribute('aria-hidden'), 'true');
      assert.equal(icon.textContent, icons[badge.dataset.status]);
      assert.ok(badge.textContent.includes(app.window.WifiAudit.LABELS[badge.dataset.status]));
    }
  };
  check(); app.selectProfile('B'); check(); app.selectProfile('C'); check();
});

test('skip link và nhãn điều khiển đầy đủ cho điều hướng bàn phím', t => {
  const app = openApp(t);
  assert.equal(app.window.document.querySelector('.skip-link').getAttribute('href'), '#main-content');
  assert.equal(app.byId('main-content').getAttribute('tabindex'), '-1');
  for (const control of app.window.document.querySelectorAll('select, input')) assert.ok(control.labels.length > 0);
});
