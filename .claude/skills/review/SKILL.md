---
name: review
description: Sinh một bài ôn tập từ các note knowledge đến hạn ôn và các lỗi hay sai. Dùng khi người dùng muốn ôn lại thay vì học bài mới.
---

Đọc `docs/DESIGN.md` mục 2, 5.1, 5.2 nếu chưa đọc trong phiên này.

Tham số: `[course-id]` (tuỳ chọn — nếu có thì chỉ ôn note của khoá đó).

## Các bước

1. Chạy `node scripts/build.mjs` (để `site/data/knowledge.json` mới nhất), rồi:
   ```
   node scripts/select-review.mjs [course-id]
   ```
   Kết quả là mảng, mỗi phần tử 1 khoá cần ôn hôm nay: `{ course, date, file, alreadyExists, notes: [{id, title, mistakes, next_review}] }`. Note nào thuộc nhiều khoá đã được script gán về đúng 1 khoá — không hiện trùng ở 2 nơi. Danh sách đã cap theo `quiz_size` của khoá đó, ưu tiên `mistakes` cao.
   - Mảng rỗng → báo người dùng không có note nào đến hạn hôm nay, **dừng lại**, không tạo bài ôn rỗng.

2. Với mỗi khoá trong kết quả:
   - `alreadyExists: true` → bài ôn hôm nay của khoá này đã có rồi (`file`). **Không ghi đè.** Báo người dùng, bỏ qua khoá này.
   - Ngược lại → viết `courses/<course>/days/<file>.json` theo schema mục 5.2:
     - `"day"`: đúng bằng `<file>` bỏ đuôi `.json` (dạng `review-YYYY-MM-DD`).
     - `"concepts"`: đúng danh sách id trong `notes`.
     - `sections`: 1 mục `text` tóm tắt lại (dùng nguyên nội dung "Tóm tắt" đã có trong từng note, không bịa thêm).
     - `quiz`: 1 câu cho mỗi note trong danh sách (bám theo "Hay nhầm" của note nếu có, hoặc dạng câu hỏi gốc trong bài học mà `source` trỏ tới). Đáp án đúng luôn ở `options[0]`.

3. Chạy `node scripts/validate.mjs courses/<course>/days/<file>.json` cho từng file vừa viết, rồi `node scripts/build.mjs`. **Commit + push lên nhánh deploy (`config.json` → `git.deployBranch`, hiện là `dep`)**: `learn(<course-id>): review YYYY-MM-DD`.

4. Trả lời ngắn: mỗi khoá ôn bao nhiêu note, tên bài ôn, nhắc mở web app.

## Sau khi làm bài ôn

Kết quả bài ôn cũng dán vào `/done` như bài học thường — `scripts/record-attempt.mjs` tự nhận diện `day` dạng `review-YYYY-MM-DD` và bỏ qua bước cập nhật roadmap (không có hàng tương ứng), chỉ cập nhật SRS cho các note đã ôn.
