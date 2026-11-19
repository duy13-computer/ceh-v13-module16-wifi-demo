# Wi-Fi Configuration Audit Demo

**Ứng dụng mô phỏng đánh giá cấu hình Wi-Fi gia đình** phục vụ đồ án An ninh mạng, minh họa nội dung *Wireless Attack Countermeasures* trong **CEH AI v13 — Module 16: Hacking Wireless Networks**.

Ứng dụng cho phép chọn hồ sơ router mẫu, thay đổi cấu hình, theo dõi kết quả đánh giá và xuất báo cáo độc lập để lưu hoặc trình bày. Toàn bộ xử lý diễn ra trên trình duyệt và có thể sử dụng ngoại tuyến.

> **Phạm vi:** Dữ liệu router và bằng chứng firmware đều là mô phỏng. Điểm số biểu thị mức đáp ứng bảng kiểm của đề tài, không phải chứng nhận an toàn cho một mạng thực tế.

## 1. Mục tiêu

- Minh họa ảnh hưởng của từng lựa chọn cấu hình đến kết quả đánh giá.
- Phân biệt cấu hình cần cải thiện, dữ liệu chưa xác minh và tiêu chí không áp dụng.
- So sánh cấu hình ban đầu, cấu hình mục tiêu và phương án tương thích thiết bị cũ.
- Lưu lại kết quả tại thời điểm đánh giá bằng báo cáo có thể xem và in độc lập.

## 2. Chức năng

| Chức năng | Mô tả |
| --- | --- |
| Chọn hồ sơ | Ba tình huống mẫu A, B và C với thông số được thiết lập sẵn. |
| Đánh giá tức thời | Cập nhật điểm, trạng thái và giải thích ngay khi thay đổi lựa chọn. |
| Quản lý tiêu chí áp dụng | Loại tiêu chí cách ly mạng khách khỏi mẫu số khi xác nhận mạng khách đã tắt. |
| Xem bằng chứng firmware | Hiển thị thiết bị, phần cứng, phiên bản, nguồn và mốc đối chiếu mô phỏng. |
| So sánh hồ sơ | Đối chiếu kết quả của ba hồ sơ gốc trong cùng một bảng. |
| Khôi phục hồ sơ | Đưa các lựa chọn về giá trị ban đầu của hồ sơ đang xem. |
| **Xuất báo cáo HTML** | Tải báo cáo từ cấu hình hiện tại, gồm điểm tổng, kết quả từng tiêu chí và bằng chứng firmware. Có thể in hoặc lưu thành PDF qua trình duyệt. |

## 3. Công nghệ và yêu cầu

| Thành phần | Công nghệ / yêu cầu |
| --- | --- |
| Giao diện | HTML5, CSS3; bố cục thích ứng với kích thước màn hình. |
| Xử lý | JavaScript thuần; không cần thư viện bên ngoài. |
| Chạy ứng dụng | Trình duyệt hiện đại có bật JavaScript và cho phép tải tệp. |
| Chạy kiểm thử | Node.js 18 trở lên. |
| Máy chủ và cơ sở dữ liệu | Không yêu cầu. |

## 4. Hướng dẫn sử dụng

### Chạy ứng dụng

1. Giải nén nếu sử dụng bản đóng gói ZIP.
2. Mở `index.html` bằng trình duyệt; giữ nguyên vị trí tương đối của các tệp đi kèm.
3. Chọn hồ sơ **A**, **B** hoặc **C**.
4. Thay đổi thông số và quan sát trạng thái từng tiêu chí cùng điểm tổng.
5. Chọn **Khôi phục hồ sơ** để quay về cấu hình gốc của hồ sơ đang mở.

Ứng dụng không cần cài gói phụ thuộc hoặc kết nối Internet. Các thay đổi trên biểu mẫu không được lưu sau khi tải lại trang hoặc chuyển hồ sơ.

### Xuất báo cáo

1. Chọn hồ sơ và hoàn tất các thay đổi cần ghi nhận.
2. Nhấn **Xuất báo cáo HTML** trong khu vực kết quả.
3. Mở tệp `bao-cao-wifi-<hồ-sơ>-<YYYY-MM-DD>.html` vừa tải xuống.
4. Dùng chức năng **In** của trình duyệt (`Ctrl+P` trên Windows hoặc `Cmd+P` trên macOS) để in hoặc chọn **Lưu thành PDF**.

