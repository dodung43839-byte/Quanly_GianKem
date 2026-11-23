
// =====================================================
// BIÊN BẢN THANH LÝ - NHẬN DỮ LIỆU TỪ MAIN.JS
// Đọc sessionStorage: duLieuHopDong
// Sử dụng PDFChung.js để xuất PDF
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

  // =====================================================
  // 1. ĐỌC DỮ LIỆU TỪ MAIN.JS
  // =====================================================

  const raw = sessionStorage.getItem("duLieuHopDong");
  let duLieu = {};

  try {
    duLieu = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Lỗi đọc dữ liệu báo giá:", error);
  }

  // =====================================================
  // 2. HÀM ĐƯA NỘI DUNG VÀO HTML
  // =====================================================

  function ganNoiDung(id, value) {
    const el = document.getElementById(id);

    if (
      el &&
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      el.textContent = String(value);
    }
  }

  // =====================================================
  // 3. ĐỊNH DẠNG NGÀY THÁNG
  // =====================================================

  function dinhDangNgay(value) {
    if (!value) return "";

    const s = String(value).trim();

    // Giữ nguyên nếu ngày đã được nhập theo dạng chữ Việt.
    if (/[a-zA-ZÀ-ỹ]/.test(s)) return s;

    // Hỗ trợ dd/mm/yyyy hoặc dd-mm-yyyy.
    const match = s.match(
      /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/
    );

    if (match) {
      return `${match[1]} tháng ${match[2]} năm ${match[3]}`;
    }

    // Hỗ trợ yyyy-mm-dd.
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (iso) {
      return `${Number(iso[3])} tháng ${Number(iso[2])} năm ${iso[1]}`;
    }

    return s;
  }

  // =====================================================
  // 4. LẤY NGÀY HIỆN TẠI
  // =====================================================

  function ngayHomNay() {
    const now = new Date();

    return `${now.getDate()} tháng ${
      now.getMonth() + 1
    } năm ${now.getFullYear()}`;
  }

  const ngay = ngayHomNay();

  const ngayBaoGia =
    dinhDangNgay(duLieu.ngayLap) ||
    "................................";

  const ngayHopDongMacDinh =
    "................................";

  // =====================================================
  // 5. ĐƯA NGÀY VÀO BIÊN BẢN
  // =====================================================

  // Ngày hiện tại và ngày thanh lý.
  ganNoiDung("ngayHienTai", ngay);
  ganNoiDung("ngayThanhLyNoiDung", ngay);
  ganNoiDung("ngayHieuLuc", ngay);

  // Ngày báo giá.
  ganNoiDung("ngayBaoGia", ngayBaoGia);

  // Ngày hợp đồng để người dùng tự nhập.
  ganNoiDung("ngayHopDong", ngayHopDongMacDinh);
  ganNoiDung("ngayHopDongNoiDung", ngayHopDongMacDinh);
  ganNoiDung("ngayHopDongHieuLuc", ngayHopDongMacDinh);

  // =====================================================
  // 6. THÔNG TIN KHÁCH HÀNG
  // =====================================================

  ganNoiDung("tenKhachHang", duLieu.khachHang);
  ganNoiDung("diaChi", duLieu.diaChi);
  ganNoiDung("maSoThue", duLieu.maSoThue);
  ganNoiDung("dienThoai", duLieu.dienThoai);

  // =====================================================
  // 7. CHO PHÉP SỬA NỘI DUNG TRỰC TIẾP
  // =====================================================

  document
    .querySelectorAll("[contenteditable='true']")
    .forEach(function (el) {
      el.setAttribute("spellcheck", "false");
    });

  // =====================================================
  // 8. KHAI BÁO CÁC NÚT CHỨC NĂNG
  // =====================================================

  const btnPDF = document.getElementById("btnLuuPDF");
  const btnIn = document.getElementById("btnIn");
  const btnQuayLai = document.getElementById("btnQuayLai");

  // =====================================================
  // 9. NÚT IN BIÊN BẢN
  // =====================================================

  if (btnIn) {
    btnIn.addEventListener("click", function () {
      window.print();
    });
  }

  // =====================================================
  // 10. NÚT QUAY LẠI
  // =====================================================

  if (btnQuayLai) {
    btnQuayLai.addEventListener("click", function () {
      window.history.back();
    });
  }

  // =====================================================
  // 11. NÚT LƯU PDF - SỬ DỤNG PDFCHUNG.JS
  // =====================================================

  if (btnPDF) {

    btnPDF.addEventListener("click", async function () {

      const noiDung = document.getElementById("bienBanThanhLy");

      if (!noiDung) {
        alert("Không tìm thấy nội dung biên bản thanh lý.");
        return;
      }

      // Kiểm tra thư viện PDFChung.js.
      if (
        !window.PDFChung ||
        typeof window.PDFChung.xuat !== "function"
      ) {
        alert("Chưa tải được PDFChung.js.");
        return;
      }

      // Lấy số đơn hàng để đặt tên file.
      const soDon = String(
        duLieu.soDonHang || "thanh-ly"
      ).replace(/[\\/:*?"<>|]/g, "-");

      // Khóa nút trong lúc tạo PDF.
      btnPDF.disabled = true;

      const tenCu = btnPDF.textContent;

      btnPDF.textContent = "ĐANG TẠO PDF...";

      try {

        // Ép nội dung về đúng khổ A4.
        noiDung.classList.add("pdf-export");

        // Chờ trình duyệt tính toán lại bố cục.
        await new Promise((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(resolve)
          )
        );

        // Gọi PDFChung.js để xuất PDF.
        await window.PDFChung.xuat({

          element: noiDung,

          options: {

            margin: 0,

            filename: `Bien-ban-thanh-ly-${soDon}.pdf`,

            image: {
              type: "jpeg",
              quality: 0.98
            },

            html2canvas: {

              scale: 2,

              useCORS: true,

              scrollX: 0,

              scrollY: 0,

              backgroundColor: "#ffffff",

              windowWidth: Math.max(
                document.documentElement.clientWidth,
                noiDung.scrollWidth
              )
            },

            jsPDF: {
              unit: "mm",
              format: "a4",
              orientation: "portrait"
            },

            pagebreak: {
              mode: ["css", "legacy"]
            }

          }

        });

      } catch (error) {

        console.error("Lỗi xuất PDF:", error);

        alert("Lỗi xuất PDF: " + error.message);

      } finally {

        // Khôi phục giao diện sau khi xuất PDF.
        noiDung.classList.remove("pdf-export");

        btnPDF.disabled = false;

        btnPDF.textContent = tenCu;

      }

    });

  }

});

