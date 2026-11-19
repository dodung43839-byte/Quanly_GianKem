// =====================================================
// THUEGTGT.JS - NHẬN DỮ LIỆU TỪ BẢNG BÁO GIÁ TRANG MAIN
// Dữ liệu được main.js lưu trong sessionStorage:
// duLieuThueGTGT
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
  const hoaDon = document.getElementById("hoaDon");
  const tbody = hoaDon?.querySelector('[data-role="danhSachHang"]');
  const btnPDF = document.getElementById("btnXuatPDF");
  if (!hoaDon || !tbody) return;

  const logo = hoaDon.querySelector('[data-image="logo"]');
  if (logo) {
    logo.src = "../images/logo1.png";
    logo.onerror = function () {
      console.error("Không tải được ../images/logo.png. Hãy kiểm tra đường dẫn logo.");
    };
  }

  function ganText(field, value) {
    const el = hoaDon.querySelector('[data-field="' + field + '"]');
    if (el) el.textContent = value == null ? "" : String(value);
  }

  function laySo(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    // Chấp nhận chuỗi tiền Việt có dấu chấm/phẩy và ký hiệu đ.
    return Number(String(value ?? "").replace(/[^\d-]/g, "")) || 0;
  }

  function tien(value) {
    return Math.round(Number(value) || 0).toLocaleString("vi-VN");
  }

  function ngayHomNay() {
    const d = new Date();
    return "Ngày " + String(d.getDate()).padStart(2, "0") +
      " Tháng " + String(d.getMonth() + 1).padStart(2, "0") +
      " Năm " + d.getFullYear();
  }

  function docHang(hang) {
    const soLuong = Number(hang.SoLuong ?? hang.soLuong ?? 0) || 0;
    const donGia = laySo(hang.DonGia ?? hang.donGia ?? 0);
    const thanhTienNhap = hang.ThanhTien ?? hang.thanhTien;
    const thanhTien = thanhTienNhap !== undefined && thanhTienNhap !== ""
      ? laySo(thanhTienNhap)
      : Math.round(soLuong * donGia);

    return {
      ten: hang.TenHang ?? hang.tenHang ?? hang.ten ?? "",
      dvt: hang.DonViTinh ?? hang.dvt ?? hang.donViTinh ?? "",
      soLuong,
      donGia,
      thanhTien
    };
  }

  function taoDongHang(hang, index) {
    const tr = document.createElement("tr");
    const giaTri = [
      index + 1,
      hang.ten,
      hang.dvt,
      tien(hang.soLuong),
      tien(hang.donGia),
      tien(hang.thanhTien)
    ];

    giaTri.forEach(function (value) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    return tr;
  }

  function docDuLieu() {
    try {
      const raw = sessionStorage.getItem("duLieuThueGTGT");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error("Không đọc được dữ liệu hóa đơn GTGT:", error);
      return null;
    }
  }

  function docVaHienThi() {
    const data = docDuLieu();

    // Các thông tin bên bán mặc định theo mẫu hóa đơn bạn gửi.
    ganText("tenCongTy", data?.tenCongTy || "CÔNG TY CỔ PHẦN THIẾT BỊ XÂY DỰNG ĐÔNG DƯƠNG");
    ganText("mstCongTy", data?.mstCongTy || "3702433881");
    ganText("diaChiCongTy", data?.diaChiCongTy || "Số 20B, Đại lộ Bình Dương, Tổ 10, KP.Đông Nhì, Phường Lái Thiêu, TP.Hồ Chí Minh, Việt Nam");
    ganText("taiKhoanCongTy", data?.taiKhoanCongTy || "313868 - Ngân hàng ACB - Chi nhánh An Sương - TP. HCM");
    ganText("kyHieu", data?.kyHieu || "1C26TDD");
    ganText("soHoaDon", data?.soHoaDon || "00000000");
    ganText("maCQT", "00B32BAF3797184862BC87CCA6617883D7");
    ganText("ngayLap", ngayHomNay());

    if (!data) {
      ganText("tienBangChu", "");
      return;
    }

    ganText("nguoiMua", data.nguoiMua || "");
    ganText("khachHang", data.khachHang || "");
    ganText("mstKhachHang", data.mstKhachHang || "");
    ganText("diaChi", data.diaChi || "");
    ganText("hinhThucThanhToan", data.hinhThucThanhToan || "TM/CK");
    ganText("taiKhoanKhachHang", data.taiKhoanKhachHang || "");
    ganText("thueSuat", data.thueSuat ?? "");

    const danhSach = (Array.isArray(data.danhSachHang) ? data.danhSachHang : [])
      .map(docHang)
      .filter(h => h.ten);

    tbody.innerHTML = "";
    danhSach.forEach((hang, index) => tbody.appendChild(taoDongHang(hang, index)));

    const tongTienHang = data.tongTienHang !== undefined && data.tongTienHang !== ""
      ? laySo(data.tongTienHang)
      : danhSach.reduce((sum, hang) => sum + hang.thanhTien, 0);

    const tienVAT = laySo(data.tienVAT ?? data.tienThue ?? 0);
    const tongThanhToan = data.tongThanhToan !== undefined && data.tongThanhToan !== ""
      ? laySo(data.tongThanhToan)
      : tongTienHang + tienVAT;

    ganText("tongTienHang", tien(tongTienHang) + " đ");
    ganText("tienVAT", tien(tienVAT) + " đ");
    ganText("tongThanhToan", tien(tongThanhToan) + " đ");
    ganText("tienBangChu", data.tienBangChu || docTienBangChu(tongThanhToan));
  }

  // Đổi số tiền thành chữ tiếng Việt (đồng).
  function docTienBangChu(number) {
    const n = Math.floor(Math.abs(Number(number) || 0));
    if (n === 0) return "Không đồng.";

    const chuSo = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const donVi = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];

    function docBaSo(num, dayDu) {
      const tram = Math.floor(num / 100);
      const chuc = Math.floor((num % 100) / 10);
      const don = num % 10;
      let s = "";

      if (tram > 0 || dayDu) s += chuSo[tram] + " trăm";
      if (chuc > 1) {
        s += (s ? " " : "") + chuSo[chuc] + " mươi";
        if (don === 1) s += " mốt";
        else if (don === 5) s += " lăm";
        else if (don > 0) s += " " + chuSo[don];
      } else if (chuc === 1) {
        s += (s ? " " : "") + "mười";
        if (don === 5) s += " lăm";
        else if (don > 0) s += " " + chuSo[don];
      } else if (don > 0) {
        s += (s ? " " : (tram > 0 || dayDu ? " " : "")) + (tram > 0 || dayDu ? "lẻ " : "") + chuSo[don];
      }
      return s.trim();
    }

    const groups = [];
    let temp = n;
    while (temp > 0) {
      groups.push(temp % 1000);
      temp = Math.floor(temp / 1000);
    }

    const parts = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i] === 0) continue;
      const needFull = i < groups.length - 1 && groups[i] < 100;
      parts.push(docBaSo(groups[i], needFull) + (donVi[i] || ""));
    }
    let result = parts.join(" ").replace(/\s+/g, " ").trim();
    result = result.charAt(0).toUpperCase() + result.slice(1);
    return result + " đồng.";
  }

  async function xuatPDF() {
    if (typeof window.html2pdf !== "function") {
      alert("Chưa tải được thư viện html2pdf. Vui lòng kiểm tra kết nối mạng.");
      return;
    }

    try {
      btnPDF.disabled = true;
      btnPDF.textContent = "ĐANG TẠO PDF...";

      if (logo && !logo.complete) {
        await new Promise(resolve => {
          logo.onload = resolve;
          logo.onerror = resolve;
        });
      }
      if (document.fonts?.ready) await document.fonts.ready;

      const soHD = (hoaDon.querySelector('[data-field="soHoaDon"]')?.textContent || "00000000")
        .replace(/[\\/:*?"<>|]/g, "_");

      await window.html2pdf().set({
        margin: 0,
        filename: "Hoa_Don_GTGT_" + soHD + ".pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] }
      }).from(document.getElementById("khungHoaDon")).save();

      if (window.parent !== window) {
        window.parent.postMessage({ type: "thueGTGTDaXuat" }, window.location.origin);
      }
    } catch (error) {
      console.error("Lỗi xuất PDF:", error);
      alert("Không thể xuất PDF: " + (error.message || error));
    } finally {
      btnPDF.disabled = false;
      btnPDF.textContent = "XUẤT PDF";
    }
  }

  if (btnPDF) btnPDF.addEventListener("click", xuatPDF);
  docVaHienThi();
});
