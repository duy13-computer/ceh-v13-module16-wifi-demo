# Changelog

## 2026-11-21 — Đợt 2: độ tin cậy

- Thêm config-json.js: xuất/nhập JSON schema v1, kiểm tra kiểu/enum/trường bắt buộc, từ chối trường lạ và giới hạn 64 KiB. File sai giữ nguyên cấu hình và bản nháp; thông báo tiếng Việt qua textContent.
- Thêm Playwright devDependency, runner Chromium headless và npm test:e2e tách khỏi npm test. Kiểm tra file://, báo cáo tải thật, localStorage và round-trip JSON.
- Thêm GitHub Actions cho push/pull request: unit/DOM và E2E Chromium, Node.js 24.
- Cải thiện skip link, phím chọn hồ sơ, focus, biểu tượng/chữ trạng thái; theme sáng/tối và giảm chuyển động. Thêm axe-core và kiểm tra tương phản tự động cho ứng dụng/báo cáo.
- Cập nhật README và yêu cầu môi trường kiểm thử Node.js 20 trở lên.
- Kết quả tại máy: **84/84 unit/DOM + 8/8 E2E**; giữ điểm gốc **A 1/6, B 6/6, C 2/5**. Workflow chưa chạy trên GitHub trước khi push.

## 2026-11-21 — Đợt 1: trình diễn

- Khuyến nghị C1–C6 và danh sách việc theo ưu tiên dùng chung cho giao diện/báo cáo.
- What-if so baseline, tiêu chí vừa đổi trạng thái, gợi ý thay đổi tối thiểu.
- Báo cáo có baseline, việc cần làm và CSS in; **67/67 unit/DOM**.
