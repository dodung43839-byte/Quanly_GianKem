// ==========================================
// LẤY CÁC ĐỐI TƯỢNG HTML
// ==========================================

const txtTimKiem = document.getElementById("txtTimKiem");
const listbox = document.getElementById("listbox");
const bangHoaDon = document.querySelector("#bangHoaDon tbody");

const btnXoa = document.getElementById("btnXoa");
const btnXoaHet = document.getElementById("btnXoaHet");
const btnLuu = document.getElementById("btnLuu");
const btnXuatPDF = document.getElementById("btnXuatPDF");

// ==========================================
// BIẾN DỮ LIỆU
// ==========================================

let duLieuNguon = [];
let duLieuDVT = [];

let dongDangChon = null;

// ==========================================
// HÀM ĐỊNH DẠNG SỐ
// ==========================================

// Làm tròn + phân cách hàng nghìn
function dinhDangSo(so) {
  so = Number(so) || 0;

  so = Math.round(so);

  return so.toLocaleString("vi-VN");
}

// ==========================================
// HÀM LẤY SỐ TỪ CHUỖI
// ==========================================

function laySo(chuoi) {
  if (chuoi === null || chuoi === undefined) {
    return 0;
  }

  return Number(String(chuoi).replace(/[^\d-]/g, "")) || 0;
}

// ==========================================
// ĐỌC Nguon.json + DVT.json
// ==========================================

Promise.all([
  fetch("Nguon.json").then(function (response) {
    if (!response.ok) {
      throw new Error("Không đọc được Nguon.json");
    }

    return response.json();
  }),

  fetch("DVT.json").then(function (response) {
    if (!response.ok) {
      throw new Error("Không đọc được DVT.json");
    }

    return response.json();
  }),
])

  .then(function (duLieu) {
    // Dữ liệu hàng
    duLieuNguon = duLieu[0];

    // Dữ liệu đơn vị tính + giá
    duLieuDVT = duLieu[1];

    // Hiển thị Listbox
    hienThiListbox();
  })

  .catch(function (loi) {
    console.error(loi);

    listbox.innerHTML = "Không đọc được dữ liệu JSON";
  });

// ==========================================
// HIỂN THỊ LISTBOX
// ==========================================

function hienThiListbox() {
  listbox.innerHTML = "";

  duLieuNguon.forEach(function (hang) {
    const dong = document.createElement("div");

    dong.className = "hang";

    // Hiển thị tên hàng
    dong.textContent = hang.TenHang;

    // Lưu mã sản phẩm
    dong.dataset.maSP = hang.MaSP;

    // ==================================
    // CLICK LISTBOX
    // ==================================

    dong.addEventListener("click", function () {
      const maSP = this.dataset.maSP;

      themHangVaoHoaDon(maSP);
    });

    listbox.appendChild(dong);
  });
}

// ==========================================
// TÌM KIẾM HÀNG
// ==========================================

txtTimKiem.addEventListener("input", function () {
  const tuKhoa = this.value.toLowerCase().trim();

  const cacHang = document.querySelectorAll(".hang");

  cacHang.forEach(function (hang) {
    const tenHang = hang.textContent.toLowerCase();

    if (tenHang.includes(tuKhoa)) {
      hang.style.display = "";
    } else {
      hang.style.display = "none";
    }
  });
});

// ==========================================
// THÊM HÀNG VÀO BẢNG
// ==========================================

