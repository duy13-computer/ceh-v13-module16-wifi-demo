# Demo kiểm tra cấu hình Wi-Fi gia đình

Minh họa phần **Wireless Attack Countermeasures** trong CEH AI v13 Module 16. Chọn một hồ sơ bộ định tuyến giả lập, chỉnh thông số và xem từng tiêu chí được chấm lại. Kết quả cho biết mức đáp ứng bảng kiểm của đề tài và việc cần xác minh thêm.

## Chạy demo

1. Giải nén tệp ZIP nếu tải bản đóng gói.
2. Mở `index.html` bằng trình duyệt. Giữ các tệp HTML, CSS và JavaScript trong cùng thư mục.
3. Chọn hồ sơ **A**, **B** hoặc **C**, rồi chỉnh các lựa chọn trên biểu mẫu để quan sát kết quả.

Demo chạy cục bộ từ tệp HTML và dùng dữ liệu giả lập. Có thể rút mạng và chạy trực tiếp trong buổi thuyết trình.

## Kịch bản 3 phút 40 giây

Tại slide 6 của bài PowerPoint chính, chuyển sang cửa sổ trình duyệt đã mở sẵn demo. Sau khi trình diễn, quay lại slide 10.

| Thời gian | Thao tác và lời giải thích |
| --- | --- |
| 0:00–0:25 | Chọn **A**. Giới thiệu cách tính và chỉ vào kết quả ban đầu **1/6**. |
| 0:25–1:35 | Đổi WPS sang **Tắt**, kết quả thành **2/6**. Bật cách ly mạng khách khỏi LAN chính, kết quả thành **3/6**. Chỉ ra tiêu chí firmware vẫn **Chưa xác minh**. |
| 1:35–2:30 | Mở **B** và xem kết quả **6/6**. Minh họa bằng chứng firmware giả lập **B-FW** tại mốc T0 với thiết bị `TB-MẪU-B`, phần cứng `MẪU-R1` và phiên bản `MẪU-03` khớp bản ghi đối chiếu. |
| 2:30–3:15 | Mở **C** và xem **2/5**. Giải thích lý do giữ WPA2-Personal (AES/CCMP) cho thiết bị cũ. Vì mạng khách tắt, C4 là **Không áp dụng**. |
| 3:15–3:40 | Nhắc lại thứ tự ưu tiên ở A. Tắt tính năng ghép nối WPS, hạn chế khách truy cập LAN chính, rồi bổ sung bằng chứng firmware. |

## Bảng kiểm

| Mã | Tiêu chí | Điều kiện đạt |
| --- | --- | --- |
| C1 | Chế độ bảo mật Wi-Fi | Chọn WPA3-Personal cho mạng gia đình trong cấu hình mục tiêu. |
| C2 | WPS | Tắt tính năng ghép nối nhanh WPS. |
| C3 | PMF | Đặt bảo vệ khung quản lý ở chế độ bắt buộc. |
| C4 | Cách ly mạng khách khỏi LAN chính | Mạng khách bật và thiết lập chặn khách truy cập LAN chính. Nếu đã xác nhận mạng khách tắt, ghi **Không áp dụng**. |
| C5 | Quản trị từ xa qua Internet | Tắt đường quản trị từ Internet. |
| C6 | Xác minh firmware | Có thông tin thiết bị, phiên bản phần cứng, phiên bản đang dùng, nguồn đối chiếu và mốc kiểm tra. Kết quả đối chiếu xác nhận phiên bản phù hợp và thiết bị còn được hỗ trợ tại mốc đó. |

Mỗi tiêu chí áp dụng mang cùng trọng số. Điểm bằng số tiêu chí **Đạt** chia cho số tiêu chí áp dụng. **Chưa xác minh** vẫn tính vào mẫu số. Chỉ loại **Không áp dụng** khỏi mẫu số. Điểm dùng để giải thích các quyết định cấu hình trong tình huống của đề tài. Trường hợp còn dùng WPA2-Personal (AES/CCMP) có thể ghi nhận lý do tương thích để rà soát thêm.

## Cấu trúc mã nguồn

| Tệp | Vai trò |
| --- | --- |
| `index.html` | Biểu mẫu và khu vực hiển thị kết quả. |
| `styles.css` | Bố cục, màu trạng thái và hiển thị trên màn hình nhỏ. |
| `main.js` | Đồng bộ lựa chọn của người dùng với bảng kết quả. |
| `audit.js` | Chấm từng tiêu chí và tính tổng theo bảng kiểm. |
| `profiles.js` | Ba hồ sơ mô phỏng A, B, C và bản ghi B-FW. |
| `tests/audit.test.cjs` | Kiểm tra điểm chuẩn và các trường hợp thiếu dữ liệu hoặc không áp dụng. |

Node.js dùng để chạy kiểm thử mã chấm.

```sh
node --test tests/audit.test.cjs
```

## Tài liệu tham khảo

- EC-Council, *CEH v13 Module 16 — Hacking Wireless Networks*, mục tiêu 05 *Wireless Attack Countermeasures*, trang 124–129 của tệp PDF học liệu.
- Federal Trade Commission, hướng dẫn cho gia đình về chế độ bảo mật, quản trị, cập nhật firmware và WPS. [How To Secure Your Home Wi-Fi Network](https://consumer.ftc.gov/articles/how-secure-your-home-wi-fi-network)
- Apple, các lựa chọn WPA3-Personal, chế độ chuyển tiếp và WPA2-Personal (AES) khi cần tương thích. [Recommended settings for Wi-Fi routers and access points](https://support.apple.com/en-us/102766)
- ASUS, ví dụ về phạm vi cấu hình khách vào mạng nội bộ trên bộ định tuyến gia đình. [Guest Network — Access Intranet](https://www.asus.com/uk/support/faq/1009857/)
- HPE Aruba Networking, yêu cầu bảo vệ khung quản lý trong các chế độ WPA3-Personal. [WPA3-Personal](https://arubanetworking.hpe.com/techdocs/aos/wifi-design-deploy/security/modes/wpa3-personal/)
