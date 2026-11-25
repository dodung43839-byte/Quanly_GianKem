// =====================================================
// ĐỒNG HỒ: THỨ - GIỜ - NGÀY
// =====================================================

function capNhatDongHo() {
  const now = new Date();

  const thu = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  const ngay = String(now.getDate()).padStart(2, "0");
  const thang = String(now.getMonth() + 1).padStart(2, "0");
  const nam = now.getFullYear();

  const gio = String(now.getHours()).padStart(2, "0");
  const phut = String(now.getMinutes()).padStart(2, "0");
  const giay = String(now.getSeconds()).padStart(2, "0");

  const thuElement = document.getElementById("thuHienTai");
  const gioElement = document.getElementById("gioHienTai");
  const ngayElement = document.getElementById("ngayHienTai");

  if (thuElement) thuElement.textContent = thu[now.getDay()];
  if (gioElement) gioElement.textContent = `${gio}:${phut}:${giay}`;
  if (ngayElement) ngayElement.textContent = `${ngay}-${thang}-${nam}`;
}

capNhatDongHo();
setInterval(capNhatDongHo, 1000);
// =====================================================
// NÚT BÁO GIÁ: MỞ TRANG BÁO GIÁ
// =====================================================

const nutDonHang = document.getElementById("menuDonHang");

if (nutDonHang) {
  nutDonHang.addEventListener("click", function () {
    window.location.href = "Bao-Gia/baogia.html";
  });
}
// =====================================================
// NÚT MUA HÀNG: MỞ TRANG MUA HÀNG
// =====================================================

const nutMua = document.getElementById("menuMuahang");

if (nutMua) {
  nutMua.addEventListener("click", function () {
    window.location.href = "Mua-Hang/muahang.html";
  });
}
// =====================================================
// NÚT PHÍ VẬN HÀNH: MỞ TRANG QUẢN LÝ CHI PHÍ
// =====================================================

const nutChiPhi = document.getElementById("menuChiPhi");

if (nutChiPhi) {
  nutChiPhi.addEventListener("click", function () {
    window.location.href = "Chi-Phi/chiphi.html";
  });
}
// =====================================================
// NÚT PHÍ VẬN HÀNH: MỞ TRANG QUẢN LÝ CHI PHÍ
// =====================================================

const nutChamcong = document.getElementById("menuChamcong");

if (nutChamcong) {
  nutChamcong.addEventListener("click", function () {
    window.location.href = "Cham-Cong/chamcong.html";
  });
}
// =====================================================
// NÚT Báo Cáo
// =====================================================

const nutBaocao = document.getElementById("menuBaocao");

if (nutBaocao) {
  nutBaocao.addEventListener("click", function () {
    window.location.href = "Bao-Cao/baocao.html";
  });
}
// =====================================================
// NÚT Tồn Kho
// =====================================================

const nutTonkho = document.getElementById("menuTonkho");

if (nutTonkho) {
  nutTonkho.addEventListener("click", function () {
    window.location.href = "./Ton-Kho/tonkho.html";
  });
}
// =====================================================
// NÚT Khách hàng
// =====================================================
const nutKhachHang = document.getElementById("menuKhachHang");

if (nutKhachHang) {
  nutKhachHang.addEventListener("click", function () {
    window.location.href = "./Khach-Hang/khachhang.html";
  });
}
// =====================================================
// NÚT Giá thành
// =====================================================
const nutDinhmuc = document.getElementById("menuDinhMuc");

if (nutDinhmuc) {
  nutDinhmuc.addEventListener("click", function () {
    window.location.href = "./Dinh-Muc/dinhmuc.html";
  });
}
// =====================================================
// SAO LƯU TẤT CẢ INDEXEDDB RA MỘT FILE EXCEL THEO THÁNG
// Mỗi Object Store được xuất thành một Sheet riêng.
// Chỉ đọc dữ liệu, KHÔNG sửa hoặc xóa dữ liệu trong IndexedDB.
// =====================================================

