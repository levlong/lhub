# Learning Hub — CLAUDE.md

Bản thiết kế đầy đủ: [`docs/DESIGN.md`](docs/DESIGN.md). Đọc file đó trước khi làm bất cứ việc gì liên quan tới kiến trúc, schema, hoặc luồng `/new-course` · `/today` · `/done` · `/review`. Nếu có mâu thuẫn hoặc thiếu thông tin, hỏi người dùng — không tự đoán.

## Nguyên tắc bắt buộc (chi tiết ở mục 2 của DESIGN.md)

1. **Bám nguồn.** Chỉ dạy những gì có trong `sources/`. Mỗi bài và mỗi note ghi rõ mã mục syllabus. Không có nguồn → không dạy, ghi vào "Cần xác minh".
2. **Markdown là nguồn gốc.** `site/data/` là bản dựng ra bằng `scripts/build.mjs`, không sửa tay.
3. **Journal chỉ ghi thêm.** Không sửa lịch sử `journal/attempts.jsonl`; tiến độ phải tính lại được từ đó.
4. **Không phụ thuộc công cụ trả phí.** Knowledge là Markdown thuần + YAML frontmatter + `[[wikilink]]`, đọc được bằng VS Code/Foam, Logseq, Obsidian free, hoặc GitHub.
5. **Mỗi lệnh xong đều commit** với message rõ ràng (ví dụ `learn(istqb-ctfl): day 03 – boundary value analysis`).
6. **Không có backend** ở giai đoạn đầu. Tiến độ trên điện thoại quay về repo qua cơ chế copy/dán.

## Giao diện

Phong cách web app theo mẫu đã duyệt: `docs/reference/think-in-english.html`.
