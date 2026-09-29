---
name: done
description: Ghi nhận kết quả quiz đã làm trên web app (dán dòng JSON từ nút "Copy kết quả"), cập nhật knowledge, roadmap và journal. Dùng ngay sau khi làm xong một bài trên điện thoại.
---

Đọc `docs/DESIGN.md` mục 2, 5.1, 5.3 nếu chưa đọc trong phiên này.

Tham số: `<kết quả>` — người dùng dán 1 dòng JSON theo schema mục 5.3, dạng:
`{"ts":"...","course":"...","day":N,"score":S,"total":T,"wrong":[{"q":"...","picked":"...","concept":"..."}]}`

## Các bước

1. **Parse** dòng JSON. Nếu không parse được hoặc thiếu field (`ts`, `course`, `day`, `score`, `total`, `wrong`), hỏi người dùng dán lại nguyên dòng từ nút "Copy kết quả".

2. **Append** nguyên dòng vào `journal/attempts.jsonl` (thêm dòng mới ở cuối file). Không sửa, không xoá bất kỳ dòng nào đã có (nguyên tắc 3: append-only).

3. **Đọc bài đã học**: `courses/<course>/days/day-NN.json` (hoặc file `review-YYYY-MM-DD.json` nếu là bài ôn) tương ứng với `day` trong kết quả, để lấy danh sách `concepts` đầy đủ và nội dung quiz.

4. **Cập nhật từng note trong `knowledge/`** cho mỗi id trong `concepts`:
   - Tính đúng/sai: một concept coi là **sai** nếu có ít nhất 1 mục trong `wrong[]` với `concept` trùng id đó; ngược lại là **đúng**.
   - Nếu note `knowledge/<concept-id>.md` **chưa tồn tại**: tạo mới theo schema 5.1 — `id`, `title` (suy từ tên khái niệm), `courses: [<course>]`, `source` (trỏ mã syllabus tương ứng trong `sources/<course>/syllabus.md`), `status: learning`, `learned: <ts, dạng YYYY-MM-DD>`, `tags` phù hợp. Viết **Tóm tắt**, **Ví dụ** (ưu tiên ví dụ công việc thật của người dùng), **Hay nhầm** (nếu sai, dựa trên `picked` trong `wrong[]`), **Liên quan** (`[[wikilink]]` tới note gần nghĩa nếu có).
   - Nếu note **đã tồn tại**: thêm `<course>` vào mảng `courses` nếu chưa có; không tạo note trùng.
   - **Nếu đúng**: interval đi theo chuỗi `1 → 3 → 7 → 14 → 30` (lấy bước kế tiếp trong chuỗi so với interval hiện tại; nếu đã ở 30 thì giữ 30). `next_review = hôm nay + interval ngày`. Nếu interval vừa đạt 30, đặt `status: mastered`; ngược lại `status: learning`.
   - **Nếu sai**: `interval: 1`, `next_review = hôm nay + 1 ngày`, `mistakes += 1`, `status: learning` (kể cả nếu trước đó là `mastered`). Thêm hoặc cập nhật mục "Hay nhầm" trong note, mô tả đúng lỗi vừa mắc (dựa vào `picked`).

5. **Ghi `journal/YYYY-MM-DD.md`** (tạo mới nếu ngày hôm nay chưa có, nối thêm nếu đã có): tên khoá, ngày, tên bài, điểm số, danh sách câu sai (id + concept), ghi chú của người dùng nếu họ có nói gì thêm trong yêu cầu.

6. **Cập nhật `courses/<course>/roadmap.md`**: đổi trạng thái hàng ứng với `day` từ `todo`/`review` thành `done` (ghi nhận đã học, bất kể điểm cao hay thấp — việc đề xuất học lại khi điểm thấp do `/today` xử lý ở lần chạy sau, dựa vào `attempts.jsonl`).

7. Chạy `node scripts/build.mjs`. **Commit + push lên nhánh `dep`** (nội dung học hằng ngày lên web ngay, xem README mục "Nhánh git"): `learn(<course>): day NN – done, score S/T`.

8. Trả lời ngắn: điểm số, số khái niệm đã cập nhật, nếu điểm dưới 60% thì nhắc là `/today` lần sau sẽ đề xuất ôn lại.
