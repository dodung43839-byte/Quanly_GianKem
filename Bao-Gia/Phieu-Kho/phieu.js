/* =====================================================
   PHIẾU XUẤT KHO - JAVASCRIPT
   KẾT NỐI VỚI INDEX.HTML
   ===================================================== */

document.addEventListener("DOMContentLoaded", function () {
  khoiTaoSoPhieuXuatKho();
  // =================================================
  // 1. KIỂM TRA VÙNG PHIẾU
  // =================================================

  const vungPhieu = document.getElementById("vungTaoPhieu");

  if (!vungPhieu) {
    console.error("Không tìm thấy vùng tạo phiếu.");
    return;
  }

  const phieu = vungPhieu.querySelector(".phieu");

  if (!phieu) {
    console.error("Không tìm thấy nội dung phiếu.");
    return;
  }

  const tbody = phieu.querySelector('[data-role="danhSachHang"]');

  if (!tbody) {
    console.error("Không tìm thấy bảng hàng hóa.");
    return;
  }

  // =================================================
  // 2. HÀM ĐIỀN NỘI DUNG
  // =================================================

  function phieuGanText(field, value) {
    const el = phieu.querySelector('[data-field="' + field + '"]');

    if (el) {
      el.textContent = value || "";
    }
  }

  // =================================================
  // 3. THÔNG TIN CÔNG TY
  // =================================================

  phieuGanText("tenCongTy", "CÔNG TY CỔ PHẦN THIẾT BỊ XÂY DỰNG ĐÔNG DƯƠNG");

  phieuGanText(
    "tenCongTyEN",
    "Dong Duong Construction Equipment Joint Stock Company",
  );

  phieuGanText(
    "diaChiCongTy",
    "ĐỊA CHỈ : 145 Tây Thạnh, Phường Tây Thạnh, TP.HCM",
  );

  phieuGanText("dienThoaiCongTy", "ĐIỆN THOẠI : 0986.007.646 (Hà Thị Thủy)");

  // =================================================
  // 4. LOGO VÀ CON DẤU
  // =================================================

  const logo = phieu.querySelector('[data-image="logo"]');

  const conDau = phieu.querySelector('[data-image="conDau"]');

  if (logo) {
    logo.src = "../images/logo.png";

    logo.onerror = function () {
      console.error("Không tải được logo.");
    };
  }

  if (conDau) {
    conDau.src = "../images/con-dau.png";

    conDau.onerror = function () {
      console.error("Không tải được con dấu.");
    };
  }

  // =================================================
  // 5. THÔNG TIN PHIẾU
  // =================================================
  // =================================================
  // 5. THÔNG TIN PHIẾU
  // =================================================

  // LẤY NGÀY HIỆN TẠI

  function layNgayLapPhieu() {
    const homNay = new Date();

    const ngay = String(homNay.getDate()).padStart(2, "0");

    const thang = String(homNay.getMonth() + 1).padStart(2, "0");

    const nam = homNay.getFullYear();

    return (
      "Ngày(Date) " + ngay + " Tháng(Month) " + thang + " Năm(Year) " + nam
    );
  }

  phieuGanText("ngayLap", layNgayLapPhieu());

  // QUYỂN SỐ VÀ PHIẾU SỐ

  phieuGanText("quyenSo", "10");
  phieuGanText("soPhieu", "00045");

  // THÔNG TIN KHÁCH HÀNG
  // Sẽ nhận từ trang báo giá

  // THÔNG TIN KHÁCH HÀNG
  // Nhận từ trang báo giá

  phieuGanText(
    "khachHang",
    sessionStorage.getItem("khachHangPhieuXuatKho") || "",
  );

  phieuGanText("diaChi", sessionStorage.getItem("diaChiPhieuXuatKho") || "");

  phieuGanText(
    "dienThoai",
    sessionStorage.getItem("dienThoaiPhieuXuatKho") || "",
  );
  // =================================================
  // 6. ĐỔI SỐ THÀNH CHỮ TIẾNG VIỆT
  // =================================================

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

    if (tram > 0) {
      kq.push(chuSo[tram] + " trăm");
    } else if (docDayDu) {
      kq.push("không trăm");
    }

    if (chuc === 0) {
      if (donVi > 0 && (tram > 0 || docDayDu)) {
        kq.push("lẻ");
      }
    } else if (chuc === 1) {
      kq.push("mười");
    } else {
      kq.push(chuSo[chuc] + " mươi");
    }

    if (donVi > 0) {
      let tenDonVi = chuSo[donVi];

      if (chuc >= 2 && donVi === 1) {
        tenDonVi = "mốt";
      }

      if (chuc >= 2 && donVi === 4) {
        tenDonVi = "tư";
      }

      if (chuc >= 1 && donVi === 5) {
        tenDonVi = "lăm";
      }

      kq.push(tenDonVi);
    }

    return kq.join(" ");
  }

  function phieuDocSoThanhChu(giaTri) {
    const chuoi = String(giaTri || "").trim();

    if (!chuoi) return "";

    const so = Number(chuoi.replace(/,/g, ""));

    if (!Number.isSafeInteger(so) || so < 0) {
      return chuoi;
    }

    if (so === 0) return "không";

    const donViNhom = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];

    let conLai = so;
    let cacNhom = [];
    let viTri = 0;

    while (conLai > 0) {
      const nhom = conLai % 1000;

      if (nhom > 0) {
        cacNhom.push({
          giaTri: nhom,
          viTri: viTri,
        });
      }

      conLai = Math.floor(conLai / 1000);
      viTri++;
    }

    if (viTri > donViNhom.length) {
      return chuoi;
    }

    cacNhom.reverse();

    const ketQua = cacNhom.map(function (nhom, index) {
      const coNhomTruoc = index > 0;

      return (
        docBaSo(nhom.giaTri, coNhomTruoc) +
        (donViNhom[nhom.viTri] ? " " + donViNhom[nhom.viTri] : "")
      );
    });

    return ketQua.join(" ");
  }

  // =================================================
  // 7. HÀM TẠO DÒNG HÀNG HÓA
  //
  // CỘT 1: TÊN HÀNG
  // CỘT 2: ĐVT
  // CỘT 3: SỐ LƯỢNG
  // CỘT 4: THỰC NHẬN = SỐ LƯỢNG
  // CỘT 5: BẰNG CHỮ
  // =================================================

  function phieuTaoDong(tenHang, dvt, soLuong) {
    const tr = document.createElement("tr");

    const thucNhan = soLuong || "";

    const bangChu = phieuDocSoThanhChu(soLuong);

    const values = [tenHang || "", dvt || "", soLuong || "", thucNhan, bangChu];

    values.forEach(function (value, index) {
      const td = document.createElement("td");

      td.textContent = value;

      if (index === 0) {
        td.className = "ten-hang";
      }

      if (index === 4) {
        td.className = "bang-chu";
      }

      tr.appendChild(td);
    });

    return tr;
  }

  // =================================================
  // 8. KHỞI TẠO BẢNG
  // KHÔNG TẠO 12 DÒNG TRỐNG
  // =================================================

  tbody.innerHTML = "";

  // =================================================
  // 9. NHẬN DỮ LIỆU TỪ TRANG BÁO GIÁ
  // =================================================

  window.napHangHoaTuBangBaoGia = function (danhSachHang) {
    if (!Array.isArray(danhSachHang)) {
      console.error("Dữ liệu hàng hóa không hợp lệ.");

      return;
    }

    tbody.innerHTML = "";

    danhSachHang.forEach(function (hang) {
      const tenHang = String(hang.tenHang || "").trim();

      const dvt = String(hang.dvt || "").trim();

      const soLuong = String(hang.soLuong ?? "").trim();

      if (!tenHang) return;

      tbody.appendChild(phieuTaoDong(tenHang, dvt, soLuong));
    });

    console.log("Đã nhận", tbody.rows.length, "dòng hàng hóa.");
  };

  // =================================================
  // 10. NÚT XUẤT PDF THỦ CÔNG
  // =================================================

  const btnPDF = document.getElementById("btnXuatPDF");

  if (btnPDF) {
    btnPDF.addEventListener("click", taiPhieuXuatKho);
  }

  // =================================================
  // 11. NHẬN DỮ LIỆU TỪ INDEX
  // TỰ ĐỘNG XUẤT PDF
  // =================================================

  const duLieu = sessionStorage.getItem("duLieuPhieuXuatKho");

  if (duLieu) {
    try {
      const danhSachHang = JSON.parse(duLieu);

      window.napHangHoaTuBangBaoGia(danhSachHang);

      // Xóa dữ liệu sau khi nhận
      sessionStorage.removeItem("duLieuPhieuXuatKho");

      if (tbody.rows.length > 0) {
        setTimeout(function () {
          taiPhieuXuatKho();
        }, 700);
      } else {
        alert("Không có hàng hóa hợp lệ để xuất kho.");
      }
    } catch (loi) {
      console.error("Lỗi nhận dữ liệu:", loi);

      alert("Dữ liệu phiếu xuất kho không hợp lệ.");
    }
  }

  console.log("Đã khởi tạo phiếu xuất kho.");
});
// =====================================================
// 11.5 QUẢN LÝ SỐ PHIẾU XUẤT KHO
// =====================================================