Báo cáo chứa cấu hình **đang hiển thị**, bao gồm các thay đổi so với hồ sơ gốc. Tệp có sẵn định dạng trang in A4 ngang và không phụ thuộc vào các tệp mã nguồn. Ngày trong tên tệp và thời điểm xuất sử dụng múi giờ Việt Nam (UTC+7), lấy từ đồng hồ thiết bị.

Ví dụ: ở hồ sơ A, tắt WPS và bật cách ly mạng khách rồi xuất báo cáo; kết quả lưu trong tệp là **3/6**.

## 5. Phương pháp đánh giá

### Bảng kiểm

| Mã | Tiêu chí | Điều kiện đạt theo cấu hình mục tiêu |
| --- | --- | --- |
| C1 | Chế độ bảo mật Wi-Fi | WPA3-Personal. |
| C2 | Ghép nối nhanh WPS | WPS tắt. |
| C3 | Bảo vệ khung quản lý PMF | PMF ở chế độ bắt buộc. |
| C4 | Cách ly mạng khách khỏi LAN chính | Mạng khách bật và cách ly bật. Nếu xác nhận mạng khách tắt, tiêu chí không áp dụng. |
| C5 | Quản trị từ xa qua Internet | Quản trị qua Internet tắt. |
| C6 | Bằng chứng firmware | Có mã bản ghi, thiết bị, phiên bản phần cứng, phiên bản đang dùng, nguồn và mốc đối chiếu; thiết bị còn hỗ trợ, phiên bản khớp bản đối chiếu và trạng thái cập nhật không mâu thuẫn. |

### Trạng thái và cách tính điểm

| Trạng thái | Ý nghĩa | Tính vào mẫu số |
| --- | --- | --- |
| Đạt | Đáp ứng điều kiện của tiêu chí. | Có |
| Cần cải thiện | Có dữ liệu xác định cấu hình chưa đạt mục tiêu hoặc firmware cần xử lý. | Có |
| Chưa xác minh | Thiếu thông tin, dữ liệu không hợp lệ hoặc bằng chứng mâu thuẫn. | Có |
| Không áp dụng | Mạng khách được xác nhận đã tắt; chỉ áp dụng cho C4. | Không |

```text
Điểm = Số tiêu chí Đạt / (6 − Số tiêu chí Không áp dụng)
```

Mỗi tiêu chí áp dụng có cùng trọng số. WPA2-Personal (AES/CCMP) và chế độ chuyển tiếp được ghi nhận là cần cải thiện so với mục tiêu WPA3 của bài; lý do tương thích cần được giải thích trong phần trình bày.

### Hồ sơ mẫu

| Hồ sơ | Tình huống | Đạt | Cần cải thiện | Chưa xác minh | Không áp dụng | Điểm |
| --- | --- | --- | --- | --- | --- | --- |
| A | Cấu hình ban đầu, WPS bật, chưa cách ly khách, thiếu bằng chứng firmware. | 1 | 4 | 1 | 0 | **1/6** |
| B | Cấu hình mục tiêu, giả định thiết bị tương thích WPA3, có bằng chứng B-FW. | 6 | 0 | 0 | 0 | **6/6** |
| C | Giữ WPA2 cho thiết bị cũ, tắt mạng khách, thiếu bằng chứng firmware. | 2 | 2 | 1 | 1 | **2/5** |

## 6. Cấu trúc mã nguồn

```text
doan/
├── index.html              # Giao diện ứng dụng
├── styles.css              # Định dạng và bố cục thích ứng
├── audit.js                # Đánh giá tiêu chí, tổng hợp điểm
├── profiles.js             # Hồ sơ A/B/C và dữ liệu firmware mẫu
├── report.js               # Tạo báo cáo HTML độc lập và tên tệp
├── main.js                 # Sự kiện giao diện, hiển thị và tải báo cáo
├── tests/
│   ├── audit.test.cjs       # Kiểm thử logic đánh giá
│   └── report.test.cjs      # Kiểm thử nội dung và an toàn đầu ra báo cáo
├── README.md
└── ceh-v13-module16-wifi-demo/  # Bản sao chạy độc lập của ứng dụng
```

