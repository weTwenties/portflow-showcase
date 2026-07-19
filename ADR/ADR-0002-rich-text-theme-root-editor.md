# ADR-0002: Rich text (Tiptap), page theme, và root page editor

| Thuộc tính | Giá trị |
| --- | --- |
| Trạng thái | Accepted |
| Ngày | 2026-07-18 |
| Kế thừa | [ADR-0001](./ADR-0001-block-based-project-canvas.md) (block-based canvas) |
| Phạm vi | Text block → rich text; theme cho project/site; root `/` thành block layout. Không đổi auth, R2 storage model, upload protocol, publish immutability. |

## Quyết định

### 1. Rich text bằng Tiptap, lưu JSON

- `TextBlock { text: string }` → `RichTextBlock { type: "rich-text", content: RichTextDocument }`.
- Lưu **ProseMirror JSON** (không phải HTML) trên R2, validate bằng Zod theo allowlist chặt: `doc → paragraph → text|hardBreak`, marks `bold|italic|underline`. Node/mark ngoài allowlist (heading, list, link, attrs lạ…) bị **từ chối** ở server; attrs không khai báo bị strip khi parse.
- Một extension set duy nhất (`modules/rich-text/application/extensions.ts` — StarterKit đã disable mọi thứ ngoài scope) dùng cho cả editor và static renderer, nên editor gõ được gì thì public render đúng cái đó; paste bị schema ProseMirror ép về allowlist.
- Public render qua `@tiptap/static-renderer` (React element, không `dangerouslySetInnerHTML`, không mount editor). Public bundle không chứa editor runtime.
- Giới hạn: 2.000 ký tự plain-text/block (bằng limit cũ), 20.000 ký tự JSON serialized/block.
- Placeholder trong editor làm bằng overlay React (`editor.isEmpty`) thay vì thêm dependency Placeholder extension.

### 2. Page theme

- `PageTheme { backgroundColor, textColor }`, chỉ nhận `#RRGGBB` (normalize uppercase) — không thể inject CSS qua color field. Default `#FFFFFF`/`#18181B` (đúng look cũ).
- Có trên cả `ProjectDocument` (v3) và `SiteDocument` (v2); áp vào edit canvas, preview và public qua inline style container; muted text dùng `opacity-*` kế thừa `currentColor`, không còn hardcode zinc.
- Contrast ratio WCAG hiển thị cảnh báo khi < 4.5:1, **không chặn save** (V1).

### 3. Root page editor (SiteCanvas)

- `SiteDocument` v2 thêm `theme` + `rows` (block layout). Route edit: `/admin?page=home` (canonical vẫn `/admin`).
- 2 system block chỉ dành cho site: `profile` (render title/bio/avatar/social từ SiteDocument — data vẫn là structured fields nên metadata không phụ thuộc layout) và `project-grid` (render manifest theo order/visibility từ portfolio organizer).
- Invariants (validate ở save + publish): tối đa 1 profile, tối đa 1 project-grid, grid phải là block duy nhất trong row 1 cột. Project document **không** nhận system block (schema từ chối). Duplicate row chứa system block sẽ strip system block khỏi bản clone.
- Di chuyển system block V1 = system block luôn được thêm vào row riêng (toolbar) → di chuyển bằng move row; xóa rồi thêm lại để đổi chỗ khác.
- Settings form và homepage canvas cùng ghi qua `PUT /api/admin/site`: `theme`/`rows` là **optional** trong input — thiếu thì giữ giá trị hiện tại, nên hai surface không ghi đè lẫn nhau (revision check vẫn bảo vệ race).

### 4. Schema versions & migration (đọc-normalize, không rewrite)

| Document | Cũ | Mới | Migration khi đọc |
| --- | --- | --- | --- |
| Project draft | v2 (text blocks) | v3 (+theme, rich-text) | text→rich-text (newline→paragraph), theme default |
| Site draft | v1 (không rows) | v2 (+theme, rows) | theme default, layout mặc định profile+grid (giống UI cũ) |
| Release project | v2 | v3 | như project draft |
| Release site | v1 | v2 | như site draft |

Release cũ bất biến — chỉ normalize in-memory khi đọc; save/publish tiếp theo ghi shape mới. Không rewrite R2 khi đọc.

## Amendment 2026-07-19: mở rộng typography

Theo yêu cầu chủ dự án (sau khi dùng thử), editor được mở rộng thêm — vẫn giữ nguyên tắc allowlist, không CSS/HTML tùy ý:

- **Heading 1-3** (node `heading`, attrs.level ∈ {1,2,3}).
- **Bullet/numbered list** (`bulletList`/`orderedList`/`listItem`, lồng nhau được, giới hạn 100 item/danh sách).
- **Font size per-selection**: mark `textStyle.fontSize` ∈ {12px, 18px, 24px, 32px} — enum cứng, giá trị khác bị server từ chối (đã e2e: `999px` → 400).
- **Font family per-selection**: `textStyle.fontFamily` ∈ {`var(--font-inter)`, `var(--font-manrope)`, `var(--font-space-grotesk)`} — trỏ vào CSS variables do next/font gắn ở root layout, nên vẫn dùng đúng font tự host, không tải font ngoài.
- Typography (h1-h3, list indent, spacing) dùng một class chung (`modules/rich-text/presentation/typography.ts`) cho cả editor và static renderer — WYSIWYG.
- Extension mới: `@tiptap/extension-text-style` (TextStyle + FontSize + FontFamily).
- **Text align left/center/right** (`@tiptap/extension-text-align` trên paragraph + heading): attr `textAlign` là enum cứng — chuỗi khác (kể cả `justify` hay CSS injection) bị từ chối.
- **Font size kiểu Word**: thay preset bằng ô nhập số (8–96px, datalist gợi ý 10…64, Enter/blur để áp, clamp tự động). Lưu `"{n}px"` — regex + range check ở server, đã e2e (`97px`, `7px`, `1.5rem` → 400).

## Hoãn sang bản sau

Link mark; blockquote/code block; text **color** per-selection; nested row; drag-and-drop thật; per-row background; custom HTML block. Component-level tests cho editor (keyboard shortcuts, paste) chưa tự động hóa — cần Playwright browser; đã cover bằng domain tests + e2e HTML assertions.
