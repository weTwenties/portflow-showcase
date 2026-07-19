# ADR-0001: Block-based project canvas (supersedes ARD no-page-builder constraints)

| Thuộc tính | Giá trị |
| --- | --- |
| Trạng thái | Accepted |
| Ngày | 2026-07-18 |
| Phạm vi | Chỉ project editor + project rendering. Không đổi auth, R2 storage model, upload protocol, publish immutability. |

## Bối cảnh

`ARD-portflow-showcase.md` v3.0 chốt project editor là form-based (name/summary/description + danh sách ảnh phẳng, tự động chia hero + row tối đa 3 cột — §9.3, §10), và liệt kê "page builder", "canvas", "kéo thả", "layout editor" là **không có trong V1** (§1, §2.2, §26).

Sau khi V1 chạy được end-to-end, chủ dự án đánh giá mental model form-based giống CMS, không đúng ý định ban đầu là một page builder tối giản: "New project → mở ngay một tờ giấy trắng → thêm row → chia cột → thả nội dung vào". ARD tự quy định "Mọi thay đổi sang... editor phải có ADR mới trước khi implementation" (dòng cuối ARD) — tài liệu này là ADR đó.

## Quyết định

Thay project data model và editor UX:

- `ProjectDocument.assets[]` (phẳng) → `ProjectDocument.rows[]` (cây `RowBlock` → `ColumnBlock[]` → `ImageBlock | TextBlock`, tối đa 3 tầng lồng nhau).
- Project không còn bắt buộc `name`/`summary` lúc tạo. `POST /api/admin/projects` tạo draft rỗng, không `title`/`slug`. Title (và slug tạo từ title lần đầu) chỉ bắt buộc khi Save/Publish.
- Project editor chuyển từ dialog (`project-editor.tsx`, `create-project-dialog.tsx`) sang full-page canvas render tại `/admin?project={projectId}` (đúng route pattern ARD §6.1 đã cho phép, không cần route mới).
- Root portfolio thêm "Portfolio organizer": `order` (số nguyên) + `isVisible` trên `ProjectIndexEntry`, quản lý thứ tự/hiển thị tách biệt khỏi nội dung project.
- `buildRows()`/hero-tự-động bị xóa; public renderer đọc trực tiếp `rows[]` qua component `RowsRenderer` dùng chung với editor preview.
- Canvas top bar (`Back | Title | Saving/Saved | Preview | Publish`) không có nút Save riêng — **autosave (debounce)** thay cho §3 "Save | Nút Save rõ ràng, không autosave". Vẫn dùng revision-check + Web Locks per resource như cũ, chỉ đổi trigger từ click sang debounce sau khi ngừng gõ.

**Cố ý hoãn sang bản sau** (theo đúng đề xuất chủ dự án — không làm trong đợt này):

- Nested row (row lồng trong column) — schema cho phép tối đa 3 tầng nhưng UI v1 chỉ tạo được 1 tầng row phẳng.
- Drag-and-drop thật — v1 dùng nút Move up/down cho row và cho project trong portfolio organizer.

**Không đổi**: Cloudflare Access/`requireAdmin()`, R2 key structure (`content/projects/{id}/draft.json`...), upload warm-up/complete protocol, publish immutable release + `current.json` pointer-cuối-cùng, revision-conflict flow.

## Dữ liệu cũ

2 project test (`test`, `test1`) đang có trong R2 dùng schema cũ (`assets[]`), không tương thích Zod schema mới. Đây là dữ liệu test tạo trong lúc verify upload flow, không phải nội dung thật — sẽ xóa thẳng thay vì viết migration, chấp nhận mất dữ liệu test này.

## Hệ quả

Các đoạn sau của `ARD-portflow-showcase.md` được xem là lỗi thời cho phần project editor kể từ ADR này: §1 (câu "Không có page builder, canvas... "), §2.2 (mục "Drag-and-drop", "Layout editor"), §9.3 (schema `ProjectDocument.assets`), §10 (`buildRows()`), §26 (mục "Drag-and-drop hoặc visual editor"). Phần còn lại của ARD (auth, storage, upload, publish, validation limits không liên quan đến project content) vẫn là nguồn sự thật.
