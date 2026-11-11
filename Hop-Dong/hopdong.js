// =====================================================
// HỢP ĐỒNG - NHẬN DỮ LIỆU TỪ MAIN.JS
// =====================================================

(function () {
  function khoiTaoHopDong() {

    // 1. ĐỌC DỮ LIỆU TỪ INDEX.HTML
    let duLieu = null;

    try {
      const raw = sessionStorage.getItem("duLieuHopDong");

      if (raw) {
        duLieu = JSON.parse(raw);
      }
    } catch (error) {
      console.error("Lỗi đọc dữ liệu hợp đồng:", error);
    }

    if (!duLieu) {
      console.error("Không tìm thấy dữ liệu hợp đồng!");
      alert("Không tìm thấy dữ liệu báo giá! Vui lòng mở hợp đồng từ trang báo giá.");
      return;
    }

    // 2. CHUYỂN GIÁ TRỊ THÀNH SỐ
    function doiSangSo(giaTri) {
      if (giaTri === null || giaTri === undefined) return 0;

      let s = String(giaTri).trim();

      if (!s) return 0;

      s = s.replace(/[^\d,.-]/g, "");

      // Ví dụ: 1.250.000
      if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
        s = s.replace(/\./g, "");
      }

      // Ví dụ: 1.250,50 hoặc 1,250.50
      else if (s.includes(",") && s.includes(".")) {
        if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
          s = s.replace(/\./g, "").replace(",", ".");
        } else {
          s = s.replace(/,/g, "");
        }
      }

      // Ví dụ: 1250,50
      else if (s.includes(",")) {
        s = s.replace(",", ".");
      }

      return Number(s) || 0;
    }

    // 3. ĐỊNH DẠNG TIỀN
    function dinhDangTien(soTien) {
      return new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: 2
      }).format(soTien) + " đ";
    }

    // 4. ĐIỀN NGÀY KÝ HỢP ĐỒNG
const ngayHienTai = document.getElementById("ngayHienTai");

