#!/usr/bin/env node
// In ra (JSON, stdout) mọi thứ /today cần biết để quyết định sinh bài nào,
// không đụng gì tới nội dung bài học (Claude vẫn tự viết phần đó).
//
// Usage: node scripts/next-day.mjs <course-id>
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRoadmap } from "./lib/schema.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function pad2(n) {
  return String(n).padStart(2, "0");
}

function readAttempts(courseId) {
  const file = path.join(ROOT, "journal", "attempts.jsonl");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((a) => a.course === courseId);
}

function quizSizeHint(minutesPerDay) {
  return Math.max(3, Math.min(6, Math.round((minutesPerDay || 15) / 3)));
}

function main() {
  const courseId = process.argv[2];
  if (!courseId) {
    console.error("Cần truyền course-id: node scripts/next-day.mjs <course-id>");
    process.exit(1);
  }

  const courseDir = path.join(ROOT, "courses", courseId);
  const courseJsonFile = path.join(courseDir, "course.json");
  if (!existsSync(courseJsonFile)) {
    console.error(`Không tìm thấy courses/${courseId}/course.json`);
    process.exit(1);
  }
  const course = JSON.parse(readFileSync(courseJsonFile, "utf8"));

  const roadmapFile = path.join(courseDir, "roadmap.md");
  if (!existsSync(roadmapFile)) {
    console.error(`Không tìm thấy courses/${courseId}/roadmap.md`);
    process.exit(1);
  }
  const { rows } = parseRoadmap(readFileSync(roadmapFile, "utf8"), `courses/${courseId}/roadmap.md`);
  const statusByDay = new Map(rows.map((r) => [r.day, r.status]));

  // "Attempt để xét điểm thấp" chỉ tính bài học mới (roadmap status != review),
  // bỏ qua mọi lần làm bài ôn (review-* hoặc roadmap status "review").
  const attempts = readAttempts(courseId)
    .filter((a) => typeof a.day === "number" && statusByDay.get(a.day) !== "review")
    .sort((a, b) => a.ts.localeCompare(b.ts));
  const last = attempts[attempts.length - 1] || null;
  const suggestRetry = last && last.total > 0 && last.score / last.total < 0.6 ? { day: last.day, score: last.score, total: last.total } : null;

  const nextRow = rows.find((r) => r.status === "todo") || null;
  let existingFile = null;
  if (nextRow) {
    const fname = typeof nextRow.day === "number" ? `day-${pad2(nextRow.day)}.json` : `${nextRow.day}.json`;
    if (existsSync(path.join(courseDir, "days", fname))) existingFile = fname;
  }

  console.log(
    JSON.stringify(
      {
        course: courseId,
        nextRow,
        alreadyExists: existingFile !== null,
        existingFile,
        suggestRetry,
        quizSizeHint: quizSizeHint(course.minutes_per_day),
        doneAllRoadmap: nextRow === null,
      },
      null,
      2
    )
  );
}

main();