(() => {
  "use strict";

  const nutSaoLuu = document.getElementById("menuSaoluu");
  if (!nutSaoLuu) return;

  // Các database/object store được xác định từ mã nguồn Phanmem.zip.
  // dateFields: trường ngày dùng để lọc theo tháng.
  // Nếu dateFields rỗng, xuất toàn bộ dữ liệu (danh mục/dữ liệu nền).
  const CAU_HINH_SAO_LUU = [
    {
      db: "LuuBanHang",
      stores: [
        { name: "HoaDonBan", sheet: "BAN_HANG_HoaDon", dateFields: ["ngayBan"] },
        { name: "ThuTien", sheet: "BAN_HANG_ThuTien", dateFields: ["ngayThu"] },
      ],
    },
    {
      db: "LuuMuaHang",
      stores: [
        { name: "HoaDon", sheet: "MUA_HANG_HoaDon", dateFields: ["ngayLap", "ngayLuu"] },
        { name: "ThanhToan", sheet: "MUA_HANG_ThanhToan", dateFields: ["ngayTra"] },
      ],
    },
    {
      db: "DONGDUONG_CHAMCONG_DB",
      stores: [
        { name: "chamCong", sheet: "CHAM_CONG", dateFields: ["date", "month"] },
        { name: "tamUng", sheet: "TAM_UNG", dateFields: ["date", "month"] },
        { name: "nhanVien", sheet: "NHAN_VIEN", dateFields: [] },
        { name: "lanUng", sheet: "LAN_UNG", dateFields: ["date", "month"] },
        { name: "chamKhoan", sheet: "CHAM_KHOAN", dateFields: ["date", "month"] },
        { name: "giaKhoan", sheet: "GIA_KHOAN", dateFields: [] },
      ],
    },
    {
      db: "QUAN_LY_CHI_PHI_DB",
      stores: [
        { name: "phieuChi", sheet: "PHIEU_CHI", dateFields: ["ngayChi"] },
        { name: "ghiNhoHangMuc", sheet: "HANG_MUC_CHI", dateFields: [] },
      ],
    },
    {
      db: "QUAN_LY_KHACH_HANG_DB",
      stores: [
        // Cấu trúc khách hàng hiện chưa có ngày tạo riêng, nên xuất toàn bộ.
        { name: "khachHang", sheet: "KHACH_HANG", dateFields: [] },
      ],
    },
  ];

  function layThangMacDinh() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function chuanHoaThang(value) {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
    }

    const s = String(value).trim();
    let m = s.match(/^(\d{4})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}`;

    m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) return `${m[3]}-${String(Number(m[2])).padStart(2, "0")}`;

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    return "";
  }

  function dungThang(record, dateFields, thangChon) {
    if (!dateFields || dateFields.length === 0) return true;
    for (const field of dateFields) {
      const thang = chuanHoaThang(record && record[field]);
      if (thang && thang === thangChon) return true;
    }
    return false;
  }

  function moDatabaseChiDoc(dbName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName); // Không truyền version để không nâng cấp DB.
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(`Không mở được ${dbName}`));
      request.onblocked = () => reject(new Error(`Database ${dbName} đang bị chặn. Hãy đóng các tab phần mềm khác rồi thử lại.`));
    });
  }

  function docTatCaTrongStore(database, storeName) {
    return new Promise((resolve, reject) => {
      if (!database.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      const tx = database.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error(`Không đọc được ${storeName}`));
      tx.onabort = () => reject(tx.error || new Error(`Không đọc được ${storeName}`));
    });
  }

  function lamPhangDuLieu(records) {
    return records.map((record) => {
      const row = {};
      Object.entries(record && typeof record === "object" ? record : { giaTri: record }).forEach(([key, value]) => {
        row[key] = value && typeof value === "object" ? JSON.stringify(value) : value;
      });
      return row;
    });
  }

  // Tải thư viện Excel: ưu tiên file cục bộ, sau đó thử các CDN dự phòng.
  function taiThuVienExcel() {
    if (window.XLSX) return Promise.resolve();

    const nguonThuVien = [
      "./js/xlsx.full.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
      "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js",
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
    ];

    return new Promise((resolve, reject) => {
      let viTri = 0;

      function thuTiep() {
        if (window.XLSX) {
          resolve();
          return;
        }
        if (viTri >= nguonThuVien.length) {
          reject(new Error(
            "Không tải được thư viện Excel từ các nguồn dự phòng. " +
            "Hãy kiểm tra Internet hoặc đặt file xlsx.full.min.js vào thư mục js cạnh index.html."
          ));
          return;
        }

        const script = document.createElement("script");
        script.src = nguonThuVien[viTri++];
        script.onload = () => window.XLSX ? resolve() : thuTiep();
        script.onerror = thuTiep;
        document.head.appendChild(script);
      }

      thuTiep();
    });
  }

  async function xuatExcelTheoThang(thangChon) {
    await taiThuVienExcel();
    if (!indexedDB || typeof indexedDB.databases !== "function") {
      throw new Error("Trình duyệt chưa hỗ trợ liệt kê IndexedDB. Hãy dùng phiên bản Chrome mới rồi thử lại.");
    }

    const danhSachDBHienCo = await indexedDB.databases();
    const tenDBHienCo = new Set(danhSachDBHienCo.map((item) => item.name));
    const workbook = XLSX.utils.book_new();
    const tongQuan = [];
    let tongBanGhi = 0;

    for (const cauHinhDB of CAU_HINH_SAO_LUU) {
      if (!tenDBHienCo.has(cauHinhDB.db)) {
        tongQuan.push({ Database: cauHinhDB.db, Sheet: "-", "Số bản ghi": 0, GhiChu: "Không tìm thấy database trên thiết bị" });
        continue;
      }

      const database = await moDatabaseChiDoc(cauHinhDB.db);
      try {
        for (const cauHinhStore of cauHinhDB.stores) {
          const tatCa = await docTatCaTrongStore(database, cauHinhStore.name);
          if (tatCa === null) {
            tongQuan.push({ Database: cauHinhDB.db, Sheet: cauHinhStore.sheet, "Số bản ghi": 0, GhiChu: "Object Store không tồn tại" });
            continue;
          }

          const daLoc = tatCa.filter((record) => dungThang(record, cauHinhStore.dateFields, thangChon));

          // MUA HÀNG: tách mỗi mặt hàng trong chiTiet thành một dòng Excel.
          // Các trường thực tế được xác nhận từ muahang.js:
          // soHoaDon, ngayLap, nguoiBan, dienThoai, chiTiet[].
          let duLieuExcel;
          if (cauHinhDB.db === "LuuMuaHang" && cauHinhStore.name === "HoaDon") {
            duLieuExcel = daLoc.flatMap((hoaDon) => {
              const chiTiet = Array.isArray(hoaDon.chiTiet) ? hoaDon.chiTiet : [];
              return chiTiet.map((item, index) => ({
                SoHoaDon: hoaDon.soHoaDon || "",
                NgayLap: hoaDon.ngayLap || "",
                NguoiBan: hoaDon.nguoiBan || "",
                DienThoai: hoaDon.dienThoai || "",
                STT: index + 1,
                MaHang: item.maHang || "",
                TenHang: item.tenHang || "",
                DonViTinh: item.donViTinh || "",
                SoLuong: Number(item.soLuong) || 0,
                DonGia: Number(item.donGia) || 0,
                ThanhTien: (Number(item.soLuong) || 0) * (Number(item.donGia) || 0),
                HeSoQuyDoi: Number(item.heSoQuyDoi) || 0,
              }));
            });
          // BÁN HÀNG: tách mỗi mặt hàng trong hangHoa thành một dòng Excel.
          // Các trường thực tế được xác nhận từ banhang.js:
          // maHoaDon, ngayBan, tenKhach, dienThoai, hangHoa[].
          } else if (cauHinhDB.db === "LuuBanHang" && cauHinhStore.name === "HoaDonBan") {
            duLieuExcel = daLoc.flatMap((hoaDon) => {
              const hangHoa = Array.isArray(hoaDon.hangHoa) ? hoaDon.hangHoa : [];
              return hangHoa.map((item, index) => ({
                MaHoaDon: hoaDon.maHoaDon || "",
                NgayBan: hoaDon.ngayBan || "",
                TenKhach: hoaDon.tenKhach || "",
                DienThoai: hoaDon.dienThoai || "",
                DiaChi: hoaDon.diaChi || "",
                STT: index + 1,
                MaHang: item.maHang || "",
                TenHang: item.tenHang || "",
                DonViTinh: item.donViTinh || "",
                SoLuong: Number(item.soLuong) || 0,
                GiaVon: Number(item.giaVon) || 0,
                GiaBan: Number(item.giaBan) || 0,
                ThanhTien: (Number(item.soLuong) || 0) * (Number(item.giaBan) || 0),
                ThanhTienVon: (Number(item.soLuong) || 0) * (Number(item.giaVon) || 0),
              }));
            });
          } else {
            duLieuExcel = lamPhangDuLieu(daLoc);
          }

          const worksheet = duLieuExcel.length
            ? XLSX.utils.json_to_sheet(duLieuExcel)
            : XLSX.utils.aoa_to_sheet([["Không có dữ liệu trong tháng " + thangChon]]);

          XLSX.utils.book_append_sheet(workbook, worksheet, cauHinhStore.sheet);
          tongBanGhi += daLoc.length;
          tongQuan.push({
            Database: cauHinhDB.db,
            Sheet: cauHinhStore.sheet,
            "Số bản ghi": daLoc.length,
            GhiChu: cauHinhStore.dateFields.length ? `Đã lọc tháng ${thangChon}` : "Xuất toàn bộ dữ liệu nền/danh mục",
          });
        }
      } finally {
        database.close();
      }
    }

    const sheetTongQuan = XLSX.utils.json_to_sheet([
      { ThangSaoLuu: thangChon, ThoiGianXuat: new Date().toLocaleString("vi-VN"), TongSoBanGhi: tongBanGhi },
      ...tongQuan,
    ]);
    XLSX.utils.book_append_sheet(workbook, sheetTongQuan, "TONG_QUAN");

    const tenFile = `SaoLuu_IndexedDB_${thangChon}.xlsx`;
    XLSX.writeFile(workbook, tenFile);
    return { tenFile, tongBanGhi, tongSheet: workbook.SheetNames.length };
  }

  nutSaoLuu.addEventListener("click", async () => {
    const thangChon = window.prompt(
      "Nhập tháng cần sao lưu theo định dạng YYYY-MM (ví dụ 2026-11):",
      layThangMacDinh()
    );
    if (thangChon === null) return;

    const thangHopLe = /^\d{4}-(0[1-9]|1[0-2])$/.test(thangChon.trim());
    if (!thangHopLe) {
      alert("Tháng không hợp lệ. Vui lòng nhập theo dạng YYYY-MM, ví dụ 2026-11.");
      return;
    }

    const chu = nutSaoLuu.querySelector("span:nth-child(2)");
    const noiDungCu = chu ? chu.textContent : "Sao Lưu";
    nutSaoLuu.disabled = true;
    if (chu) chu.textContent = "Đang sao lưu...";

    try {
      const ketQua = await xuatExcelTheoThang(thangChon.trim());
      alert(`Đã xuất Excel thành công!\nTên file: ${ketQua.tenFile}\nTổng số bản ghi: ${ketQua.tongBanGhi}\nSố Sheet: ${ketQua.tongSheet}\n\nFile nằm trong thư mục Tải xuống (Download) của thiết bị.`);
    } catch (error) {
      console.error("Lỗi sao lưu IndexedDB:", error);
      alert("Không sao lưu được dữ liệu.\n" + (error && error.message ? error.message : error));
    } finally {
      nutSaoLuu.disabled = false;
      if (chu) chu.textContent = noiDungCu;
    }
  });
})();