Luồng xử lý: `profiles.js` cung cấp cấu hình mẫu → `main.js` đọc lựa chọn → `audit.js` đánh giá → giao diện hiển thị kết quả. Khi xuất, `report.js` đánh giá lại cấu hình hiện tại và tạo tài liệu HTML; `main.js` thực hiện tải tệp.

Mã nguồn được duy trì tại thư mục gốc. Thư mục `ceh-v13-module16-wifi-demo/` chứa bản sao cùng chức năng để sử dụng độc lập; khi cập nhật cần đồng bộ các tệp tương ứng.

## 7. Kiểm thử

Chạy tại thư mục chứa `index.html`:

```sh
node --test tests/audit.test.cjs tests/report.test.cjs
```

Bộ kiểm thử kiểm tra các nhóm hành vi:

- Kết quả chuẩn của hồ sơ A/B/C và việc loại tiêu chí không áp dụng khỏi mẫu số.
- Bằng chứng firmware thiếu, hết hỗ trợ, có cập nhật hoặc mâu thuẫn.
- Chỉnh bản sao cấu hình mà không làm thay đổi hồ sơ gốc.
- Báo cáo phản ánh cấu hình đã chỉnh, điểm số, bằng chứng và ngày xuất theo giờ Việt Nam.
- Escape dữ liệu trước khi đưa vào HTML và giới hạn ký tự trong tên tệp.

Kiểm tra thao tác trên trình duyệt: mở hồ sơ A → tắt WPS → bật cách ly khách → xác nhận **3/6** → xuất báo cáo → mở tệp và đối chiếu điểm cùng các lựa chọn vừa thay đổi.

## 8. Kịch bản trình diễn — 3 phút 40 giây

| Thời gian | Thao tác | Nội dung trình bày |
| --- | --- | --- |
| 0:00–0:25 | Mở hồ sơ A. | Giới thiệu bảng kiểm và kết quả ban đầu **1/6**. |
| 0:25–1:25 | Tắt WPS; bật cách ly khách. | Điểm lần lượt thành **2/6**, **3/6**; firmware vẫn chưa xác minh. |
| 1:25–2:10 | Chuyển sang B, mở bằng chứng firmware. | Giải thích **6/6** và bản ghi giả lập B-FW tại T0. |
| 2:10–2:55 | Chuyển sang C. | Giải thích phương án tương thích, điểm **2/5** và C4 không áp dụng. |
| 2:55–3:25 | Nhấn **Xuất báo cáo HTML**, mở tệp vừa tải. | Minh họa lưu kết quả và khả năng in thành PDF. |
| 3:25–3:40 | Kết thúc demo. | Nhắc lại phạm vi mô phỏng và nhu cầu xác minh cấu hình thực tế. |

## 9. Giới hạn

- Không quét mạng Wi-Fi, kết nối router hoặc thực hiện kiểm thử xâm nhập.
- Không tự truy vấn nhà sản xuất để kiểm tra firmware; nguồn và mốc T0 trong hồ sơ là giả định.
- Các trường cấu hình có thể chỉnh độc lập để minh họa; ứng dụng chưa kiểm tra ràng buộc giữa chế độ bảo mật, PMF và khả năng thiết bị.
- Báo cáo là bản chụp kết quả tại thời điểm xuất; không dùng để nhập lại cấu hình hoặc thay thế việc xác minh trên thiết bị.
- PowerPoint và PDF học liệu được nhắc đến trong đề tài không nằm trong bộ mã nguồn này.

## 10. Tài liệu tham khảo

- **EC-Council:** *CEH v13 Module 16 — Hacking Wireless Networks*, mục tiêu 05 *Wireless Attack Countermeasures*. Tài liệu học liệu của đề tài.
- **Federal Trade Commission:** [How To Secure Your Home Wi-Fi Network](https://consumer.ftc.gov/articles/how-secure-your-home-wi-fi-network).
- **Apple:** [Recommended settings for Wi-Fi routers and access points](https://support.apple.com/en-us/102766).
- **ASUS:** [Guest Network — Access Intranet](https://www.asus.com/uk/support/faq/1009857/).
- **HPE Aruba Networking:** [WPA3-Personal](https://arubanetworking.hpe.com/techdocs/aos/wifi-design-deploy/security/modes/wpa3-personal/).