if (ngayHienTai) {
    const ngay = new Date();

    ngayHienTai.textContent =
        ngay.getDate() +
        " tháng " +
        (ngay.getMonth() + 1) +
        " năm " +
        ngay.getFullYear();
}

    // 5. ĐIỀN THÔNG TIN BÊN MUA
    const cacBen = document.querySelectorAll(".thong-tin-ben");
    const benMua = cacBen[0];

    if (benMua) {

      // TÊN KHÁCH HÀNG
      const tenKhachHang = benMua.querySelector(".ten-ben");

      if (tenKhachHang) {
        tenKhachHang.textContent = duLieu.khachHang || "";
      }

      // ĐỊA CHỈ, MÃ SỐ THUẾ, ĐIỆN THOẠI
      const cacDong = benMua.querySelectorAll("p");

      cacDong.forEach(function (dong) {
        const noiDung = dong.textContent
          .toLowerCase()
          .normalize("NFC");

        const span = dong.querySelector("span");

        if (!span) return;

        if (noiDung.includes("địa chỉ")) {
          span.textContent = duLieu.diaChi || "";
        }

        else if (
          noiDung.includes("mã số thuế") ||
          noiDung.includes("tax code")
        ) {
          span.textContent = duLieu.maSoThue || "";
        }

        else if (
          noiDung.includes("điện thoại") ||
          noiDung.includes("tel")
        ) {
          span.textContent = duLieu.dienThoai || "";
        }
      });
    }

    // 6. ĐIỀN SỐ HỢP ĐỒNG
    const soHopDong = document.querySelector(".so-hop-dong span");

    if (soHopDong && duLieu.soDonHang) {
      soHopDong.textContent = duLieu.soDonHang;
    }

    // 7. ĐỔ HÀNG HÓA VÀO BẢNG HỢP ĐỒNG
    const tbody = document.getElementById("dsHangHoa");

    let tongTinhTuBang = 0;

    if (tbody) {
      tbody.innerHTML = "";

      const danhSach = Array.isArray(duLieu.danhSachHang)
        ? duLieu.danhSachHang
        : [];

      if (danhSach.length === 0) {
        const tr = document.createElement("tr");
        tr.className = "dong-trong";

        const td = document.createElement("td");
        td.colSpan = 6;
        td.textContent = "Chưa có hàng hóa trong báo giá.";

        tr.appendChild(td);
        tbody.appendChild(tr);

      } else {

        danhSach.forEach(function (hang, index) {
          const tenHang = hang.tenHang || hang.TenHang || "";
          const dvt = hang.dvt || hang.DonViTinh || "";
          const soLuong = hang.soLuong ?? hang.SoLuong ?? 0;
          const donGia = hang.donGia ?? hang.DonGia ?? 0;

          const sl = doiSangSo(soLuong);
          const gia = doiSangSo(donGia);

          const thanhTien = sl * gia;

          tongTinhTuBang += thanhTien;

          const tr = document.createElement("tr");

          const duLieuCot = [
            index + 1,
            tenHang,
            dvt,
            soLuong,
            dinhDangTien(gia),
            dinhDangTien(thanhTien)
          ];

          duLieuCot.forEach(function (giaTri, viTri) {
            const td = document.createElement("td");

            td.textContent = giaTri;

            if (viTri === 1) {
              td.classList.add("ten-hang");
            }

            tr.appendChild(td);
          });

          tbody.appendChild(tr);
        });
      }
    }

    // 8. TÍNH TỔNG TIỀN, VAT VÀ TỔNG THANH TOÁN
    const tongNhap = doiSangSo(duLieu.tongTienHang);

    const tongTienHang = tongNhap !== 0
      ? tongNhap
      : tongTinhTuBang;

    const tienVAT = doiSangSo(duLieu.tienVAT);

    const tongThanhToan = tongTienHang + tienVAT;

    const oTongTien = document.getElementById("tongTienHang");
    const oVAT = document.getElementById("tienVAT");
    const oTongThanhToan = document.getElementById("tongThanhToan");

    if (oTongTien) {
      oTongTien.textContent = dinhDangTien(tongTienHang);
    }

    if (oVAT) {
      oVAT.textContent = dinhDangTien(tienVAT);
    }

    if (oTongThanhToan) {
      oTongThanhToan.textContent = dinhDangTien(tongThanhToan);
    }

    // 9. TẠO KHUNG CHỨA 3 TRANG HỢP ĐỒNG
    let hopDong = document.querySelector(".hop-dong");

    if (!hopDong) {
      const cacTrang = Array.from(
        document.querySelectorAll(".trang")
      );

      if (cacTrang.length > 0) {
        hopDong = document.createElement("div");
        hopDong.className = "hop-dong";

        cacTrang[0].parentNode.insertBefore(
          hopDong,
          cacTrang[0]
        );

        cacTrang.forEach(function (trang) {
          hopDong.appendChild(trang);
        });
      }
    }

    // 10. NÚT LƯU HỢP ĐỒNG PDF
    const btnIn = document.querySelector(".btn-in");

    if (btnIn) {
      btnIn.textContent = "LƯU HỢP ĐỒNG PDF";

      // Gỡ onclick cũ trong HTML
      btnIn.removeAttribute("onclick");

      btnIn.onclick = async function () {

        if (typeof html2pdf === "undefined") {
          alert("Không tải được thư viện html2pdf.js! Hãy kiểm tra kết nối Internet.");
          return;
        }

        if (!hopDong) {
          alert("Không tìm thấy nội dung hợp đồng để xuất PDF!");
          return;
        }

        btnIn.disabled = true;
        btnIn.textContent = "ĐANG TẠO PDF...";

        const soDonHang = duLieu.soDonHang
          ? String(duLieu.soDonHang).replace(/[\\/:*?"<>|]/g, "-")
          : "mua-ban";

        const tuyChon = {
          margin: 0,

          filename: "Hop-dong-" + soDonHang + ".pdf",

          image: {
            type: "jpeg",
            quality: 0.98
          },

          html2canvas: {
            scale: 2,
            useCORS: true,
            scrollY: 0,
            backgroundColor: "#ffffff"
          },

          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
          },

          pagebreak: {
            mode: ["css", "legacy"],
            before: [".trang-2", ".trang-3"]
          }
        };

        try {
          await html2pdf()
            .set(tuyChon)
            .from(hopDong)
            .save();

        } catch (error) {
          console.error("Lỗi xuất PDF:", error);
          alert("Không thể tạo file PDF. Vui lòng kiểm tra lại CSS và nội dung hợp đồng.");

        } finally {
          btnIn.disabled = false;
          btnIn.textContent = "LƯU HỢP ĐỒNG PDF";
        }
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", khoiTaoHopDong);
  } else {
    khoiTaoHopDong();
  }
})();