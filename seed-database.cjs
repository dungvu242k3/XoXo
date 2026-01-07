// Script tạo dữ liệu mẫu cho Firebase Realtime Database
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

const firebaseConfig = {
  databaseURL: "https://xoxo-b2c0d-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Dữ liệu mẫu tiếng Việt
const seedData = {
  // KHÁCH HÀNG
  khach_hang: {
    "KH001": {
      ma_khach_hang: "KH001",
      ho_ten: "Nguyễn Thùy Linh",
      so_dien_thoai: "0909123456",
      email: "linh.nguyen@gmail.com",
      dia_chi: "Vinhomes Central Park, Bình Thạnh, HCM",
      hang_khach: "VVIP",
      tong_chi_tieu: 125000000,
      lan_ghe_gan_nhat: "2023-10-25",
      ghi_chu: "Khách khó tính, thích dùng đồ Hermes, yêu cầu giao nhận tại nhà."
    },
    "KH002": {
      ma_khach_hang: "KH002",
      ho_ten: "Trần Minh Tuấn",
      so_dien_thoai: "0918889999",
      email: "tuan.tran@ceo.vn",
      dia_chi: "Thảo Điền, Quận 2, HCM",
      hang_khach: "VIP",
      tong_chi_tieu: 45000000,
      lan_ghe_gan_nhat: "2023-10-20",
      ghi_chu: "Thường spa giày tây và cặp da công sở."
    },
    "KH003": {
      ma_khach_hang: "KH003",
      ho_ten: "Lê Thị Hồng Hạnh",
      so_dien_thoai: "0933456789",
      email: "hanh.le@showroom.com",
      dia_chi: "Quận 1, HCM",
      hang_khach: "Tiêu Chuẩn",
      tong_chi_tieu: 2000000,
      lan_ghe_gan_nhat: "2023-10-15",
      ghi_chu: ""
    },
    "KH004": {
      ma_khach_hang: "KH004",
      ho_ten: "Phạm Hương Giang",
      so_dien_thoai: "0987654321",
      email: "giang.pham@model.vn",
      dia_chi: "Quận 7, HCM",
      hang_khach: "VIP",
      tong_chi_tieu: 28000000,
      lan_ghe_gan_nhat: "2023-10-28",
      ghi_chu: ""
    },
    "KH005": {
      ma_khach_hang: "KH005",
      ho_ten: "Đặng Văn Lâm",
      so_dien_thoai: "0901239876",
      email: "lam.dang@sport.vn",
      dia_chi: "Quận 3, HCM",
      hang_khach: "Tiêu Chuẩn",
      tong_chi_tieu: 1500000,
      lan_ghe_gan_nhat: "2023-10-01",
      ghi_chu: ""
    }
  },

  // NHÂN SỰ
  nhan_su: {
    "NS001": {
      ma_nhan_vien: "NS001",
      ho_ten: "Ngô Thanh Vân",
      chuc_vu: "Quản lý",
      so_dien_thoai: "0909000001",
      email: "van.ngo@xoxo.vn",
      trang_thai: "Đang làm",
      anh_dai_dien: "https://i.pravatar.cc/150?u=van"
    },
    "NS002": {
      ma_nhan_vien: "NS002",
      ho_ten: "Lê Bảo Trung",
      chuc_vu: "Kỹ thuật viên",
      so_dien_thoai: "0909000002",
      email: "trung.le@xoxo.vn",
      trang_thai: "Đang làm",
      chuyen_mon: "Phục hồi màu",
      anh_dai_dien: "https://i.pravatar.cc/150?u=trung"
    },
    "NS003": {
      ma_nhan_vien: "NS003",
      ho_ten: "Phạm Quỳnh Anh",
      chuc_vu: "Tư vấn viên",
      so_dien_thoai: "0909000003",
      email: "anh.pham@xoxo.vn",
      trang_thai: "Đang làm",
      anh_dai_dien: "https://i.pravatar.cc/150?u=anh"
    },
    "NS004": {
      ma_nhan_vien: "NS004",
      ho_ten: "Trương Thế Vinh",
      chuc_vu: "Kỹ thuật viên",
      so_dien_thoai: "0909000004",
      email: "vinh.truong@xoxo.vn",
      trang_thai: "Đang làm",
      chuyen_mon: "Xi mạ vàng",
      anh_dai_dien: "https://i.pravatar.cc/150?u=vinh"
    },
    "NS005": {
      ma_nhan_vien: "NS005",
      ho_ten: "Mai Phương Thúy",
      chuc_vu: "QC",
      so_dien_thoai: "0909000005",
      email: "thuy.mai@xoxo.vn",
      trang_thai: "Nghỉ",
      anh_dai_dien: "https://i.pravatar.cc/150?u=thuy"
    }
  },

  // KHO VẬT TƯ
  kho_vat_tu: {
    "VT001": {
      ma_vat_tu: "VT001",
      ma_sku: "CHEM-SAP-01",
      ten_vat_tu: "Xi Saphir Medaille d'Or (Đen)",
      danh_muc: "Hoá chất",
      so_luong: 15,
      don_vi: "Hộp",
      nguong_toi_thieu: 5,
      gia_nhap: 350000,
      nha_cung_cap: "Saphir Vietnam",
      ngay_nhap_gan_nhat: "20/09/2023",
      hinh_anh: "https://images.unsplash.com/photo-1617260053912-32b70f058090?auto=format&fit=crop&q=80&w=200&h=200"
    },
    "VT002": {
      ma_vat_tu: "VT002",
      ma_sku: "CHEM-ANG-02",
      ten_vat_tu: "Dung dịch vệ sinh Angelus",
      danh_muc: "Hoá chất",
      so_luong: 4,
      don_vi: "Chai 1L",
      nguong_toi_thieu: 5,
      gia_nhap: 850000,
      nha_cung_cap: "Angelus Direct",
      ngay_nhap_gan_nhat: "15/10/2023",
      hinh_anh: "https://images.unsplash.com/photo-1620505199676-e918544e9999?auto=format&fit=crop&q=80&w=200&h=200"
    },
    "VT003": {
      ma_vat_tu: "VT003",
      ma_sku: "ACC-ZIP-YKK",
      ten_vat_tu: "Đầu khoá YKK Vàng số 5",
      danh_muc: "Phụ kiện",
      so_luong: 150,
      don_vi: "Cái",
      nguong_toi_thieu: 50,
      gia_nhap: 15000,
      nha_cung_cap: "Khoá Kéo YKK",
      ngay_nhap_gan_nhat: "01/10/2023",
      hinh_anh: "https://images.unsplash.com/photo-1598532163257-52c676d1e466?auto=format&fit=crop&q=80&w=200&h=200"
    },
    "VT004": {
      ma_vat_tu: "VT004",
      ma_sku: "TOOL-BRUSH-01",
      ten_vat_tu: "Bàn chải lông ngựa cao cấp",
      danh_muc: "Dụng cụ",
      so_luong: 8,
      don_vi: "Cái",
      nguong_toi_thieu: 3,
      gia_nhap: 250000,
      nha_cung_cap: "Local Craft",
      ngay_nhap_gan_nhat: "10/08/2023",
      hinh_anh: "https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&q=80&w=200&h=200"
    },
    "VT005": {
      ma_vat_tu: "VT005",
      ma_sku: "MAT-COTTON",
      ten_vat_tu: "Khăn Cotton chuyên dụng",
      danh_muc: "Vật tư tiêu hao",
      so_luong: 200,
      don_vi: "Cái",
      nguong_toi_thieu: 100,
      gia_nhap: 5000,
      nha_cung_cap: "Vải Sợi SG",
      ngay_nhap_gan_nhat: "25/10/2023",
      hinh_anh: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=200&h=200"
    },
    "VT006": {
      ma_vat_tu: "VT006",
      ma_sku: "CHEM-GOLD-24K",
      ten_vat_tu: "Dung dịch mạ vàng 24K",
      danh_muc: "Hoá chất",
      so_luong: 1,
      don_vi: "Lít",
      nguong_toi_thieu: 1,
      gia_nhap: 15000000,
      nha_cung_cap: "Gold Plating Tech",
      ngay_nhap_gan_nhat: "10/09/2023",
      hinh_anh: "https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&q=80&w=200&h=200"
    }
  },

  // DỊCH VỤ SPA
  dich_vu_spa: {
    "DV001": {
      ma_dich_vu: "DV001",
      ten_dich_vu: "Spa Túi Xách Basic",
      danh_muc: "Túi Xách",
      gia: 800000,
      mo_ta: "Vệ sinh bề mặt, dưỡng da, khử mùi nhẹ.",
      quy_trinh_id: "SPA",
      hinh_anh: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&q=80&w=400&h=400"
    },
    "DV002": {
      ma_dich_vu: "DV002",
      ten_dich_vu: "Spa Túi Xách Deep Clean",
      danh_muc: "Túi Xách",
      gia: 1500000,
      mo_ta: "Vệ sinh sâu, xử lý nấm mốc, khử mùi ozon, dưỡng da chuyên sâu.",
      quy_trinh_id: "SPA",
      hinh_anh: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=400&h=400"
    },
    "DV003": {
      ma_dich_vu: "DV003",
      ten_dich_vu: "Phục Hồi Màu Túi (Retouch)",
      danh_muc: "Sửa Chữa",
      gia: 2500000,
      mo_ta: "Dặm màu các vết xước góc, trầy xước bề mặt, phục hồi màu nguyên bản.",
      quy_trinh_id: "REPAIR",
      hinh_anh: "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&q=80&w=400&h=400"
    },
    "DV004": {
      ma_dich_vu: "DV004",
      ten_dich_vu: "Đổi Màu Túi (Recolor)",
      danh_muc: "Sửa Chữa",
      gia: 4500000,
      mo_ta: "Sơn đổi màu toàn bộ túi theo yêu cầu, phủ lớp bảo vệ.",
      quy_trinh_id: "REPAIR",
      hinh_anh: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=400&h=400"
    },
    "DV005": {
      ma_dich_vu: "DV005",
      ten_dich_vu: "Xi Mạ Vàng 18K/24K Logo",
      danh_muc: "Xi Mạ",
      gia: 3000000,
      mo_ta: "Mạ vàng thật cho logo, khoá kéo, chi tiết kim loại.",
      quy_trinh_id: "PLATING",
      hinh_anh: "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&q=80&w=400&h=400"
    },
    "DV006": {
      ma_dich_vu: "DV006",
      ten_dich_vu: "Vệ Sinh Giày Sneaker",
      danh_muc: "Giày",
      gia: 250000,
      mo_ta: "Vệ sinh tay, chiếu UV diệt khuẩn, hong khô.",
      quy_trinh_id: "SPA",
      hinh_anh: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=400&h=400"
    },
    "DV007": {
      ma_dich_vu: "DV007",
      ten_dich_vu: "Patina Giày Tây",
      danh_muc: "Giày",
      gia: 1800000,
      mo_ta: "Đánh màu nghệ thuật Patina, tạo hiệu ứng chuyển màu sang trọng.",
      quy_trinh_id: "REPAIR",
      hinh_anh: "https://images.unsplash.com/photo-1478683011038-16430b1a5ad1?auto=format&fit=crop&q=80&w=400&h=400"
    },
    "DV008": {
      ma_dich_vu: "DV008",
      ten_dich_vu: "Dán Đế Vibram",
      danh_muc: "Sửa Chữa",
      gia: 850000,
      mo_ta: "Dán đế bảo vệ chống trượt Vibram chính hãng.",
      quy_trinh_id: "REPAIR",
      hinh_anh: "https://images.unsplash.com/photo-1534653299134-96a171b61581?auto=format&fit=crop&q=80&w=400&h=400"
    }
  },

  // SẢN PHẨM BÁN LẺ
  san_pham_ban_le: {
    "SP001": {
      ma_san_pham: "SP001",
      ten_san_pham: "Bộ Vệ Sinh Giày Cao Cấp Crep Protect",
      danh_muc: "Vệ Sinh Giày",
      gia_ban: 850000,
      ton_kho: 24,
      hinh_anh: "https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&q=80&w=400&h=400",
      mo_ta: "Combo bàn chải, dung dịch vệ sinh và khăn lau."
    },
    "SP002": {
      ma_san_pham: "SP002",
      ten_san_pham: "Xi Saphir Pommadier 1925",
      danh_muc: "Chăm Sóc Da",
      gia_ban: 450000,
      ton_kho: 15,
      hinh_anh: "https://images.unsplash.com/photo-1617260053912-32b70f058090?auto=format&fit=crop&q=80&w=400&h=400",
      mo_ta: "Xi kem cao cấp giúp dưỡng da và phục hồi màu."
    },
    "SP003": {
      ma_san_pham: "SP003",
      ten_san_pham: "Chai Xịt Chống Thấm Nano",
      danh_muc: "Bảo Vệ",
      gia_ban: 350000,
      ton_kho: 50,
      hinh_anh: "https://images.unsplash.com/photo-1620505199676-e918544e9999?auto=format&fit=crop&q=80&w=400&h=400",
      mo_ta: "Bảo vệ giày và túi khỏi nước và vết bẩn."
    },
    "SP004": {
      ma_san_pham: "SP004",
      ten_san_pham: "Cây Giữ Form Giày (Shoe Tree) Gỗ Tuyết Tùng",
      danh_muc: "Phụ Kiện",
      gia_ban: 650000,
      ton_kho: 10,
      hinh_anh: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=400&h=400",
      mo_ta: "Giữ form giày tây, hút ẩm và khử mùi."
    },
    "SP005": {
      ma_san_pham: "SP005",
      ten_san_pham: "Khăn Lau Da Chuyên Dụng (Set 3)",
      danh_muc: "Phụ Kiện",
      gia_ban: 150000,
      ton_kho: 100,
      hinh_anh: "https://images.unsplash.com/photo-1621252179027-94459d27d3ee?auto=format&fit=crop&q=80&w=400&h=400",
      mo_ta: "Sợi microfiber mềm mịn, không gây trầy xước da."
    }
  },

  // QUY TRÌNH
  quy_trinh: {
    "SPA": {
      ma_quy_trinh: "SPA",
      ten_quy_trinh: "Quy trình Spa & Vệ sinh",
      loai_dich_vu: ["Vệ sinh"],
      mo_ta: "Quy trình tiêu chuẩn cho việc làm sạch, vệ sinh và khử mùi.",
      mau_sac: "bg-blue-900/30 text-blue-400 border-blue-800",
      phong_ban: "Spa",
      vat_tu_su_dung: [
        { ma_vat_tu: "VT002", so_luong: 0.1 },
        { ma_vat_tu: "VT005", so_luong: 2 }
      ]
    },
    "REPAIR": {
      ma_quy_trinh: "REPAIR",
      ten_quy_trinh: "Quy trình Sửa chữa & Phục hồi",
      loai_dich_vu: ["Sửa chữa", "Nhuộm màu", "Tùy chỉnh"],
      mo_ta: "Dành cho các dịch vụ sửa chữa lỗi, dặm màu, nhuộm đổi màu.",
      mau_sac: "bg-orange-900/30 text-orange-400 border-orange-800",
      phong_ban: "Kỹ Thuật",
      vat_tu_su_dung: [
        { ma_vat_tu: "VT001", so_luong: 1 }
      ]
    },
    "PLATING": {
      ma_quy_trinh: "PLATING",
      ten_quy_trinh: "Quy trình Xi mạ & Kim loại",
      loai_dich_vu: ["Xi mạ"],
      mo_ta: "Xử lý các chi tiết kim loại, xi mạ vàng 18k/24k.",
      mau_sac: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
      phong_ban: "Kỹ Thuật",
      vat_tu_su_dung: [
        { ma_vat_tu: "VT006", so_luong: 0.05 }
      ]
    },
    "QC_FINAL": {
      ma_quy_trinh: "QC_FINAL",
      ten_quy_trinh: "Quy trình Kiểm định (QC)",
      loai_dich_vu: [],
      mo_ta: "Kiểm tra chất lượng cuối cùng trước khi đóng gói.",
      mau_sac: "bg-purple-900/30 text-purple-400 border-purple-800",
      phong_ban: "QA/QC"
    }
  },

  // ĐƠN HÀNG
  don_hang: {
    "DH-2023-001": {
      ma_don_hang: "DH-2023-001",
      ma_khach_hang: "KH001",
      ten_khach_hang: "Nguyễn Thùy Linh",
      danh_sach_dich_vu: [
        {
          ma_item: "SI-001",
          ten: "Spa Túi Hermes Birkin",
          loai_dich_vu: "Vệ sinh",
          gia: 2500000,
          trang_thai: "Đang sửa chữa",
          so_luong: 1,
          anh_truoc: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&q=80&w=400&h=400"
        },
        {
          ma_item: "SI-002",
          ten: "Vệ sinh Giày Gucci",
          loai_dich_vu: "Vệ sinh",
          gia: 450000,
          trang_thai: "Chờ xử lý",
          so_luong: 1,
          anh_truoc: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=400&h=400"
        }
      ],
      tong_tien: 2950000,
      dat_coc: 1500000,
      trang_thai: "Đang xử lý",
      ngay_tao: "2023-10-25",
      ngay_giao_du_kien: "2023-11-01",
      ghi_chu: "Khách yêu cầu giữ nguyên tag."
    },
    "DH-2023-002": {
      ma_don_hang: "DH-2023-002",
      ma_khach_hang: "KH002",
      ten_khach_hang: "Trần Minh Tuấn",
      danh_sach_dich_vu: [
        {
          ma_item: "SI-003",
          ten: "Dán Đế Vibram Giày Tây",
          loai_dich_vu: "Sửa chữa",
          gia: 850000,
          trang_thai: "Sẵn sàng",
          so_luong: 1,
          anh_truoc: "https://images.unsplash.com/photo-1478683011038-16430b1a5ad1?auto=format&fit=crop&q=80&w=400&h=400"
        }
      ],
      tong_tien: 850000,
      dat_coc: 850000,
      trang_thai: "Hoàn thành",
      ngay_tao: "2023-10-20",
      ngay_giao_du_kien: "2023-10-25",
      ghi_chu: ""
    },
    "DH-2023-003": {
      ma_don_hang: "DH-2023-003",
      ma_khach_hang: "KH004",
      ten_khach_hang: "Phạm Hương Giang",
      danh_sach_dich_vu: [
        {
          ma_item: "SI-004",
          ten: "Đổi Màu Túi Chanel",
          loai_dich_vu: "Tùy chỉnh",
          gia: 4500000,
          trang_thai: "Đang vệ sinh",
          so_luong: 1,
          anh_truoc: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=400&h=400"
        }
      ],
      tong_tien: 4500000,
      dat_coc: 2000000,
      trang_thai: "Đã xác nhận",
      ngay_tao: "2023-10-28",
      ngay_giao_du_kien: "2023-11-10",
      ghi_chu: ""
    },
    "DH-2023-004": {
      ma_don_hang: "DH-2023-004",
      ma_khach_hang: "KH003",
      ten_khach_hang: "Lê Thị Hồng Hạnh",
      danh_sach_dich_vu: [
        {
          ma_item: "SI-005",
          ten: "Xi Mạ Khóa Vàng 18K",
          loai_dich_vu: "Xi mạ",
          gia: 3000000,
          trang_thai: "Đang kiểm tra",
          so_luong: 1,
          anh_truoc: "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&q=80&w=400&h=400"
        }
      ],
      tong_tien: 3000000,
      dat_coc: 1500000,
      trang_thai: "Đang xử lý",
      ngay_tao: "2023-10-26",
      ngay_giao_du_kien: "2023-11-05",
      ghi_chu: ""
    }
  },

  // CẤU HÌNH CÔNG TY
  cau_hinh_cong_ty: {
    ten_cong_ty: "XOXO Luxury Repair",
    slogan: "Nâng niu giá trị thời gian",
    dia_chi: "88 Đồng Khởi, Quận 1, TP. Hồ Chí Minh",
    so_dien_thoai: "0909 888 999",
    email: "contact@xoxo.vn",
    website: "www.xoxoluxury.vn",
    logo_url: "https://via.placeholder.com/150/000000/FFFFFF?text=XOXO",
    mau_chu_dao: "#c68a35"
  },

  // DOANH THU THEO NGÀY
  doanh_thu: {
    "T2": { ngay: "Thứ 2", doanh_thu: 12500000 },
    "T3": { ngay: "Thứ 3", doanh_thu: 18200000 },
    "T4": { ngay: "Thứ 4", doanh_thu: 15800000 },
    "T5": { ngay: "Thứ 5", doanh_thu: 24500000 },
    "T6": { ngay: "Thứ 6", doanh_thu: 21000000 },
    "T7": { ngay: "Thứ 7", doanh_thu: 38000000 },
    "CN": { ngay: "Chủ nhật", doanh_thu: 32000000 }
  },

  // CÔNG VIỆC CRM
  cong_viec_crm: {
    "CV001": {
      ma_cong_viec: "CV001",
      ma_khach_hang: "KH001",
      ten_khach_hang: "Nguyễn Thùy Linh",
      loai_cong_viec: "Gọi ngày 3",
      ngay_hen: "Hôm nay",
      trang_thai: "Chờ xử lý"
    },
    "CV002": {
      ma_cong_viec: "CV002",
      ma_khach_hang: "KH002",
      ten_khach_hang: "Trần Minh Tuấn",
      loai_cong_viec: "Kiểm tra bảo hành",
      ngay_hen: "Hôm qua",
      trang_thai: "Quá hạn"
    },
    "CV003": {
      ma_cong_viec: "CV003",
      ma_khach_hang: "KH005",
      ten_khach_hang: "Đặng Văn Lâm",
      loai_cong_viec: "Sinh nhật",
      ngay_hen: "02/11/2023",
      trang_thai: "Chờ xử lý"
    },
    "CV004": {
      ma_cong_viec: "CV004",
      ma_khach_hang: "KH003",
      ten_khach_hang: "Lê Thị Hồng Hạnh",
      loai_cong_viec: "Gọi ngày 7",
      ngay_hen: "03/11/2023",
      trang_thai: "Chờ xử lý"
    }
  }
};

async function seedDatabase() {
  try {
    console.log('🚀 Bắt đầu tạo dữ liệu mẫu...');
    
    await set(ref(db), seedData);
    
    console.log('✅ Đã tạo dữ liệu thành công!');
    console.log('📊 Các bảng đã tạo:');
    console.log('   - khach_hang (Khách hàng)');
    console.log('   - nhan_su (Nhân sự)');
    console.log('   - kho_vat_tu (Kho vật tư)');
    console.log('   - dich_vu_spa (Dịch vụ Spa)');
    console.log('   - san_pham_ban_le (Sản phẩm bán lẻ)');
    console.log('   - quy_trinh (Quy trình)');
    console.log('   - don_hang (Đơn hàng)');
    console.log('   - cau_hinh_cong_ty (Cấu hình công ty)');
    console.log('   - doanh_thu (Doanh thu)');
    console.log('   - cong_viec_crm (Công việc CRM)');
    console.log('');
    console.log('🔗 Kiểm tra tại: https://xoxo-b2c0d-default-rtdb.asia-southeast1.firebasedatabase.app/');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu:', error);
    process.exit(1);
  }
}

seedDatabase();
