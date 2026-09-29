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

## Hosting

GitHub Pages, nguồn **GitHub Actions** (không phải "Deploy from a branch"). Bật một lần: **Settings → Pages → Source: GitHub Actions**. Từ đó mỗi lần push lên `master`, workflow `.github/workflows/deploy.yml` tự chạy `node scripts/build.mjs` rồi deploy `site/`.

## Chạy thử cục bộ

```
node scripts/build.mjs
cd site && python -m http.server 8080   # http://localhost:8080
```
