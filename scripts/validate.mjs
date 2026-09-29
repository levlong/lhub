#!/usr/bin/env node
// Validate one file, or the whole repo if no argument. Exit 0 = OK, 1 = lỗi.
// Dùng bởi skills (/today, /new-course, /done, /review) để kiểm tra file vừa
// viết trước khi build/commit, không cần chạy toàn bộ build.mjs.
//
// Usage:
//   node scripts/validate.mjs                       validate toàn bộ repo
//   node scripts/validate.mjs <path/to/file>         validate đúng 1 file
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatterDoc, toObject } from "./lib/frontmatter.mjs";
import { requireFields, validateDay, parseRoadmap } from "./lib/schema.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rel = (f) => path.relative(ROOT, f);

function validateKnowledgeFile(file) {
  const doc = parseFrontmatterDoc(readFileSync(file, "utf8"));
  const data = toObject(doc);
  requireFields(data, ["id", "title", "courses", "source", "status", "tags"], rel(file));
  const expectedId = path.basename(file, ".md");
  if (data.id !== expectedId) throw new Error(`id "${data.id}" không khớp tên file ${path.basename(file)}`);
  if (!Array.isArray(data.courses) || data.courses.length === 0) throw new Error(`"courses" phải là mảng không rỗng trong ${rel(file)}`);
}

function validateDayFile(file) {
  const day = JSON.parse(readFileSync(file, "utf8"));
  validateDay(day, rel(file));
}

function validateRoadmapFile(file) {
  const { rows } = parseRoadmap(readFileSync(file, "utf8"), rel(file));
  if (rows.length === 0) throw new Error(`Roadmap rỗng: ${rel(file)}`);
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.day)) throw new Error(`Ngày ${r.day} bị lặp trong ${rel(file)}`);
    seen.add(r.day);
    if (r.concepts.length === 0) throw new Error(`Hàng ngày ${r.day} thiếu "Khái niệm" trong ${rel(file)}`);
  }
}

function validateCourseJson(file) {
  const course = JSON.parse(readFileSync(file, "utf8"));
  requireFields(course, ["id", "title", "start_date", "minutes_per_day", "days_per_week"], rel(file));
  const expectedId = path.basename(path.dirname(file));
  if (course.id !== expectedId) throw new Error(`course.id "${course.id}" không khớp tên thư mục courses/${expectedId}`);
}

function validateOne(file) {
  if (!existsSync(file)) throw new Error(`Không tìm thấy file: ${file}`);
  if (file.endsWith("roadmap.md")) return validateRoadmapFile(file);
  if (file.endsWith("course.json")) return validateCourseJson(file);
  if (path.basename(path.dirname(file)) === "knowledge" || path.dirname(file).endsWith(`${path.sep}knowledge`)) return validateKnowledgeFile(file);
  if (path.dirname(file).endsWith(`${path.sep}days`)) return validateDayFile(file);
  throw new Error(`Không biết cách validate loại file này: ${file}`);
}

function validateAll() {
  const errors = [];
  const knowledgeDir = path.join(ROOT, "knowledge");
  let nKnowledge = 0;
  if (existsSync(knowledgeDir)) {
    for (const f of readdirSync(knowledgeDir).filter((f) => f.endsWith(".md"))) {
      nKnowledge++;
      try {
        validateKnowledgeFile(path.join(knowledgeDir, f));
      } catch (e) {
        errors.push(e.message);
      }
    }
  }

  const coursesDir = path.join(ROOT, "courses");
  let nCourses = 0;
  let nDays = 0;
  if (existsSync(coursesDir)) {
    for (const id of readdirSync(coursesDir)) {
      const courseJson = path.join(coursesDir, id, "course.json");
      if (!existsSync(courseJson)) continue;
      nCourses++;
      try {
        validateCourseJson(courseJson);
      } catch (e) {
        errors.push(e.message);
      }
      const roadmapFile = path.join(coursesDir, id, "roadmap.md");
      if (existsSync(roadmapFile)) {
        try {
          validateRoadmapFile(roadmapFile);
        } catch (e) {
          errors.push(e.message);
        }
      }
      const daysDir = path.join(coursesDir, id, "days");
      if (existsSync(daysDir)) {
        for (const f of readdirSync(daysDir).filter((f) => f.endsWith(".json"))) {
          nDays++;
          try {
            validateDayFile(path.join(daysDir, f));
          } catch (e) {
            errors.push(e.message);
          }
        }
      }
    }
  }

  return { errors, summary: `${nCourses} khoá, ${nDays} bài, ${nKnowledge} note knowledge` };
}

const target = process.argv[2];
if (target) {
  try {
    validateOne(path.resolve(target));
    console.log(`OK: ${target}`);
  } catch (e) {
    console.error(`Lỗi: ${e.message}`);
    process.exit(1);
  }
} else {
  const { errors, summary } = validateAll();
  if (errors.length) {
    console.error(`Lỗi (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`OK: ${summary}`);
}
