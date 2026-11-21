const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DATA, PRIORITIES, buildTodo } = require('../recommendations.js');
const profiles = require('../profiles.js');
const firmware = require('../firmware-data.js');
const improve = { ...profiles.A, remoteAdmin: true, firmware: firmware.A.outdated };

for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']) {
  test(id + ' có lý do, cách khắc phục và ưu tiên cho cả hai trạng thái', () => {
    for (const [config, status] of [[improve, 'improve'], [{}, 'unknown']]) {
      const todo = buildTodo(config).find(item => item.id === id);
      assert.equal(todo.status, status);
      assert.equal(todo.risk, DATA[id][status].risk);
      assert.equal(todo.action, DATA[id][status].action);
      assert.ok(todo.risk.length > 20);
      assert.ok(todo.action.length > 20);
      assert.ok(Object.hasOwn(PRIORITIES, todo.priority));
    }
  });
}

test('dữ liệu khuyến nghị được đóng băng ở mọi cấp', () => {
  assert.ok(Object.isFrozen(DATA));
  assert.ok(Object.isFrozen(PRIORITIES));
  for (const variants of Object.values(DATA)) {
    assert.ok(Object.isFrozen(variants));
    for (const entry of Object.values(variants)) assert.ok(Object.isFrozen(entry));
  }
});

test('việc cần làm sắp theo ưu tiên, cùng ưu tiên theo mã tiêu chí', () => {
  assert.deepEqual(buildTodo(improve).map(item => item.id), ['C2', 'C4', 'C5', 'C6', 'C1', 'C3']);
  assert.deepEqual(buildTodo(profiles.A).map(item => item.id), ['C2', 'C4', 'C1', 'C3', 'C6']);
  assert.deepEqual(buildTodo().map(item => item.id), ['C5', 'C1', 'C2', 'C3', 'C4', 'C6']);
});

test('không tạo việc cho tiêu chí đạt hoặc không áp dụng', () => {
  assert.deepEqual(buildTodo(profiles.B), []);
  assert.deepEqual(buildTodo(profiles.C).map(item => item.id), ['C1', 'C3', 'C6']);
});

test('dựng và chỉnh danh sách việc không sửa dữ liệu gốc', () => {
  const before = JSON.stringify(profiles);
  const todo = buildTodo(profiles.A);
  todo[0].action = 'đã chỉnh bản sao';
  assert.notEqual(buildTodo(profiles.A)[0].action, todo[0].action);
  assert.equal(JSON.stringify(profiles), before);
});