function themHangVaoHoaDon(maSP) {
  // --------------------------------------
  // TÌM HÀNG TRONG Nguon.json
  // --------------------------------------

  const hangNguon = duLieuNguon.find(function (hang) {
    return hang.MaSP === maSP;
  });

  if (!hangNguon) {
    alert("Không tìm thấy mã hàng: " + maSP);

    return;
  }

  // --------------------------------------
  // KIỂM TRA HÀNG ĐÃ CÓ CHƯA
  // --------------------------------------

  const cacDong = bangHoaDon.querySelectorAll("tr");

  let dongDaCo = null;

  cacDong.forEach(function (dong) {
    const maTrongBang = dong.cells[1].textContent.trim();

    if (maTrongBang === maSP) {
      dongDaCo = dong;
    }
  });

  // ======================================
  // NẾU ĐÃ CÓ
  // CHỈ TĂNG SỐ LƯỢNG +1
  // ======================================

  if (dongDaCo) {
    const inputSoLuong = dongDaCo.cells[5].querySelector("input");

    let soLuong = Number(inputSoLuong.value) || 0;

    inputSoLuong.value = soLuong + 1;

    dongDangChon = dongDaCo;

    chonDong(dongDaCo);

    tinhThanhTienDong(dongDaCo);

    return;
  }

  // ======================================
  // HÀNG CHƯA CÓ
  // TẠO DÒNG MỚI
  // ======================================

  const tenHang = hangNguon.TenHang;

  // --------------------------------------
  // LẤY DANH SÁCH ĐVT
  // --------------------------------------

  const danhSachDVT = duLieuDVT.filter(function (dvt) {
    return dvt.MaSP === maSP;
  });

  // --------------------------------------
  // TẠO DÒNG
  // --------------------------------------

  const dong = document.createElement("tr");

  // ======================================
  // CỘT 1 - STT
  // ======================================

  const oSTT = document.createElement("td");

  dong.appendChild(oSTT);

  // ======================================
  // CỘT 2 - MÃ HÀNG
  // ======================================

  const oMaSP = document.createElement("td");

  oMaSP.textContent = maSP;

  dong.appendChild(oMaSP);

  // ======================================
  // CỘT 3 - TÊN HÀNG
  // ======================================

  const oTenHang = document.createElement("td");

  const inputTenHang = document.createElement("input");

  inputTenHang.type = "text";

  inputTenHang.value = tenHang;

  inputTenHang.style.width = "100%";

  inputTenHang.style.boxSizing = "border-box";

  oTenHang.appendChild(inputTenHang);

  dong.appendChild(oTenHang);

  // ======================================
  // CỘT 4 - ĐVT
  // ======================================

  const oDVT = document.createElement("td");

  const selectDVT = document.createElement("select");

  selectDVT.style.width = "100%";

  // --------------------------------------
  // THÊM CÁC ĐVT
  // --------------------------------------

  danhSachDVT.forEach(function (dvt) {
    const option = document.createElement("option");

    option.value = dvt.DonViTinh;

    option.textContent = dvt.DonViTinh;

    selectDVT.appendChild(option);
  });

  oDVT.appendChild(selectDVT);

  dong.appendChild(oDVT);

  // ======================================
  // CỘT 5 - ĐƠN GIÁ
  // ======================================

  const oDonGia = document.createElement("td");

  const inputDonGia = document.createElement("input");

  inputDonGia.type = "text";

  inputDonGia.inputMode = "numeric";

  inputDonGia.style.width = "100%";

  inputDonGia.style.boxSizing = "border-box";

  inputDonGia.style.textAlign = "right";

  // --------------------------------------
  // LẤY GIÁ GIASX
  // CỦA ĐVT ĐẦU TIÊN
  // --------------------------------------

  if (danhSachDVT.length > 0) {
    const dvtDauTien = danhSachDVT[0];

    inputDonGia.value = dinhDangSo(dvtDauTien.GiaSX);
  } else {
    inputDonGia.value = "0";
  }

  oDonGia.appendChild(inputDonGia);

  dong.appendChild(oDonGia);

  // ======================================
  // CỘT 6 - SỐ LƯỢNG
  // ======================================

  const oSoLuong = document.createElement("td");

  const inputSoLuong = document.createElement("input");

  inputSoLuong.type = "number";

  inputSoLuong.value = 1;

  inputSoLuong.min = 0;

  inputSoLuong.step = "1";

  inputSoLuong.style.width = "100%";

  inputSoLuong.style.boxSizing = "border-box";

  inputSoLuong.style.textAlign = "right";

  oSoLuong.appendChild(inputSoLuong);

  dong.appendChild(oSoLuong);

  // ======================================
  // CỘT 7 - THÀNH TIỀN
  // ======================================

  const oThanhTien = document.createElement("td");

  const spanThanhTien = document.createElement("span");

  spanThanhTien.textContent = "0";

  oThanhTien.appendChild(spanThanhTien);

  dong.appendChild(oThanhTien);

  // ======================================
  // ĐỔI ĐƠN GIÁ
  // ======================================

  inputDonGia.addEventListener("input", function () {
    let gia = laySo(this.value);

    this.value = dinhDangSo(gia);

    tinhThanhTienDong(dong);
  });

  // ======================================
  // ĐỔI SỐ LƯỢNG
  // ======================================

  inputSoLuong.addEventListener("input", function () {
    tinhThanhTienDong(dong);
  });

  // ======================================
  // ĐỔI ĐVT
  // ======================================

  selectDVT.addEventListener("change", function () {
    const dvtDuocChon = danhSachDVT.find(function (dvt) {
      return dvt.DonViTinh === selectDVT.value;
    });

    if (dvtDuocChon) {
      inputDonGia.value = dinhDangSo(dvtDuocChon.GiaSX);
    }

    tinhThanhTienDong(dong);
  });

  // ======================================
  // CLICK CHỌN DÒNG
  // ======================================

  dong.addEventListener("click", function () {
    chonDong(dong);
  });

  // ======================================
  // THÊM VÀO BẢNG
  // ======================================

  bangHoaDon.appendChild(dong);

  // Cập nhật STT
  capNhatSTT();

  // Chọn dòng vừa thêm
  chonDong(dong);

  // Tính tiền
  tinhThanhTienDong(dong);
}

