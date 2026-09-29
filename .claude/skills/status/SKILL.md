---
name: status
description: Xem tiến độ học - từng khoá đã học tới đâu, note nào đến hạn ôn, khái niệm nào đang yếu nhất. Dùng khi người dùng muốn biết tổng quan thay vì học bài mới.
---

Chỉ đọc dữ liệu, không sửa/commit gì.

## Các bước

1. Chạy `node scripts/build.mjs` để `site/data/` mới nhất, rồi đọc `site/data/courses.json` và `site/data/knowledge.json`.

2. **Tiến độ từng khoá**: với mỗi course trong `courses.json`, tính `% done = số hàng roadmap status "done" / tổng số hàng`. Nêu ngày tiếp theo (`node scripts/next-day.mjs <course-id>` nếu cần chi tiết `suggestRetry`).

3. **Note đến hạn ôn**: chạy `node scripts/select-review.mjs` — liệt kê theo từng khoá, kèm số note.

4. **Khái niệm yếu nhất**: từ `knowledge.json`, sắp xếp theo `mistakes` giảm dần, lấy top 5 (bỏ qua note `mistakes: 0`).

5. Trình bày ngắn gọn theo 3 mục trên, không cần văn xuôi dài dòng — bảng hoặc gạch đầu dòng là đủ.
