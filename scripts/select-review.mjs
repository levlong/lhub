#!/usr/bin/env node
// Chọn note nào đến hạn ôn, gán mỗi note vào ĐÚNG 1 khoá, cap theo quiz_size,
// và báo trước nếu file bài ôn hôm nay đã tồn tại (không tự ghi đè).
// Chỉ chọn + báo cáo — không viết nội dung bài ôn (Claude viết phần đó).
//
// Usage: node scripts/select-review.mjs [course-id]
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectReviewNotes, tsToVNDate } from "./lib/srs.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function quizSizeFor(courseId) {
  const file = path.join(ROOT, "courses", courseId, "course.json");
  if (!existsSync(file)) return 6;
  const course = JSON.parse(readFileSync(file, "utf8"));
  if (course.quiz_size) return course.quiz_size;
  return Math.max(3, Math.min(6, Math.round((course.minutes_per_day || 15) / 3)));
}

function main() {
  const onlyCourse = process.argv[2] || null;
  const knowledgeFile = path.join(ROOT, "site", "data", "knowledge.json");
  if (!existsSync(knowledgeFile)) {
    console.error(`Không tìm thấy ${path.relative(ROOT, knowledgeFile)}. Chạy "node scripts/build.mjs" trước.`);
    process.exit(1);
  }
  const notes = JSON.parse(readFileSync(knowledgeFile, "utf8"));
  const todayVN = tsToVNDate(new Date().toISOString());

  // Mỗi note chỉ được ôn trong đúng 1 khoá (khoá đầu tiên nó thuộc về), để
  // không bị hỏi trùng ở 2 file ôn tập cùng ngày khi note dùng chung nhiều khoá.
  const byCourse = new Map();
  for (const n of notes) {
    if (!n.courses || n.courses.length === 0) continue;
    const owner = onlyCourse && n.courses.includes(onlyCourse) ? onlyCourse : n.courses[0];
    if (onlyCourse && owner !== onlyCourse) continue;
    if (!byCourse.has(owner)) byCourse.set(owner, []);
    byCourse.get(owner).push(n);
  }

  const results = [];
  for (const [courseId, courseNotes] of byCourse) {
    const quizSize = quizSizeFor(courseId);
    const due = selectReviewNotes(courseNotes, { courseId, quizSize, todayVNDate: todayVN });
    const file = `review-${todayVN}.json`;
    const filePath = path.join(ROOT, "courses", courseId, "days", file);
    results.push({
      course: courseId,
      date: todayVN,
      file,
      alreadyExists: existsSync(filePath),
      notes: due.map((n) => ({ id: n.id, title: n.title, mistakes: n.mistakes || 0, next_review: n.next_review })),
    });
  }

  console.log(JSON.stringify(results.filter((r) => r.notes.length > 0), null, 2));
}

main();