// ==========================================
// CHỌN DÒNG
// ==========================================

function chonDong(dong) {
  // Bỏ chọn tất cả
  const cacDong = bangHoaDon.querySelectorAll("tr");

  cacDong.forEach(function (item) {
    item.classList.remove("dong-duoc-chon");
  });

  // Chọn dòng hiện tại
  dong.classList.add("dong-duoc-chon");

  dongDangChon = dong;
}

// ==========================================
// CẬP NHẬT STT
// ==========================================

function capNhatSTT() {
  const cacDong = bangHoaDon.querySelectorAll("tr");

  cacDong.forEach(function (dong, index) {
    dong.cells[0].textContent = index + 1;
  });
}

// ==========================================
// TÍNH THÀNH TIỀN MỘT DÒNG
// ==========================================

function tinhThanhTienDong(dong) {
  const inputDonGia = dong.cells[4].querySelector("input");

  const inputSoLuong = dong.cells[5].querySelector("input");

  const spanThanhTien = dong.cells[6].querySelector("span");

  const donGia = laySo(inputDonGia.value);

  const soLuong = Number(inputSoLuong.value) || 0;

  const thanhTien = Math.round(donGia * soLuong);

  spanThanhTien.textContent = dinhDangSo(thanhTien);

  // Tính tổng
  tinhTongTien();
}

// ==========================================
// TÍNH TỔNG TIỀN HÀNG
// ==========================================

function tinhTongTien() {
  let tongTien = 0;

  const cacDong = bangHoaDon.querySelectorAll("tr");

  cacDong.forEach(function (dong) {
    const thanhTien = laySo(dong.cells[6].textContent);

    tongTien += thanhTien;
  });

  document.getElementById("tongTien").textContent = dinhDangSo(tongTien);

  tinhTongThanhToan();
}

// ==========================================
// TÍNH THUẾ + TỔNG THANH TOÁN
// ==========================================

function tinhTongThanhToan() {
  const tongTien = laySo(document.getElementById("tongTien").textContent);

  const thue = Number(document.getElementById("thueGTGT").value) || 0;

  const tienThue = Math.round((tongTien * thue) / 100);

  const tongThanhToan = tongTien + tienThue;

  document.getElementById("tienThue").textContent = dinhDangSo(tienThue);

  document.getElementById("tongThanhToan").textContent =
    dinhDangSo(tongThanhToan);
  capNhatTienBangChu();
}

// ==========================================
// THAY ĐỔI THUẾ
// ==========================================

document
  .getElementById("thueGTGT")
  .addEventListener("input", tinhTongThanhToan);
// ==========================================
// TỰ ĐỘNG CHUYỂN TÊN KHÁCH HÀNG THÀNH IN HOA
// ==========================================

const tenKhachHang = document.getElementById("tenKhachHang");

tenKhachHang.addEventListener("input", function () {
  this.value = this.value.toLocaleUpperCase("vi-VN");
});
// ==========================================
// ĐỊA CHỈ - VIẾT HOA CHỮ CÁI ĐẦU MỖI TỪ
// ==========================================

const diaChi = document.getElementById("diaChi");

diaChi.addEventListener("input", function () {
  this.value = this.value
    .toLocaleLowerCase("vi-VN")
    .replace(/(^|\s)\S/g, function (chu) {
      return chu.toLocaleUpperCase("vi-VN");
    });
});

function capNhatTienBangChu() {
  const tongTien = document.getElementById("tongThanhToan");
  const tienBangChu = document.getElementById("tienBangChu");

  if (!tongTien || !tienBangChu) return;

  const soTien = Number(tongTien.textContent.replace(/[^\d-]/g, ""));

  let chu = docSoThanhChu(soTien);

  chu = chu.toLocaleLowerCase("vi-VN");

  chu = chu.charAt(0).toLocaleUpperCase("vi-VN") + chu.slice(1);

  tienBangChu.value = chu;
}
/* =====================================
   TỰ ĐỘNG LẤY NGÀY LẬP BÁO GIÁ
   ===================================== */
