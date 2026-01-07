# Mapping tên cột: Tiếng Anh → Tiếng Việt

## Bảng: khach_hang (Customers)

| Tiếng Anh (Cũ) | Tiếng Việt (Mới) |
|----------------|------------------|
| id | id |
| name | ten |
| phone | sdt |
| email | email |
| address | dia_chi |
| tier | hang_thanh_vien |
| total_spent | tong_chi_tieu |
| last_visit | lan_cuoi_ghe |
| notes | ghi_chu |
| source | nguon_khach |
| status | trang_thai |
| assignee_id | id_nhan_vien_phu_trach |
| interaction_count | so_lan_tuong_tac |
| group | nhom_khach |
| created_at | ngay_tao |
| updated_at | ngay_cap_nhat |

**Giá trị enum:**
- tier: 'Standard' → 'thuong', 'VIP' → 'vip', 'VVIP' → 'vvip'

## Bảng: don_hang (Orders)

| Tiếng Anh (Cũ) | Tiếng Việt (Mới) |
|----------------|------------------|
| id | id |
| customer_id | id_khach_hang |
| customer_name | ten_khach_hang |
| total_amount | tong_tien |
| deposit | tien_coc |
| status | trang_thai |
| created_at | ngay_tao |
| expected_delivery | ngay_du_kien_giao |
| notes | ghi_chu |
| updated_at | ngay_cap_nhat |

**Giá trị enum:**
- status: 'Pending' → 'cho_xu_ly', 'Confirmed' → 'da_xac_nhan', 'Processing' → 'dang_xu_ly', 'Done' → 'hoan_thanh', 'Delivered' → 'da_giao', 'Cancelled' → 'huy'

## Bảng: hang_muc_dich_vu (Service Items)

| Tiếng Anh (Cũ) | Tiếng Việt (Mới) |
|----------------|------------------|
| id | id |
| order_id | id_don_hang |
| name | ten_hang_muc |
| type | loai |
| price | don_gia |
| quantity | so_luong |
| status | trang_thai |
| technician_id | id_ky_thuat_vien |
| before_image | anh_truoc |
| after_image | anh_sau |
| is_product | la_san_pham |
| service_id | id_dich_vu_goc |
| workflow_id | id_quy_trinh |
| history | lich_su_thuc_hien |
| last_updated | cap_nhat_cuoi |
| technical_log | nhat_ky_ky_thuat |
| created_at | ngay_tao |
| updated_at | ngay_cap_nhat |

**Giá trị enum:**
- type: 'Cleaning' → 've_sinh', 'Repair' → 'sua_chua', 'Plating' → 'xi_ma', 'Dyeing' → 'nhuom', 'Custom' → 'custom', 'Product' → 'san_pham'

## Bảng: kho_vat_tu (Inventory)

| Tiếng Anh (Cũ) | Tiếng Việt (Mới) |
|----------------|------------------|
| id | id |
| sku | ma_sku |
| name | ten_vat_tu |
| category | danh_muc |
| quantity | so_luong_ton |
| unit | don_vi_tinh |
| minThreshold | nguong_toi_thieu |
| importPrice | gia_nhap |
| supplier | nha_cung_cap |
| lastImport | lan_nhap_cuoi |
| image | anh_vat_tu |
| created_at | ngay_tao |
| updated_at | ngay_cap_nhat |

**Giá trị enum:**
- category: 'Hoá chất' → 'hoa_chat', 'Phụ kiện' → 'phu_kien', 'Dụng cụ' → 'dung_cu', 'Vật tư tiêu hao' → 'vat_tu_tieu_hao'

## Bảng: dich_vu_spa (Services)

| Tiếng Anh (Cũ) | Tiếng Việt (Mới) |
|----------------|------------------|
| id | id |
| name | ten_dich_vu |
| category | danh_muc |
| categoryPath | duong_dan_danh_muc |
| price | gia_niem_yet |
| desc | mo_ta |
| image | anh_dich_vu |
| workflowId | id_quy_trinh |
| workflows | cac_buoc_quy_trinh |
| created_at | ngay_tao |
| updated_at | ngay_cap_nhat |

## Bảng: san_pham_ban_le (Products)

| Tiếng Anh (Cũ) | Tiếng Việt (Mới) |
|----------------|------------------|
| id | id |
| name | ten_san_pham |
| category | danh_muc |
| price | gia_ban |
| stock | ton_kho |
| image | anh_san_pham |
| desc | mo_ta |
| created_at | ngay_tao |
| updated_at | ngay_cap_nhat |

## Bảng: nhan_su (Members)

| Tiếng Anh (Cũ) | Tiếng Việt (Mới) |
|----------------|------------------|
| id | id |
| name | ho_ten |
| role | vai_tro |
| phone | sdt |
| email | email |
| status | trang_thai |
| avatar | anh_dai_dien |
| specialty | chuyen_mon |
| department | phong_ban |
| created_at | ngay_tao |
| updated_at | ngay_cap_nhat |

**Giá trị enum:**
- role: 'Quản lý' → 'quan_ly', 'Tư vấn viên' → 'tu_van', 'Kỹ thuật viên' → 'ky_thuat', 'QC' → 'qc'
- status: 'Active' → 'hoat_dong', 'Off' → 'nghi'
- department: 'Kỹ Thuật' → 'ky_thuat', 'Spa' → 'spa', 'QA/QC' → 'qc', 'Hậu Cần' → 'hau_can', 'Quản Lý' → 'quan_ly', 'Kinh Doanh' → 'kinh_doanh'

## Bảng: quy_trinh (Workflows)

| Tiếng Anh (Cũ) | Tiếng Việt (Mới) |
|----------------|------------------|
| id | id |
| label | ten_quy_trinh |
| types | loai_ap_dung |
| description | mo_ta |
| color | mau_sac |
| department | phong_ban_phu_trach |
| materials | vat_tu_can_thiet |
| stages | cac_buoc |
| assignedMembers | nhan_vien_duoc_giao |
| created_at | ngay_tao |
| updated_at | ngay_cap_nhat |

**Giá trị enum:**
- department: 'Kỹ Thuật' → 'ky_thuat', 'Spa' → 'spa', 'QA/QC' → 'qc', 'Hậu Cần' → 'hau_can'

## Bảng: thong_bao (Notifications)

| Tiếng Anh (Cũ) | Tiếng Việt (Mới) |
|----------------|------------------|
| id | id |
| order_id | id_don_hang |
| item_id | id_muc_lien_quan |
| type | loai_thong_bao |
| message | noi_dung |
| read | da_doc |
| created_at | ngay_tao |

