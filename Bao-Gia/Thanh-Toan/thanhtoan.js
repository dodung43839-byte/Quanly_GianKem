// =====================================================
// THANHTOAN.JS - NHẬN DỮ LIỆU TỪ TRANG BÁO GIÁ
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
  const vungPhieu = document.getElementById("vungThanhToan");
  if (!vungPhieu) return;

  const phieu = vungPhieu.querySelector(".phieu");
  const tbody = phieu.querySelector('[data-role="danhSachHang"]');
  const oTamUng = document.getElementById("tienTamUng");
  const btnPDF = document.getElementById("btnXuatPDF");

  // Đường dẫn ảnh: thư mục ThanhToan nằm cùng cấp với thư mục images.
  const logo = phieu.querySelector('[data-image="logo"]');
 

  if (logo) {
    logo.src = "../images/logo.png";
    logo.onerror = function () {
      console.error("Không tải được ../images/logo.png");
    };
  }

 function ganText(field, value) {
    const el = phieu.querySelector('[data-field="' + field + '"]');
    if (el) el.textContent = value == null ? "" : value;
  }

  function laySo(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    return Number(String(value || "").replace(/[^\d-]/g, "")) || 0;
  }

  function dinhDangTien(value) {
    return Math.round(Number(value) || 0).toLocaleString("vi-VN") + " đ";
  }

 function layNgay() {
    const d = new Date();

    return "Ngày(Date) " +
        String(d.getDate()).padStart(2, "0") +
        " Tháng(Month) " +
        String(d.getMonth() + 1).padStart(2, "0") +
        " Năm(Year) " +
        d.getFullYear();
}

  function taoDongHang(hang, index) {
    const tr = document.createElement("tr");
    const ten = hang.TenHang ?? hang.tenHang ?? "";
    const dvt = hang.DonViTinh ?? hang.dvt ?? "";
    const soLuong = Number(hang.SoLuong ?? hang.soLuong ?? 0) || 0;
    const donGia = laySo(hang.DonGia ?? hang.donGia ?? 0);
    const thanhTien = Math.round(donGia * soLuong);
    const giaTri = [
      index + 1, ten, dvt, soLuong,
      dinhDangTien(donGia), dinhDangTien(thanhTien)
    ];

    giaTri.forEach(function (value) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    return tr;
  }

  function capNhatConLai() {
    const tongThanhToan = laySo(
      phieu.querySelector('[data-field="tongThanhToan"]')?.dataset.raw || 0
    );
    const tamUngText = oTamUng.value.trim();
    const tamUng = laySo(tamUngText);
    const conLai = tongThanhToan - tamUng;
    ganText("tienConLai", dinhDangTien(conLai));
  }

  function dinhDangOtamUng() {
    const so = laySo(oTamUng.value);
    oTamUng.value = oTamUng.value.trim() === "" ? "" : so.toLocaleString("vi-VN");
    capNhatConLai();
  }

  function napDuLieu() {
    let data = null;
    try {
      const raw = sessionStorage.getItem("duLieuThanhToan");
      if (raw) data = JSON.parse(raw);
    } catch (error) {
      console.error("Không đọc được dữ liệu thanh toán:", error);
    }

    if (!data) {
      ganText("ngayLap", layNgay());
      return;
    }

    ganText("tenCongTy", data.tenCongTy || "CÔNG TY CỔ PHẦN THIẾT BỊ XÂY DỰNG ĐÔNG DƯƠNG");
    ganText("tenCongTyEN", data.tenCongTyEN || "Dong Duong Construction Equipment Joint Stock Company");
    ganText("diaChiCongTy", data.diaChiCongTy || "ĐỊA CHỈ : 145 Tây Thạnh, Phường Tây Thạnh, TP.HCM");
    ganText("dienThoaiCongTy", data.dienThoaiCongTy || "ĐIỆN THOẠI : 0986.007.646 (Hà Thị Thủy)");
    ganText("soDonHang", data.soDonHang || "");
    ganText("ngayLap", layNgay());
    ganText("khachHang", data.khachHang || "");
    ganText("diaChi", data.diaChi || "");
    ganText("dienThoai", data.dienThoai || "");

    const tongTienHang = laySo(data.tongTienHang);
    const tienVAT = laySo(data.tienVAT);
    // VAT được truyền vào là số tiền trực tiếp, không tính theo phần trăm.
    const tongThanhToan = tongTienHang + tienVAT;

    ganText("tongTienHang", dinhDangTien(tongTienHang));
    ganText("tienVAT", dinhDangTien(tienVAT));
    const elTong = phieu.querySelector('[data-field="tongThanhToan"]');
    if (elTong) {
      elTong.dataset.raw = String(tongThanhToan);
      elTong.textContent = dinhDangTien(tongThanhToan);
    }

    tbody.innerHTML = "";
    (Array.isArray(data.danhSachHang) ? data.danhSachHang : [])
      .forEach(function (hang, index) {
        tbody.appendChild(taoDongHang(hang, index));
      });

    // Ô tạm ứng luôn để trống khi mở phiếu.
    oTamUng.value = "";
    capNhatConLai();
  }

  oTamUng.addEventListener("input", dinhDangOtamUng);

  if (btnPDF) {
    btnPDF.addEventListener("click", xuatPDF);
  }

  async function xuatPDF() {
    if (typeof window.html2pdf !== "function") {
      alert("Chưa tải được thư viện html2pdf.");
      return;
    }

    try {
      btnPDF.disabled = true;
      btnPDF.textContent = "ĐANG TẠO PDF...";

      // Chờ logo và con dấu tải xong (nếu có).
      await Promise.all(Array.from(phieu.querySelectorAll("img")).map(function (img) {
        if (img.complete) return Promise.resolve();
        return new Promise(function (resolve) {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      const soDon = (phieu.querySelector('[data-field="soDonHang"]')?.textContent || "ThanhToan")
        .replace(/[\\/:*?"<>|]/g, "_");

      await window.html2pdf().set({
        margin: [8, 8, 8, 8],
        filename: "Phieu_Thanh_Toan_" + soDon + ".pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] }
      }).from(phieu).save();

      if (window.parent !== window) {
        window.parent.postMessage({ type: "thanhToanDaXuat" }, window.location.origin);
      }
    } catch (error) {
      console.error("Lỗi xuất PDF:", error);
      alert("Không thể xuất PDF: " + (error.message || error));
    } finally {
      btnPDF.disabled = false;
      btnPDF.textContent = "XUẤT PDF";
    }
  }

  napDuLieu();
});
function hienThiNgayHienTai() {
    const ngay = new Date();

    const ngayHienTai = 
        String(ngay.getDate()).padStart(2, "0") +
        " Tháng " +
        String(ngay.getMonth() + 1).padStart(2, "0") +
        " Năm " +
        ngay.getFullYear();

    document.getElementById("ngayBaoGia").textContent = ngayHienTai;
    document.getElementById("ngayHopDong").textContent = ngayHienTai;
}

hienThiNgayHienTai();