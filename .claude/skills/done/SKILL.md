---
name: done
description: Ghi nhận kết quả quiz đã làm trên web app (dán dòng JSON từ nút "Copy kết quả"), cập nhật knowledge, roadmap và journal. Dùng ngay sau khi làm xong một bài trên điện thoại.
---

Đọc `docs/DESIGN.md` mục 2, 5.1, 5.3, 5.5 nếu chưa đọc trong phiên này.

Tham số: `<kết quả>` — người dùng dán 1 dòng JSON theo schema mục 5.3.

Toàn bộ sổ sách (chống dán trùng, tính SRS, ghi journal, cập nhật roadmap) nằm ở `scripts/record-attempt.mjs`. Việc của bạn ở đây chỉ là **viết nội dung** (note knowledge mới, mục "Hay nhầm") và gọi script đúng lúc.

## Các bước

1. **Chạy script** với đúng dòng JSON người dùng dán:
   ```
   node scripts/record-attempt.mjs '<json>'
   ```
   Đọc kết quả JSON in ra ở stdout (thành công) hoặc stderr (lỗi, exit code 1).

2. **Xử lý theo kết quả**:
   - `{"ok":true,"duplicate":true,...}` → kết quả này đã ghi nhận trước đó rồi. Báo người dùng và **dừng lại**, không làm gì thêm (không build, không commit).
   - Lỗi có `missingConcepts: [...]` → với mỗi concept trong danh sách, viết **note mới** `knowledge/<concept-id>.md` theo schema 5.1: `id`, `title`, `courses: [<course>]`, `source` (trỏ mã syllabus trong `sources/<course>/syllabus.md`), `status: new`, `learned: null`, `next_review: null`, `interval: 0`, `mistakes: 0`, `tags` phù hợp, cùng phần thân — **Tóm tắt**, **Ví dụ** (ưu tiên ví dụ công việc thật của người dùng), **Hay nhầm** (nếu concept đó có mặt trong `wrong[]` của kết quả — dựa vào `picked`), **Liên quan** (`[[wikilink]]` tới note gần nghĩa nếu có). Đọc `courses/<course>/days/day-NN.json` để biết đúng nội dung bài đã học. Sau khi tạo xong tất cả note còn thiếu, **chạy lại bước 1** với cùng dòng JSON.
   - Lỗi khác (JSON sai schema, không tìm thấy course/day...) → báo lỗi cho người dùng, hỏi dán lại đúng dòng "Copy kết quả".
   - `{"ok":true,"duplicate":false,"updatedConcepts":[...],...}` → thành công, sang bước 3.

3. **Bổ sung nội dung** cho các concept trả lời sai (`correct:false` trong `updatedConcepts`): mở `knowledge/<concept-id>.md`, cập nhật mục "Hay nhầm" mô tả đúng lỗi vừa mắc (dựa vào `picked` trong kết quả gốc). Chỉ sửa phần thân (prose) — **không** sửa tay các field mà script đã ghi (`interval`, `status`, `mistakes`, `next_review`, `learned`, `courses`).

4. Nếu người dùng có ghi chú thêm trong yêu cầu (ví dụ nhận xét về bài học), nối thêm 1 dòng vào cuối `journal/<YYYY-MM-DD theo giờ VN>.md` mà script vừa ghi.

5. Chạy `node scripts/build.mjs`. **Commit + push lên nhánh deploy (`config.json` → `git.deployBranch`, hiện là `dep`)**: `learn(<course>): day NN – done, score S/T`.

6. Trả lời ngắn: điểm số, số khái niệm đã cập nhật, nếu điểm dưới 60% thì nhắc là `/today` lần sau sẽ đề xuất ôn lại (script `next-day.mjs` tự bỏ qua các lần làm bài ôn tập khi xét điểm thấp).
