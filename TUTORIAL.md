# Hướng dẫn dùng Portflow Showcase

Tài liệu này dành cho người dùng admin: cách chỉnh portfolio, trang chủ, project và publish lên site công khai.

> Lập trình viên / deploy: xem [README.md](./README.md). Kiến trúc: [ADR/ARD-portflow-showcase.md](./ADR/ARD-portflow-showcase.md).

---

## Portflow Showcase là gì?

**Portflow Showcase** là một phần độc lập trong hệ sinh thái **Portflow**, được tách riêng để phục vụ nhu cầu xây dựng và xuất bản các website **design showcase**.

Trong khi Portflow hướng đến một nền tảng portfolio toàn diện hơn — bao gồm quản lý hồ sơ cá nhân, CV, application tracking, analytics và các công cụ hỗ trợ quá trình tìm việc — Portflow Showcase tập trung vào một bài toán cụ thể:

> Giúp designer, studio hoặc team nhỏ trình bày các project trực quan trên một website riêng mà không cần chỉnh sửa mã nguồn.

Portflow Showcase có thể được sử dụng như một website độc lập, đồng thời đóng vai trò nền tảng thử nghiệm cho hệ thống layout, content block và publishing workflow của Portflow trong tương lai.

### Phạm vi hiện tại

Portflow Showcase hỗ trợ:

* Xây dựng trang chủ portfolio bằng layout dạng row và column.
* Tạo các trang project riêng tại `/{slug}`.
* Trình bày hình ảnh và nội dung rich text.
* Quản lý profile, avatar, bio và social links.
* Chỉnh sửa nội dung trong khu vực Admin.
* Autosave bản nháp mà không cần bấm Save.
* Preview trước khi xuất bản.
* Publish toàn bộ website thành một phiên bản công khai ổn định.

Phiên bản hiện tại được tối ưu cho:

* Designer cá nhân.
* Creative developer.
* Studio nhỏ.
* Team freelance.
* Các portfolio thiên về hình ảnh, case study và sản phẩm thiết kế.

### Cách hệ thống hoạt động

Portflow Showcase tách nội dung thành hai trạng thái:

* **Draft** — phiên bản đang chỉnh sửa trong Admin.
* **Live** — phiên bản đã Publish và đang hiển thị công khai.

Mọi thay đổi trong Admin được tự động lưu vào Draft. Website công khai không thay đổi cho đến khi người quản trị chủ động bấm **Publish**.

```text
Chỉnh sửa trong Admin
          │
          ▼
     Autosave Draft
          │
          ▼
        Preview
          │
          ▼
        Publish
          │
          ▼
   Website công khai
```

Cơ chế này giúp người quản trị có thể chỉnh sửa nhiều project, thay đổi layout hoặc chuẩn bị nội dung mới mà không ảnh hưởng đến phiên bản website khách hàng đang xem.

### Cấu trúc website

* **Site công khai** (`/`, `/{slug}`) chỉ hiển thị nội dung đã được Publish.
* **Admin** (`/admin`) dùng để quản lý homepage, project và bản nháp.
* Mọi thay đổi trong Admin được autosave — không có nút Save riêng.
* Một installation hiện phục vụ một portfolio và một tài khoản admin.
* Nội dung và hình ảnh được lưu trên Cloudflare R2, không sử dụng database.

Portflow Showcase hiện được phát triển như một sản phẩm nhỏ, độc lập và có thể triển khai riêng. Các thành phần phù hợp sẽ tiếp tục được chuẩn hóa để tái sử dụng trong nền tảng Portflow lớn hơn.

---

## Vào admin

1. Mở `/admin` trên domain đã cấu hình.
2. Đăng nhập qua Cloudflare Access (OTP / IdP) bằng đúng email admin.
3. Dev local: có thể bật `DEV_ADMIN_BYPASS` (chỉ khi `pnpm dev`) — chi tiết trong README.

Deep link hữu ích:

| URL | Màn hình |
| --- | --- |
| `/admin` | Trang quản trị: danh sách project + Publish |
| `/admin?page=home` | Edit homepage |
| `/admin?project={id}` | Edit project |

