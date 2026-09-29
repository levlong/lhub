# lhub — Learning Hub

Hệ thống tự học hằng ngày: syllabus chính thức → lộ trình → bài học + quiz mỗi ngày, học trên điện thoại qua web app tĩnh, tiến độ quay về repo dưới dạng Markdown/JSON. Xem đầy đủ ở [`docs/DESIGN.md`](docs/DESIGN.md) và [`CLAUDE.md`](CLAUDE.md).

## Cấu trúc

```
sources/<course-id>/      nguồn: syllabus, trích tài liệu
courses/<course-id>/      roadmap.md, course.json, days/day-NN.json
journal/                  nhật ký + attempts.jsonl (append-only)
knowledge/<concept>.md    note kiến thức, dùng chung mọi khoá
scripts/build.mjs         courses/ + knowledge/ → site/data/*.json
site/                     web app tĩnh (đọc site/data/ lúc chạy)
.claude/skills/           /new-course · /today · /done · /review
```

## Nhánh git

- **`master`** — milestone: chỉ cập nhật khi một mốc đã ổn định (xong 1 giai đoạn, xong 1 tính năng lớn), không nhận commit lặt vặt hằng ngày.
- **`dev`** — nơi phát triển tính năng mới (thay đổi `site/`, `scripts/build.mjs`, skills...). Xong thì merge vào `master` khi tới milestone.
- **`dep`** — nhánh trigger deploy. Push lên `dep` (thường bằng cách merge `master` hoặc `dev` vào đây) là GitHub Actions build + deploy web app thật. Không dev trực tiếp trên `dep`.

Việc học hằng ngày (`/new-course`, `/today`, `/done`, `/review` — sinh/sửa `sources/`, `courses/`, `knowledge/`, `journal/`) không phải "tính năng", nên commit **thẳng vào `dep`** để lên web ngay. Định kỳ (theo tuần hoặc khi ổn định): `dep → merge → dev → merge → master`.

## Hosting

GitHub Pages, nguồn **GitHub Actions** (không phải "Deploy from a branch"). Bật một lần: **Settings → Pages → Source: GitHub Actions**. Workflow `.github/workflows/deploy.yml` trigger khi push lên **`dep`**, tự chạy `node scripts/build.mjs` rồi deploy `site/`.

## Chạy thử cục bộ

```
node scripts/build.mjs
cd site && python -m http.server 8080   # http://localhost:8080
```
