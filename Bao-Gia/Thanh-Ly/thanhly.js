// =====================================================
// BIÊN BẢN THANH LÝ - NHẬN DỮ LIỆU TỪ MAIN.JS
// Đọc sessionStorage: duLieuHopDong
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
  const raw = sessionStorage.getItem("duLieuHopDong");
  let duLieu = {};

  try {
    duLieu = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Lỗi đọc dữ liệu báo giá:", error);
  }

  function ganNoiDung(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null && String(value).trim() !== "") {
      el.textContent = String(value);
    }
  }

  function dinhDangNgay(value) {
    if (!value) return "";
    const s = String(value).trim();

    // Giữ nguyên nếu ngày đã được nhập theo dạng chữ Việt.
    if (/[a-zA-ZÀ-ỹ]/.test(s)) return s;

    // Hỗ trợ dd/mm/yyyy hoặc dd-mm-yyyy.
    const match = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (match) return `${match[1]} tháng ${match[2]} năm ${match[3]}`;

    // Hỗ trợ yyyy-mm-dd.
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return `${Number(iso[3])} tháng ${Number(iso[2])} năm ${iso[1]}`;

    return s;
  }

  function ngayHomNay() {
    const now = new Date();
    return `${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  }

  const ngay = ngayHomNay();
  const ngayBaoGia = dinhDangNgay(duLieu.ngayLap) || "................................";
  const ngayHopDongMacDinh = "................................";

  // Ngày thanh lý luôn tự lấy ngày hiện tại; người dùng vẫn sửa trực tiếp được.
  ganNoiDung("ngayHienTai", ngay);
  ganNoiDung("ngayThanhLyNoiDung", ngay);
  ganNoiDung("ngayHieuLuc", ngay);

  // Ngày báo giá lấy từ dữ liệu báo giá; có thể bấm vào để sửa.
  ganNoiDung("ngayBaoGia", ngayBaoGia);

  // Chưa có trường ngày ký hợp đồng trong dữ liệu main.js hiện tại,
  // vì vậy để dấu chấm cho người dùng nhập/sửa, không tự đoán ngày.
  ganNoiDung("ngayHopDong", ngayHopDongMacDinh);
  ganNoiDung("ngayHopDongNoiDung", ngayHopDongMacDinh);
  ganNoiDung("ngayHopDongHieuLuc", ngayHopDongMacDinh);

  // Thông tin khách hàng lấy từ báo giá.
  ganNoiDung("tenKhachHang", duLieu.khachHang);
  ganNoiDung("diaChi", duLieu.diaChi);
  ganNoiDung("maSoThue", duLieu.maSoThue);
  ganNoiDung("dienThoai", duLieu.dienThoai);

  // Cho phép sửa nội dung trực tiếp trên biên bản.
  document.querySelectorAll("[contenteditable='true']").forEach(function (el) {
    el.setAttribute("spellcheck", "false");
  });

  const btnPDF = document.getElementById("btnLuuPDF");
  const btnIn = document.getElementById("btnIn");
  const btnQuayLai = document.getElementById("btnQuayLai");

  if (btnIn) btnIn.addEventListener("click", () => window.print());

  if (btnQuayLai) {
    btnQuayLai.addEventListener("click", function () {
      window.history.back();
    });
  }

  if (btnPDF) {
    btnPDF.addEventListener("click", async function () {
      const noiDung = document.getElementById("bienBanThanhLy");

      if (typeof html2pdf === "undefined") {
        alert("Không tải được thư viện xuất PDF. Vui lòng kiểm tra kết nối Internet.");
        return;
      }

      const soDon = String(duLieu.soDonHang || "thanh-ly").replace(/[\\/:*?"<>|]/g, "-");
      btnPDF.disabled = true;
      const tenCu = btnPDF.textContent;
      btnPDF.textContent = "ĐANG TẠO PDF...";

      try {
        // Ép trang về đúng khổ A4 trước khi chụp PDF.
        // Việc này tránh CSS mobile (width: 100%) làm PDF bị co hoặc lệch lề.
        noiDung.classList.add("pdf-export");

        // Chờ trình duyệt tính lại bố cục và tải ảnh (nếu có) trước khi xuất.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const anh = Array.from(noiDung.querySelectorAll("img"));
        await Promise.all(anh.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }));

        try {
          await html2pdf().set({
            margin: 0,
            filename: `Bien-ban-thanh-ly-${soDon}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              scrollY: 0,
              backgroundColor: "#ffffff",
              windowWidth: 794
            },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["css", "legacy"] }
          }).from(noiDung).save();
        } finally {
          noiDung.classList.remove("pdf-export");
        }
      } catch (error) {
        console.error("Lỗi xuất PDF:", error);
        alert("Không thể tạo PDF. Vui lòng thử lại.");
      } finally {
        btnPDF.disabled = false;
        btnPDF.textContent = tenCu;
      }
    });
  }
});