function khoiTaoSoPhieuXuatKho() {

  const oSoPhieu = document.getElementById("soPhieuXuatKho");

  if (!oSoPhieu) return;

  try {

    const soDaLuu = localStorage.getItem("soPhieuXuatKho");

    if (soDaLuu) {
      oSoPhieu.value = soDaLuu;
    }

  } catch (loi) {

    console.error("Không đọc được số phiếu đã lưu:", loi);

  }

}

// =====================================================
// 12. HÀM XUẤT PDF
// =====================================================

async function taiPhieuXuatKho() {

    const phieu = document.getElementById("vungTaoPhieu");

    if (!phieu) {
        alert("Không tìm thấy phiếu xuất kho.");
        return;
    }

    if (typeof window.html2pdf !== "function") {
        alert("Chưa tải được thư viện html2pdf.");
        return;
    }

    const btn = document.getElementById("btnXuatPDF");

    // LẤY SỐ PHIẾU TỪ Ô INPUT
    const oSoPhieu = document.getElementById("soPhieuXuatKho");

    const soPhieu = oSoPhieu
        ? oSoPhieu.value.trim()
        : "00045";

    if (!soPhieu) {
        alert("Vui lòng nhập số phiếu.");
        return;
    }

    try {

        if (btn) {
            btn.disabled = true;
            btn.textContent = "Đang tạo PDF...";
        }

        // TÊN FILE THEO SỐ PHIẾU
        const tenFile =
            "Phieu_Xuat_Kho_" +
            soPhieu.replace(/[\\/:*?"<>|]/g, "_") +
            ".pdf";

        // CHỜ HÌNH ẢNH TẢI XONG
        const images = Array.from(phieu.querySelectorAll("img"));

        await Promise.all(
            images.map(function (img) {

                if (img.complete) {
                    return Promise.resolve();
                }

                return new Promise(function (resolve) {
                    img.onload = resolve;
                    img.onerror = resolve;
                });

            })
        );

        // CHỜ FONT CHỮ
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        // CẤU HÌNH XUẤT PDF
        const tuyChonPDF = {

            margin: [8, 8, 8, 8],

            filename: tenFile,

            image: {
                type: "jpeg",
                quality: 0.98
            },

            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                scrollY: 0
            },

            jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait"
            },

            pagebreak: {
                mode: ["css", "legacy"]
            }

        };

        // TIẾN HÀNH XUẤT PDF
        await window.html2pdf()
            .set(tuyChonPDF)
            .from(phieu)
            .save();

        console.log("Xuất PDF thành công.");

        // TĂNG VÀ TỰ ĐỘNG LƯU SỐ PHIẾU
        if (oSoPhieu) {

            const soMoi = Number(soPhieu) + 1;

            const soPhieuMoi = String(soMoi).padStart(5, "0");

            // CẬP NHẬT Ô SỐ PHIẾU
            oSoPhieu.value = soPhieuMoi;

            // LƯU SỐ PHIẾU VÀO LOCALSTORAGE
            try {

                localStorage.setItem(
                    "soPhieuXuatKho",
                    soPhieuMoi
                );

            } catch (loi) {

                console.error("Không lưu được số phiếu:", loi);

                alert("Không lưu được số phiếu kế tiếp.");

            }

        }

        // THÔNG BÁO CHO TRANG CHÍNH BIẾT ĐÃ XUẤT PDF XONG
        if (window.parent !== window) {

            window.parent.postMessage(
                { type: "phieuXuatKhoDaXuat" },
                window.location.origin
            );

        }

    } catch (loi) {

        console.error("Lỗi xuất PDF:", loi);

        alert("Không thể xuất PDF: " + loi.message);

    } finally {

        if (btn) {
            btn.disabled = false;
            btn.textContent = "XUẤT PDF";
        }

    }

}
