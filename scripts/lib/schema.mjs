// Schema validation + roadmap parsing/editing shared by build.mjs, validate.mjs,
// next-day.mjs and record-attempt.mjs. Pure string-in/string-out — no fs here.
import { parseFrontmatterDoc } from "./frontmatter.mjs";

export const ROADMAP_HEADER = ["Ngày", "Chương", "Chủ đề", "Mã syllabus", "Khái niệm", "Trạng thái"];
export const ROADMAP_STATUSES = ["todo", "done", "review"];

export function requireFields(obj, fields, label) {
  for (const f of fields) {
    if (obj[f] === undefined) throw new Error(`Thiếu field "${f}" trong ${label}`);
  }
}

export function validateDay(day, label) {
  requireFields(day, ["course", "day", "date", "title", "chapter", "syllabus_refs", "concepts", "est_minutes", "sections", "quiz"], label);
  if (!Array.isArray(day.sections) || day.sections.length === 0) throw new Error(`"sections" rỗng trong ${label}`);
  if (!Array.isArray(day.quiz) || day.quiz.length === 0) throw new Error(`"quiz" rỗng trong ${label}`);
  for (const q of day.quiz) {
    requireFields(q, ["id", "concept", "prompt", "options", "why", "ref"], `câu quiz trong ${label}`);
    if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`quiz "${q.id}" trong ${label} cần ít nhất 2 lựa chọn`);
  }
}

// Concept nào thật sự được kiểm tra hôm đó (dùng để /done chỉ cập nhật SRS cho
// đúng những concept có câu quiz, không phải mọi concept liệt kê trong "concepts").
export function quizzedConcepts(day) {
  return [...new Set((day.quiz || []).map((q) => q.concept))];
}

function splitList(cell) {
  return cell.split(",").map((s) => s.trim()).filter(Boolean);
}

function tableRows(body) {
  return body.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
}

function parseRow(line, label) {
  const cells = line
    .split("|")
    .map((c) => c.trim())
    .filter((_, i, a) => !(i === 0 && a[0] === "") && !(i === a.length - 1 && a[a.length - 1] === ""));
  const [day, chapter, topic, syllabus_refs, concepts, status] = cells;
  if (!ROADMAP_STATUSES.includes(status)) {
    throw new Error(`Trạng thái "${status}" không hợp lệ trong ${label} (chỉ nhận ${ROADMAP_STATUSES.join("/")})`);
  }
  return { day: /^\d+$/.test(day) ? Number(day) : day, chapter, topic, syllabus_refs: splitList(syllabus_refs), concepts: splitList(concepts), status };
}

// Parses the "Ngày | Chương | Chủ đề | Mã syllabus | Khái niệm | Trạng thái" table (schema 5.4).
export function parseRoadmap(content, label) {
  const { lines, body } = parseFrontmatterDoc(content);
  const rows = tableRows(body);
  if (rows.length < 2) throw new Error(`Không tìm thấy bảng roadmap trong ${label}`);
  const header = rows[0].split("|").map((c) => c.trim()).filter(Boolean);
  if (ROADMAP_HEADER.some((h, i) => header[i] !== h)) {
    throw new Error(`Header bảng roadmap không đúng trong ${label} (cần: ${ROADMAP_HEADER.join(" | ")})`);
  }
  const meta = Object.fromEntries(lines.map((l) => [l.key, l.raw]));
  return { meta, rows: rows.slice(2).map((line) => parseRow(line, label)) };
}

// Đổi cột "Trạng thái" của đúng 1 hàng (theo số Ngày), giữ nguyên mọi thứ khác
// byte-identical. Trả về nội dung file mới, hoặc null nếu không tìm thấy hàng
// đó (ví dụ ngày là "review-YYYY-MM-DD" tự sinh, không có trong roadmap gốc).
export function updateRoadmapStatus(content, dayNumber, newStatus, label) {
  const { lines, body } = parseFrontmatterDoc(content);
  const bodyLines = body.split(/\r?\n/);
  const target = String(dayNumber);
  let found = false;
  const newBodyLines = bodyLines.map((line) => {
    if (!line.trim().startsWith("|")) return line;
    const cells = line.split("|");
    // cells[0] rỗng (trước dấu | đầu), cells[1] là cột "Ngày".
    if (cells.length < 3 || cells[1].trim() !== target) return line;
    if (/^-+$/.test(cells[1].trim())) return line; // dòng phân cách header
    found = true;
    cells[cells.length - 2] = ` ${newStatus} `;
    return cells.join("|");
  });
  if (!found) return null;
  const fm = lines.map((l) => `${l.key}: ${l.raw}`).join("\n");
  return `---\n${fm}\n---\n${newBodyLines.join("\n")}\n`;
}
