// =====================================================
// CHỨNG NHẬN XUẤT XƯỞNG - xuatxuong.js
// Nhận dữ liệu từ index.html qua sessionStorage
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
  const phieu = document.getElementById("phieuXuatXuong");
  const tbody = document.getElementById("danhSachHang");
  if (!phieu || !tbody) return;

  function ngayHienTai() {
    const d = new Date();
    return {
      ngay: String(d.getDate()).padStart(2, "0"),
      thang: String(d.getMonth() + 1).padStart(2, "0"),
      nam: d.getFullYear(),
    };
  }

  function dinhDangNgay(d) {
    return `Ngày(Date) ${d.ngay} Tháng(Month) ${d.thang} Năm(Year) ${d.nam}`;
  }

  function ganNgayMacDinh(id) {
    const o = document.getElementById(id);
    if (o && !o.value.trim()) o.value = dinhDangNgay(ngayHienTai());
  }

  ["ngayLap", "ngayXuatXuong", "ngayGiaoHang", "ngayCap"].forEach(
    ganNgayMacDinh,
  );

  // Các ô ngày tự động có ngày hiện tại nhưng vẫn cho phép sửa.
  const ngay = dinhDangNgay(ngayHienTai());
  ["ngayLap", "ngayXuatXuong", "ngayGiaoHang", "ngayCap"].forEach(
    function (id) {
      const el = document.getElementById(id);
      if (el && !el.value) el.value = ngay;
    },
  );

  // Nạp thông tin khách hàng do index.html chuyển sang.
  const mapThongTin = {
    khachHang: "khachHangPhieuXuatXuong",
    diaChi: "diaChiPhieuXuatXuong",
    dienThoai: "dienThoaiPhieuXuatXuong",
  };

  Object.keys(mapThongTin).forEach(function (id) {
    const value = sessionStorage.getItem(mapThongTin[id]);
    const el = document.getElementById(id);
    if (el && value) el.value = value;
  });

  // Khôi phục các trường mặc định nếu trang được mở độc lập.
  const soChungTu = document.getElementById("soChungTu");
  const soPhieuGiao = document.getElementById("soPhieuGiao");
  if (soChungTu && !soChungTu.value) soChungTu.value = "1803";
  if (soPhieuGiao && !soPhieuGiao.value) soPhieuGiao.value = "DD-13346";

  function docBaSo(n, docDayDu) {
    const chuSo = [
      "không",
      "một",
      "hai",
      "ba",
      "bốn",
      "năm",
      "sáu",
      "bảy",
      "tám",
      "chín",
    ];
    const tram = Math.floor(n / 100);
    const chuc = Math.floor((n % 100) / 10);
    const donVi = n % 10;
    const kq = [];

    if (tram > 0) kq.push(chuSo[tram] + " trăm");
    else if (docDayDu) kq.push("không trăm");

    if (chuc === 0) {
      if (donVi > 0 && (tram > 0 || docDayDu)) kq.push("lẻ");
    } else if (chuc === 1) kq.push("mười");
    else kq.push(chuSo[chuc] + " mươi");

    if (donVi > 0) {
      let ten = chuSo[donVi];
      if (chuc >= 2 && donVi === 1) ten = "mốt";
      if (chuc >= 2 && donVi === 4) ten = "tư";
      if (chuc >= 1 && donVi === 5) ten = "lăm";
      kq.push(ten);
    }
    return kq.join(" ");
  }

  function docSoThanhChu(giaTri) {
    const chuoi = String(giaTri ?? "").trim();
    if (!chuoi) return "";
    const so = Number(chuoi.replace(/,/g, "").replace(/\./g, ""));
    if (!Number.isSafeInteger(so) || so < 0) return chuoi;
    if (so === 0) return "không";

    const donViNhom = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];
    const cacNhom = [];
    let conLai = so,
      viTri = 0;
    while (conLai > 0) {
      const nhom = conLai % 1000;
      if (nhom > 0) cacNhom.push({ giaTri: nhom, viTri });
      conLai = Math.floor(conLai / 1000);
      viTri++;
    }
    if (viTri > donViNhom.length) return chuoi;
    cacNhom.reverse();
    return cacNhom
      .map(
        (nhom, i) =>
          docBaSo(nhom.giaTri, i > 0) +
          (donViNhom[nhom.viTri] ? " " + donViNhom[nhom.viTri] : ""),
      )
      .join(" ");
  }

  function taoDong(hang, index) {
    const tr = document.createElement("tr");
    const soLuong = String(hang.soLuong ?? "").trim();
    const values = [
      String(index + 1),
      String(hang.tenHang || "").trim(),
      String(hang.dvt || "").trim(),
      soLuong,
      soLuong,
      hang.tieuChuan || "QUATEST3",
    ];

    values.forEach(function (value, i) {
      const td = document.createElement("td");
      td.textContent = i === 4 ? value || "" : value;
      if (i === 1) td.className = "ten-hang";
      tr.appendChild(td);
    });
    return tr;
  }

  window.napHangHoaTuBangBaoGia = function (danhSachHang) {
    if (!Array.isArray(danhSachHang)) return;
    tbody.innerHTML = "";
    danhSachHang.forEach(function (hang) {
      if (String(hang.tenHang || "").trim()) {
        tbody.appendChild(taoDong(hang, tbody.rows.length));
      }
    });
    if (!tbody.rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td colspan="6" class="empty-row">Chưa có hàng hóa trong phiếu.</td>';
      tbody.appendChild(tr);
    }
  };

  // Nhận danh sách hàng hóa từ index.html.
  const duLieu = sessionStorage.getItem("duLieuPhieuXuatXuong");
  if (duLieu) {
    try {
      window.napHangHoaTuBangBaoGia(JSON.parse(duLieu));
      sessionStorage.removeItem("duLieuPhieuXuatXuong");
    } catch (err) {
      console.error("Không đọc được dữ liệu hàng hóa:", err);
    }
  }

  // Xuất PDF.
  const btnPDF = document.getElementById("btnXuatPDF");
  if (btnPDF) btnPDF.addEventListener("click", xuatPDF);

  async function xuatPDF() {
    if (typeof window.html2pdf !== "function") {
      alert(
        "Chưa tải được thư viện html2pdf. Vui lòng kiểm tra kết nối Internet.",
      );
      return;
    }
    const btn = document.getElementById("btnXuatPDF");
    const so = (
      document.getElementById("soPhieuGiao")?.value || "DD-13346"
    ).trim();
    const tenFile = "xuatxuong.pdf";

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "ĐANG TẠO PDF...";
      }
      const images = Array.from(phieu.querySelectorAll("img"));
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              }),
        ),
      );
      if (document.fonts?.ready) await document.fonts.ready;

      await window
        .html2pdf()
        .set({
          filename: tenFile,
          margin: [3, 0, 5, 0],
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            scrollY: 0,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(phieu)
        .save();

      if (window.parent !== window) {
        window.parent.postMessage(
          { type: "chungNhanXuatXuongDaXuat" },
          window.location.origin,
        );
      }
    } catch (err) {
      console.error("Lỗi xuất PDF:", err);
      alert("Không thể xuất PDF: " + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "XUẤT PDF";
      }
    }
  }
});
