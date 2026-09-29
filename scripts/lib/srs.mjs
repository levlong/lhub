// Spaced-repetition interval math. Pure functions, no I/O — see srs.test.mjs.

export const SEQUENCE = [1, 3, 7, 14, 30];

// Bước kế tiếp trong chuỗi 1-3-7-14-30, lấy giá trị nhỏ nhất LỚN HƠN current.
// current=0 (note mới) -> 1. current đã >=30 (hoặc lệch chuỗi, vd 40) -> giữ 30.
export function nextInterval(current) {
  const cur = current || 0;
  const next = SEQUENCE.find((v) => v > cur);
  return next ?? 30;
}

// Asia/Ho_Chi_Minh không có DST -> luôn UTC+7. Trả về "YYYY-MM-DD".
export function tsToVNDate(tsISO) {
  const d = new Date(tsISO);
  if (Number.isNaN(d.getTime())) throw new Error(`ts không hợp lệ: "${tsISO}"`);
  const vn = new Date(d.getTime() + 7 * 3600 * 1000);
  return vn.toISOString().slice(0, 10);
}

export function addDaysISO(dateISO, days) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

// note: { interval, mistakes, learned } hiện tại (learned/interval có thể null/0 nếu note mới).
// Trả về các field cần ghi lại vào frontmatter: interval, status, mistakes, next_review, learned.
export function applySrs(note, correct, todayVNDate) {
  const learned = note.learned || todayVNDate;
  if (correct) {
    const interval = nextInterval(note.interval);
    return {
      interval,
      status: interval >= 30 ? "mastered" : "learning",
      mistakes: note.mistakes || 0,
      next_review: addDaysISO(todayVNDate, interval),
      learned,
    };
  }
  return {
    interval: 1,
    status: "learning",
    mistakes: (note.mistakes || 0) + 1,
    next_review: addDaysISO(todayVNDate, 1),
    learned,
  };
}

// Chọn note để ôn: đến hạn, ưu tiên mistakes cao, cap theo quizSize. Dùng bởi /review.
export function selectReviewNotes(notes, { courseId, quizSize, todayVNDate }) {
  const due = notes
    .filter((n) => n.next_review && n.next_review <= todayVNDate)
    .filter((n) => !courseId || n.courses.includes(courseId))
    .sort((a, b) => (b.mistakes || 0) - (a.mistakes || 0) || a.next_review.localeCompare(b.next_review));
  return quizSize ? due.slice(0, quizSize) : due;
}
