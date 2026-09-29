#!/usr/bin/env node
// Toàn bộ phần sổ sách máy móc của /done: parse + validate kết quả, chống dán
// trùng, cập nhật SRS đúng cho các concept có quiz, ghi journal, cập nhật
// roadmap. Không viết nội dung (Tóm tắt/Ví dụ/Hay nhầm) — nếu note knowledge
// nào chưa tồn tại, script DỪNG và liệt kê ra để Claude tạo nội dung trước.
//
// Usage:
//   node scripts/record-attempt.mjs '<json>'
//   echo '<json>' | node scripts/record-attempt.mjs
//   node scripts/record-attempt.mjs --root <dir> '<json>'     (dùng khi test)
//
// In ra 1 dòng JSON kết quả ở stdout, exit 0 = thành công hoặc trùng (no-op),
// exit 1 = lỗi (thiếu note, JSON sai schema, không tìm thấy course/day...).
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatterDoc, serializeFrontmatterDoc, getField, setField } from "./lib/frontmatter.mjs";
import { validateDay, quizzedConcepts, updateRoadmapStatus } from "./lib/schema.mjs";
import { applySrs, tsToVNDate } from "./lib/srs.mjs";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseArgs(argv) {
  let root = null;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root") {
      root = argv[++i];
    } else {
      rest.push(argv[i]);
    }
  }
  return { root, json: rest[0] };
}

function fail(obj) {
  console.error(JSON.stringify({ ok: false, ...obj }, null, 2));
  process.exit(1);
}

function dayFileName(day) {
  return typeof day === "number" ? `day-${pad2(day)}.json` : `${day}.json`;
}

function main() {
  const { root, json } = parseArgs(process.argv.slice(2));
  const ROOT = root ? path.resolve(root) : path.dirname(path.dirname(fileURLToPath(import.meta.url)));

  const raw = json || readStdin().trim();
  if (!raw) fail({ error: "Không có dữ liệu đầu vào. Dán đúng dòng JSON từ nút 'Copy kết quả'." });

  let attempt;
  try {
    attempt = JSON.parse(raw);
  } catch (e) {
    fail({ error: `JSON không hợp lệ: ${e.message}` });
  }
  for (const f of ["ts", "course", "day", "score", "total", "wrong"]) {
    if (attempt[f] === undefined) fail({ error: `Thiếu field "${f}" trong kết quả` });
  }
  if (!Array.isArray(attempt.wrong)) fail({ error: `"wrong" phải là mảng` });
  for (const w of attempt.wrong) {
    if (!w.q || !w.concept) fail({ error: `Mỗi mục "wrong" cần có "q" và "concept"` });
  }

  const courseDir = path.join(ROOT, "courses", attempt.course);
  if (!existsSync(path.join(courseDir, "course.json"))) {
    fail({ error: `Không tìm thấy courses/${attempt.course}/course.json` });
  }

  const dayFile = path.join(courseDir, "days", dayFileName(attempt.day));
  if (!existsSync(dayFile)) fail({ error: `Không tìm thấy ${path.relative(ROOT, dayFile)}` });
  const dayData = JSON.parse(readFileSync(dayFile, "utf8"));
  try {
    validateDay(dayData, path.relative(ROOT, dayFile));
  } catch (e) {
    fail({ error: e.message });
  }

  // Chống dán trùng: cùng course + day + ts thì coi là đã ghi nhận rồi, không làm gì thêm.
  const attemptsFile = path.join(ROOT, "journal", "attempts.jsonl");
  if (existsSync(attemptsFile)) {
    const existing = readFileSync(attemptsFile, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
    const dup = existing.some((a) => a.course === attempt.course && String(a.day) === String(attempt.day) && a.ts === attempt.ts);
    if (dup) {
      console.log(JSON.stringify({ ok: true, duplicate: true, message: "Kết quả này đã được ghi nhận trước đó, bỏ qua." }, null, 2));
      return;
    }
  }

  // Chỉ cập nhật SRS cho concept THẬT SỰ có câu quiz trong bài này, không phải
  // mọi concept liệt kê trong "concepts" của day.
  const concepts = quizzedConcepts(dayData);
  const missing = concepts.filter((c) => !existsSync(path.join(ROOT, "knowledge", `${c}.md`)));
  if (missing.length) {
    fail({
      error: "Thiếu note knowledge cho các concept sau — tạo nội dung (Tóm tắt/Ví dụ/Liên quan) rồi chạy lại record-attempt.mjs.",
      missingConcepts: missing,
    });
  }

  const todayVN = tsToVNDate(attempt.ts);
  const updatedConcepts = [];
  for (const concept of concepts) {
    const file = path.join(ROOT, "knowledge", `${concept}.md`);
    const doc = parseFrontmatterDoc(readFileSync(file, "utf8"));
    const correct = !attempt.wrong.some((w) => w.concept === concept);
    const current = { interval: getField(doc, "interval") || 0, mistakes: getField(doc, "mistakes") || 0, learned: getField(doc, "learned") };
    const result = applySrs(current, correct, todayVN);
    setField(doc, "interval", result.interval);
    setField(doc, "status", result.status);
    setField(doc, "mistakes", result.mistakes);
    setField(doc, "next_review", result.next_review);
    setField(doc, "learned", result.learned);
    const courses = getField(doc, "courses") || [];
    if (!courses.includes(attempt.course)) setField(doc, "courses", [...courses, attempt.course]);
    writeFileSync(file, serializeFrontmatterDoc(doc));
    updatedConcepts.push({ concept, correct, interval: result.interval, status: result.status, next_review: result.next_review });
  }

  // Journal: append-only.
  mkdirSync(path.join(ROOT, "journal"), { recursive: true });
  appendFileSync(attemptsFile, JSON.stringify(attempt) + "\n");

  const dailyFile = path.join(ROOT, "journal", `${todayVN}.md`);
  const wrongList = attempt.wrong.length ? attempt.wrong.map((w) => `  - ${w.q} (${w.concept})`).join("\n") : "  - (không có)";
  const block = `- **${attempt.course}** · Ngày ${attempt.day} · ${dayData.title} · điểm ${attempt.score}/${attempt.total}\n${wrongList}\n`;
  if (existsSync(dailyFile)) {
    appendFileSync(dailyFile, block);
  } else {
    writeFileSync(dailyFile, `# ${todayVN}\n\n${block}`);
  }

  // Roadmap: bỏ qua nếu là ngày ôn tập tự sinh (review-YYYY-MM-DD, không có hàng
  // tương ứng trong roadmap.md).
  let roadmapUpdated = false;
  if (typeof attempt.day === "number") {
    const roadmapFile = path.join(courseDir, "roadmap.md");
    if (existsSync(roadmapFile)) {
      const updated = updateRoadmapStatus(readFileSync(roadmapFile, "utf8"), attempt.day, "done", path.relative(ROOT, roadmapFile));
      if (updated) {
        writeFileSync(roadmapFile, updated);
        roadmapUpdated = true;
      }
    }
  }

  console.log(
    JSON.stringify(
      { ok: true, duplicate: false, score: attempt.score, total: attempt.total, updatedConcepts, roadmapUpdated, dayTitle: dayData.title },
      null,
      2
    )
  );
}

main();