---

## Tổng quan trang Admin

Tại `/admin` bạn thấy:

1. **Edit homepage** — chỉnh setup + layout trang chủ.
2. **Publish** — đẩy bản nháp đã lưu lên site công khai.
3. **Portfolio** — tạo / sắp xếp / ẩn-hiện / mở từng project.

Toast góc phải dưới báo trạng thái autosave (*Unsaved changes* → *Saving…* → *Saved*). Publish / xóa / tạo project dùng overlay loading toàn màn hình.

> **Lưu ý:** Publish luôn dùng bản draft **đã autosave gần nhất**. Nếu toast còn *Unsaved changes*, đợi *Saved* rồi hãy Publish.

---

## 1. Quản lý danh sách project (Portfolio)

### Tạo project mới

1. Bấm **New project**.
2. Hệ thống tạo draft trống và mở canvas chỉnh sửa.
3. Đặt **title** (bắt buộc nếu muốn có URL công khai). Project chưa có title sẽ **không** được publish ra `/{slug}`.

### Sắp xếp & hiển thị trên trang chủ

Với mỗi project trong danh sách:

- Bấm **title** để mở editor.
- **Visible** — tắt thì project vẫn có thể có trang `/{slug}` sau khi publish, nhưng **không** hiện trong lưới project trên homepage.
- **Move up** / **Move down** — thứ tự trên homepage (project grid).

Badge trạng thái: `draft` | `published` | `archived`.

### URL project (slug)

Slug được **tự sinh từ title**, không chỉnh tay:

- chữ thường
- khoảng trắng / ký tự đặc biệt → `-`
- bỏ dấu tiếng Việt (`ê` → `e`, `ă/â/á` → `a`, `đ` → `d`, …)

Ví dụ: `Dự án Đặc biệt` → `/du-an-dac-biet`.

Đổi title → slug đổi theo (sau khi autosave). Hai project không được trùng title (không phân biệt hoa thường / khoảng trắng thừa) hoặc trùng slug sau khi chuẩn hóa.

---

## 2. Edit homepage

Bấm **Edit homepage** (hoặc mở `/admin?page=home`).

### Homepage setup

Phần trên canvas (ẩn khi Preview):

| Trường | Ý nghĩa |
| --- | --- |
| **Portfolio title** | Tên portfolio (dùng trong profile trên trang chủ) |
| **Bio** | Giới thiệu ngắn |
| **Avatar** | Ảnh đại diện — **Upload avatar** |
| **Font** | Font mặc định của site: Inter, Manrope, Space Grotesk, Montserrat, Roboto, Arial |
| **Social links** | Tối đa 10 link (Label + URL) — **Add link** |

Thay đổi ở đây autosave cùng layout bên dưới.

### Layout trang chủ

Trang chủ là các **row** xếp dọc. Mỗi row có 1–3 cột; mỗi cột chứa block.

Hai block hệ thống (mỗi loại tối đa một):

- **+ Profile** — hiện title / bio / avatar / social theo setup; chỉnh Align và bật/tắt Avatar, Bio, Social links.
- **+ Project grid** — lưới project từ Portfolio (Visible + đã có title); chỉnh số cột, gap, hiện Cover / Title / Summary.

Ngoài ra có thể thêm block nội dung như project: ảnh và rich text (xem mục 4).

Thanh công cụ:

- **Theme** — màu nền / chữ của trang chủ.
- **Preview** / **Edit** — xem trước hoặc quay lại chỉnh.
- **Publish** — publish toàn site (giống nút Publish ở trang admin).
- **← Back** — về danh sách Portfolio.

---

## 3. Edit project

Mở từ **New project** hoặc bấm title trong Portfolio (`/admin?project={id}`).

### Meta

- Ô **title** (placeholder *Untitled project*) — quyết định slug / URL công khai.
- Ô **summary** — mô tả ngắn hiện trên homepage (project grid), khi bật Summary.
- `/{slug}` hiện cạnh title khi đã có URL.

### Layout project

Giống homepage nhưng không có Profile / Project grid — chỉ ảnh và rich text:

1. **+ Add first row** (hoặc **+ Add row**) để thêm hàng.
2. Chọn số cột **1 / 2 / 3**.
3. Trong cột: **Upload image** hoặc **Add text**.
4. Row: **Duplicate row**, ↑↓, **Delete row**.

Ảnh đầu tiên trong layout thường dùng làm **cover** trên homepage grid.

### Theme & Preview

- **Theme** — nền / chữ riêng cho trang project.
- **Preview** — xem gần giống bản public.

### Xóa project

1. **Delete project…**
2. Gõ đúng title để xác nhận (nếu đã có title).
3. **Delete** — project được **archive**, biến mất khỏi site công khai ở lần **Publish** kế tiếp.

---

## 4. Rich text & ảnh

### Ảnh

- Upload qua dropzone trong cột / row.
- Có thể kéo nhiều ảnh; hệ thống xếp vào layout theo cột hiện có.
- Hover block → **Remove** để xóa.

### Rich text

Toolbar hỗ trợ:

- Body / Heading 1–3
- Cỡ chữ, font (Inter, Manrope, Space Grotesk, Montserrat, Roboto, Arial)
- Đậm / nghiêng / gạch chân
- Căn trái / giữa / phải
- Danh sách bullet / numbered
- Undo / Redo

Không hỗ trợ link tùy ý hay dán HTML tùy ý — nội dung được validate phía server.

---

## 5. Publish — đưa lên site công khai

### Draft vs live

| | Draft (admin) | Live (public) |
| --- | --- | --- |
| Xem ở | `/admin` | `/`, `/{slug}` |
| Lưu | Autosave lên R2 private | Chỉ đổi khi Publish |
| Ai thấy | Admin | Mọi người |

### Cách publish

1. Chỉnh homepage / project đến khi toast **Saved**.
2. Bấm **Publish** (trang admin, homepage editor, hoặc project editor — cùng một thao tác).
3. Đợi overlay xong; toast xác nhận (ví dụ *Published (N projects live).*).
4. Mở URL public để kiểm tra.

Publish tạo **snapshot bất biến** (release). Nếu publish lỗi trước khi chuyển bản live, site công khai **giữ release cũ**.

### Những gì không lên homepage / không có URL

- Project **chưa có title** → bỏ qua khi publish (không có `/{slug}`).
- **Visible** tắt → vẫn có thể có trang chi tiết nếu đã titled + published, nhưng không hiện trong project grid.
- Project đã **Delete** (archived) → biến mất khỏi live ở lần publish sau.

---

## 6. Site công khai

| Route | Nội dung |
| --- | --- |
| `/` | Homepage: profile + lưới project theo thứ tự Portfolio |
| `/{slug}` | Trang chi tiết project |

Chưa publish lần nào: trang chủ trống / thông báo chưa có nội dung.

---

## Checklist nhanh lần đầu

1. [ ] Vào `/admin`
2. [ ] **Edit homepage** → điền title, bio, avatar, font, social
3. [ ] Giữ / chỉnh block Profile + Project grid
4. [ ] **New project** → đặt title, summary, thêm ảnh / text
5. [ ] Bật **Visible**, sắp xếp thứ tự
6. [ ] Đợi toast **Saved**
7. [ ] **Publish**
8. [ ] Kiểm tra `/` và `/{slug}`

---

## Xử lý sự cố thường gặp (phía người dùng)

| Hiện tượng | Việc nên làm |
| --- | --- |
| Toast *Save failed* / revision conflict | Reload trang admin, chỉnh lại (tab khác đã lưu trước) |
| Publish xong nhưng homepage không đổi | Hard refresh; kiểm tra project có title + Visible; xác nhận toast publish thành công |
| Không có `/{slug}` | Project cần title (slug) rồi Publish lại |
| Upload ảnh lỗi | Thử ảnh khác / nhỏ hơn; báo admin kỹ thuật kiểm tra CORS R2 |
| Không vào được `/admin` | Sai email Access, hoặc chưa qua domain Cloudflare (xem README Troubleshooting) |
