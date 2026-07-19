# Portflow Showcase

Website portfolio tối giản cho một designer/team nhỏ: một portfolio, một admin, không database. Toàn bộ JSON và ảnh nằm trên Cloudflare R2, đăng nhập admin qua Cloudflare Access, deploy trên Vercel.

**Người dùng admin:** xem [TUTORIAL.md](./TUTORIAL.md) — cách chỉnh homepage, project, autosave và publish.

**Kiến trúc / ADR:** [ARD-portflow-showcase.md](./ADR/ARD-portflow-showcase.md), [ADR-0001](./ADR/ADR-0001-block-based-project-canvas.md), [ADR-0002](./ADR/ADR-0002-rich-text-theme-root-editor.md).

## Surface

| Route | Mô tả |
| --- | --- |
| `/` | Portfolio public (release đã publish) |
| `/{projectSlug}` | Chi tiết project đã publish |
| `/admin` | Trang quản trị duy nhất (Cloudflare Access + JWT verification) |
| `/admin?page=home` | Edit homepage (setup + layout) |
| `/admin?project={id}` | Edit project |
| `/api/admin/*` | Write API, bắt buộc `requireAdmin()` |

## Local development

```bash
pnpm install
cp .env.example .env.local   # rồi điền giá trị thật
pnpm dev
```

`.env.local` hiện có sẵn placeholder — cần cập nhật trước khi upload/publish hoạt động:

- `ADMIN_EMAIL` — email admin duy nhất được phép.
- `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUDS` — từ Cloudflare Zero Trust (hai Access applications cho `/admin*` và `/api/admin*`, lấy Audience tags, phân tách bằng dấu phẩy).
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — API token R2 quyền tối thiểu trên 2 bucket.
- `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET`, `R2_PUBLIC_BASE_URL` — bucket private (JSON) + bucket public (ảnh) + custom domain của bucket public.
- `UPLOAD_TOKEN_SECRET` — chuỗi ngẫu nhiên ≥ 32 ký tự.

Khi dev local, `DEV_ADMIN_BYPASS=true` (đặt trong `.env.development.local`, chỉ được load khi `next dev`) cho phép vào `/admin` không cần Cloudflare Access. **Chỉ hoạt động với `NODE_ENV=development`** — build sẽ fail nếu biến này là `true` trong môi trường build/Preview/Production.

## Scripts

```bash
pnpm dev          # dev server
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest unit + application tests
pnpm test:e2e     # playwright (cần dev server / R2 test bucket)
pnpm build        # production build
pnpm check        # lint + typecheck + test + build
```

## Kiến trúc nhanh

- `src/modules/{site,project,asset,publishing,access,layout,rich-text}` — DDD-lite: `domain` (schema Zod, invariant), `application` (use case + port), `infrastructure` (R2/Cloudflare adapter), `presentation` (React).
- **Nội dung dạng block** (ADR-0001/0002): project và trang chủ đều là `rows[] → columns[] → blocks[]` (image, rich-text; trang chủ thêm 2 system block `profile` + `project-grid`). Editor full-page tại `/admin?project={id}` và `/admin?page=home`, autosave debounce + revision check. Hướng dẫn thao tác UI: [TUTORIAL.md](./TUTORIAL.md).
- **Rich text** lưu dạng Tiptap/ProseMirror JSON (không HTML) — paragraph/heading/list + bold/italic/underline + font size/family allowlist; server validate bằng Zod; public render qua static renderer, không bundle editor.
- **Theme**: mỗi project/trang chủ có `{backgroundColor, textColor}` dạng `#RRGGBB`; contrast thấp chỉ cảnh báo.
- **Schema versions**: project draft v3, site draft v2, release project v3, release site v2. Bản cũ (project/release-project v2, site/release-site v1) được normalize khi đọc — không rewrite R2, release cũ bất biến. Chi tiết migration: [ADR-0002](./ADR/ADR-0002-rich-text-theme-root-editor.md).
- `src/lib` — env (Zod, server-only), R2 ObjectStore + key builder, API error contract, rate limit, logger.
- `src/stores` — Zustand: `upload-store` (queue upload, concurrency 3), `admin-ui-store`.
- Nội dung: draft → (autosave, revision check) → R2 private; Publish tạo release snapshot bất biến, ghi `content/current.json` sau cùng — publish fail không ảnh hưởng release đang chạy.
- Upload: warm-up (presigned PUT 90s + finalize token) → browser PUT thẳng lên R2 staging → complete (verify checksum/size, copy sang public bucket, idempotent).

## Deploy (tóm tắt — chi tiết xem ARD §27)

1. **R2**: tạo 2 bucket (private/public), API token quyền tối thiểu, gắn custom domain cho bucket public, cấu hình CORS cho origin app (PUT + header `content-type`, `x-amz-checksum-sha256`), lifecycle rule tự xóa `uploads/staging/*`.
2. **Cloudflare Access**: 2 self-hosted applications (`/admin*`, `/api/admin*`), policy allow đúng `ADMIN_EMAIL`, lấy cả 2 Audience tags bỏ vào `CF_ACCESS_AUDS`.
3. **Vercel**: import repo, đặt env riêng cho Preview/Production (không bật `DEV_ADMIN_BYPASS`), gắn production domain qua Cloudflare proxy.
4. Kiểm tra: vào `/admin` qua domain Cloudflare (login OTP/IdP); gọi thẳng `*.vercel.app/api/admin/content` phải trả `401`.

## Troubleshooting

- **401 UNAUTHENTICATED trên `/admin`** — request không đi qua Cloudflare proxy hoặc thiếu header `Cf-Access-Jwt-Assertion`; kiểm tra DNS proxy (đám mây cam) và Access application path.
- **403 FORBIDDEN** — đăng nhập bằng email khác `ADMIN_EMAIL`.
- **Upload fail ngay khi PUT** — kiểm tra CORS của bucket private (origin app, method PUT, headers `content-type`, `x-amz-checksum-sha256`).
- **`STORAGE_UNAVAILABLE`** — credential R2 sai hoặc bucket không tồn tại; xem server logs (JSON, có `requestId`).
- **Build fail `DEV_ADMIN_BYPASS`** — biến này đang `true` ở môi trường không phải development; xóa khỏi Vercel env.
- **409 REVISION_CONFLICT khi Save** — nội dung đã bị sửa ở tab khác; reload trang admin.
