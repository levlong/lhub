---
name: review
description: Sinh một bài ôn tập từ các note knowledge đến hạn ôn và các lỗi hay sai. Dùng khi người dùng muốn ôn lại thay vì học bài mới.
---

Đọc `docs/DESIGN.md` mục 2, 5.1, 5.2 nếu chưa đọc trong phiên này.

Tham số: `[course-id]` (tuỳ chọn — nếu có thì chỉ ôn note của khoá đó).

## Các bước

1. **Lấy note đến hạn**: đọc toàn bộ `knowledge/*.md` (hoặc `site/data/knowledge.json` nếu đã build và còn mới), lọc các note có `next_review <= hôm nay`. Nếu có `course-id`, chỉ giữ note có khoá đó trong `courses`. Sắp xếp ưu tiên `mistakes` cao trước.
   - Nếu không có note nào đến hạn, báo cho người dùng và dừng lại — không tạo bài ôn rỗng.

2. **Sinh bài ôn** theo schema mục 5.2, lưu tại `courses/<course-id>/days/review-YYYY-MM-DD.json` (dùng ngày hôm nay):
   - `"day": "review-YYYY-MM-DD"` (chuỗi, không phải số).
   - `"title"`: ví dụ "Ôn tập ngày YYYY-MM-DD".
   - `"concepts"`: danh sách id các note đến hạn đã chọn ở bước 1.
   - `sections`: 1 mục `text` tóm tắt lại các note đến hạn (dùng nội dung "Tóm tắt" đã có trong từng note, không bịa thêm).
   - `quiz`: trộn câu hỏi liên quan tới các note đó — có thể viết câu hỏi mới bám sát "Hay nhầm" của note, hoặc tái sử dụng dạng câu hỏi từ bài học gốc (`source` trong note trỏ tới đâu thì bám theo đó). Đáp án đúng luôn ở `options[0]`.
   - Nếu ôn nhiều khoá cùng lúc (không truyền `course-id`), tạo riêng 1 file ôn tập cho mỗi khoá có note đến hạn (vì mỗi file `days/` thuộc về đúng 1 `course`).

3. Chạy `node scripts/build.mjs`. **Commit + push**: `learn(<course-id>): review YYYY-MM-DD`.

4. Trả lời ngắn: số note được ôn, tên bài ôn, nhắc mở web app.

## Sau khi làm bài ôn

Kết quả bài ôn cũng dán vào `/done` như bài học thường — `/done` tự cập nhật `interval`/`next_review` cho từng note dựa trên đúng/sai, không cần xử lý gì khác ở đây.