document.addEventListener("DOMContentLoaded", function () {
  const ngayLap = document.getElementById("ngayLap");

  if (ngayLap) {
    const homNay = new Date();

    const ngay = String(homNay.getDate()).padStart(2, "0");
    const thang = String(homNay.getMonth() + 1).padStart(2, "0");
    const nam = homNay.getFullYear();

    ngayLap.value = `${ngay}-${thang}-${nam}`;

    ngayLap.addEventListener("input", function () {
      let so = this.value.replace(/\D/g, "").slice(0, 8);

      let ketQua = "";

      if (so.length > 0) {
        ketQua = so.slice(0, 2);
      }

      if (so.length > 2) {
        ketQua += "-" + so.slice(2, 4);
      }

      if (so.length > 4) {
        ketQua += "-" + so.slice(4, 8);
      }

      this.value = ketQua;
    });
  }
});

/* =====================================================
   XÓA NỘI DUNG Ô NHẬP
   ===================================================== */

function xoaNoiDung(id) {
  const oNhap = document.getElementById(id);

  if (!oNhap) return;

  oNhap.value = "";

  oNhap.dispatchEvent(new Event("input", { bubbles: true }));

  oNhap.focus();
}

// =====================================================
// NÚT XUẤT KHO - LẤY DỮ LIỆU TỪ BẢNG BÁO GIÁ
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
  const btnXuatKho = document.getElementById("btnXuatKho");

  if (!btnXuatKho) return;

  btnXuatKho.addEventListener("click", function () {
    // =====================================================
    // 1. KIỂM TRA BẢNG BÁO GIÁ
    // =====================================================

    const tbody = document.querySelector("#bangHoaDon tbody");

    if (!tbody) {
      alert("Không tìm thấy bảng báo giá!");
      return;
    }

    const cacDong = Array.from(tbody.querySelectorAll("tr"));

    const danhSachHang = [];

    cacDong.forEach(function (dong) {
      const o = dong.cells;

      if (!o || o.length < 6) return;

      function layGiaTri(viTri) {
        const input = o[viTri].querySelector("input, select, textarea");

        return input ? input.value.trim() : o[viTri].innerText.trim();
      }

      const tenHang = layGiaTri(2);
      const dvt = layGiaTri(3);
      const soLuong = layGiaTri(5);

      if (!tenHang) return;

      danhSachHang.push({
        tenHang: tenHang,
        dvt: dvt,
        soLuong: soLuong,
      });
    });

    if (danhSachHang.length === 0) {
      alert("Bảng báo giá chưa có hàng hóa!");
      return;
    }

    // =====================================================
    // 2. LƯU DANH SÁCH HÀNG HÓA
    // =====================================================

    sessionStorage.setItem("duLieuPhieuXuatKho", JSON.stringify(danhSachHang));

    // =====================================================
    // 3. LẤY VÀ LƯU THÔNG TIN KHÁCH HÀNG
    // =====================================================

    const khachHang = document.getElementById("tenKhachHang");
    const diaChi = document.getElementById("diaChi");
    const dienThoai = document.getElementById("dienThoai");

    sessionStorage.setItem(
      "khachHangPhieuXuatKho",
      khachHang ? khachHang.value.trim() : "",
    );

    sessionStorage.setItem(
      "diaChiPhieuXuatKho",
      diaChi ? diaChi.value.trim() : "",
    );

    sessionStorage.setItem(
      "dienThoaiPhieuXuatKho",
      dienThoai ? dienThoai.value.trim() : "",
    );

    // =====================================================
    // 4. XÓA IFRAME CŨ NẾU CÓ
    // =====================================================

    const iframeCu = document.getElementById("iframePhieuXuatKho");

    if (iframeCu) {
      iframeCu.remove();
    }

    // =====================================================
    // 5. TẠO IFRAME PHIẾU XUẤT KHO
    // =====================================================

    const iframe = document.createElement("iframe");

    iframe.id = "iframePhieuXuatKho";

    iframe.style.position = "fixed";
    iframe.style.left = "0";
    iframe.style.top = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.style.background = "#ffffff";
    iframe.style.zIndex = "999999";
    iframe.style.display = "block";

    document.body.appendChild(iframe);

    // =====================================================
    // 6. NHẬN THÔNG BÁO KHI XUẤT PDF THÀNH CÔNG
    // =====================================================

    function xuLyThongBao(event) {
      if (event.origin !== window.location.origin) return;

      if (event.data && event.data.type === "phieuXuatKhoDaXuat") {
        window.removeEventListener("message", xuLyThongBao);

        // ẨN PHIẾU
        iframe.style.display = "none";

        // XÓA IFRAME SAU 3 GIÂY
        setTimeout(function () {
          if (iframe.parentNode) {
            iframe.remove();
          }
        }, 3000);

        // MỞ LẠI NÚT XUẤT KHO
        btnXuatKho.disabled = false;
      }
    }

    window.addEventListener("message", xuLyThongBao);

    // =====================================================
    // 7. MỞ TRANG PHIẾU XUẤT KHO
    // =====================================================

    iframe.src = "./Phieu-Kho/phieu.html";
  });
});
// =====================================================
// 7. MỞ TRANG THANH TOAN
// =====================================================

// =====================================================
// NÚT THANH TOÁN - LẤY DỮ LIỆU TỪ BẢNG BÁO GIÁ
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
  const btnThanhToan = document.getElementById("btnThanhToan");

  if (!btnThanhToan) return;

  btnThanhToan.addEventListener("click", function () {
    // 1. LẤY BẢNG BÁO GIÁ
    const tbody = document.querySelector("#bangHoaDon tbody");

    if (!tbody) {
      alert("Không tìm thấy bảng báo giá!");
      return;
    }

    // 2. LẤY DANH SÁCH HÀNG HÓA
    const danhSachHang = [];

    Array.from(tbody.querySelectorAll("tr")).forEach(function (dong) {
      const o = dong.cells;

      if (!o || o.length < 6) return;

      function layGiaTri(viTri) {
        const input = o[viTri].querySelector("input, select, textarea");
        return input ? input.value.trim() : o[viTri].innerText.trim();
      }

      const tenHang = layGiaTri(2);
      const dvt = layGiaTri(3);
      const donGia = layGiaTri(4);
      const soLuong = layGiaTri(5);

      if (!tenHang) return;

      danhSachHang.push({
        tenHang: tenHang,
        dvt: dvt,
        donGia: donGia,
        soLuong: soLuong,
      });
    });

    if (danhSachHang.length === 0) {
      alert("Bảng báo giá chưa có hàng hóa!");
      return;
    }

    // 3. LẤY THÔNG TIN ĐƠN HÀNG
    function layNoiDung(selector) {
      const el = document.querySelector(selector);
      if (!el) return "";

      return el.value !== undefined ? el.value.trim() : el.textContent.trim();
    }

    const duLieuThanhToan = {
      soDonHang:
        layNoiDung("#soDonHang") || layNoiDung('[data-field="soDonHang"]'),

      ngayLap: layNoiDung("#ngayLap"),

      khachHang: layNoiDung("#tenKhachHang"),

      diaChi: layNoiDung("#diaChi"),

      dienThoai: layNoiDung("#dienThoai"),

      tongTienHang: layNoiDung("#tongTien"),

      tienVAT: layNoiDung("#tienThue"),

      danhSachHang: danhSachHang,
    };

    if (!duLieuThanhToan.soDonHang) {
      alert("Không tìm thấy số đơn hàng trên trang báo giá!");
      return;
    }

    // 4. LƯU DỮ LIỆU CHO TRANG THANH TOÁN
    sessionStorage.setItem("duLieuThanhToan", JSON.stringify(duLieuThanhToan));

    // 5. XÓA IFRAME CŨ
    const iframeCu = document.getElementById("iframeThanhToan");

    if (iframeCu) iframeCu.remove();

    // 6. TẠO IFRAME THANH TOÁN
    const iframe = document.createElement("iframe");

    iframe.id = "iframeThanhToan";

    iframe.style.position = "fixed";
    iframe.style.left = "0";
    iframe.style.top = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.style.background = "#ffffff";
    iframe.style.zIndex = "999999";
    iframe.style.display = "block";

    document.body.appendChild(iframe);

    // 7. NHẬN THÔNG BÁO KHI XUẤT PDF
    function xuLyThongBao(event) {
      if (event.origin !== window.location.origin) return;

      if (event.data && event.data.type === "thanhToanDaXuat") {
        window.removeEventListener("message", xuLyThongBao);

        iframe.style.display = "none";

        setTimeout(function () {
          if (iframe.parentNode) {
            iframe.remove();
          }
        }, 3000);

        btnThanhToan.disabled = false;
      }
    }

    window.addEventListener("message", xuLyThongBao);

    // 8. MỞ TRANG THANH TOÁN
    iframe.src = "./Thanh-Toan/thanhtoan.html";
  });
});
