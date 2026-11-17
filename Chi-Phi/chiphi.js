/* =====================================================
   QUẢN LÝ CHI PHÍ - VIẾT LẠI ĐỒNG BỘ
   Giữ nguyên tên database và object store cũ để đọc dữ liệu hiện có.
   Chức năng: lưu phiếu, ghi nhớ theo hạng mục, lịch sử, lọc tháng,
   tổng chi, xóa phiếu và xuất PDF.
===================================================== */

(() => {
  "use strict";

  const DB_NAME = "QUAN_LY_CHI_PHI_DB";
  const DB_VERSION = 1;
  const STORE = "phieuChi";
  const PRESET_STORE = "ghiNhoHangMuc";

  const HANG_MUC = [
    "Tiền thuê mặt bằng",
    "Tiền điện",
    "Tiền nước",
    "Tiền internet",
    "Phí an ninh trật tự",
    "Phí vệ sinh",
    "Lãi ngân hàng",
    "Lương bán hàng",
    "Lương Kế toán",
    "Bảo Hiểm Xã Hội",
    "Thuế TN Doanh Nghiệp",
    "Chi Khác",
  ];

  const $ = (id) => document.getElementById(id);

  let db = null;
  let hangMucDangChon = "";
  let dsPhieu = [];
  let dangLuu = false;

  function thongBao(message, error = false) {
    const el = $("thongBao");
    if (!el) return;
    el.textContent = message;
    el.className = "notice" + (error ? " error" : "");
  }

  function ngayHomNay() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function dinhDangTien(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  function layGiaTriTien(value) {
    const digits = String(value || "").replace(/[^\d]/g, "");
    return Number(digits || 0);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  }

  function moDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("Trình duyệt không hỗ trợ IndexedDB."));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        // Chỉ tạo store nếu chưa tồn tại; không xóa hoặc thay đổi dữ liệu cũ.
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
        }

        if (!database.objectStoreNames.contains(PRESET_STORE)) {
          database.createObjectStore(PRESET_STORE, {
            keyPath: "hangMuc",
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("Không mở được database."));
      request.onblocked = () =>
        reject(
          new Error(
            "Database đang được mở ở tab khác. Hãy đóng tab cũ rồi tải lại trang.",
          ),
        );
    });
  }

  function transactionHoanTat(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error || new Error("Giao dịch database thất bại."));
      tx.onabort = () =>
        reject(tx.error || new Error("Giao dịch database đã bị hủy."));
    });
  }

  function layTatCa(storeName) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () =>
        reject(request.error || new Error("Không đọc được dữ liệu."));
    });
  }

 async function taoSoPhieu() {
  const max = dsPhieu.reduce((currentMax, phieu) => {
    const giaTri = String(phieu.soPhieuSo ?? phieu.soPhieu ?? "");
    const n = Number(giaTri.replace(/^PC-/i, "")) || 0;
    return Math.max(currentMax, n);
  }, 0);

  $("soPhieu").value = "PC-" + String(max + 1).padStart(4, "0");
}

  function taoDanhSachHangMuc() {
    const container = $("danhSachHangMuc");
    container.innerHTML = HANG_MUC.map(
      (name, index) => `
      <label class="category-option" data-category="${index}">
        <input type="radio" name="hangMuc" value="${escapeHtml(name)}">
        <span>${escapeHtml(name)}</span>
      </label>
    `,
    ).join("");

    container.addEventListener("change", (event) => {
      if (event.target.name === "hangMuc") {
        chonHangMuc(event.target.value);
      }
    });
  }

  async function chonHangMuc(name) {
    hangMucDangChon = name;

    document.querySelectorAll(".category-option").forEach((item) => {
      const input = item.querySelector('input[name="hangMuc"]');
      item.classList.toggle("selected", Boolean(input && input.value === name));
    });

    try {
      const tx = db.transaction(PRESET_STORE, "readonly");
      const request = tx.objectStore(PRESET_STORE).get(name);
      request.onsuccess = () => {
        const saved = request.result;

        if (saved) {
          $("nguoiChi").value = saved.nguoiChi || "";
          $("hinhThuc").value = saved.hinhThuc || "Tiền mặt";
          $("soTien").value =
            saved.soTien != null ? dinhDangTien(saved.soTien) : "";
          $("trangThaiNho").textContent =
            "Đã gọi lại thông tin gần nhất của mục này";
          thongBao("Đã khôi phục thông tin gần nhất của hạng mục.");
        } else {
          $("soTien").value = "";
          $("trangThaiNho").textContent = "Mục này chưa có dữ liệu ghi nhớ";
          thongBao("Hạng mục mới: nhập người chi và số tiền rồi lưu.");
        }
      };
      request.onerror = () =>
        thongBao("Không đọc được thông tin ghi nhớ của hạng mục.", true);
    } catch (error) {
      console.error("Lỗi đọc thông tin ghi nhớ:", error);
      thongBao("Không đọc được thông tin ghi nhớ.", true);
    }
  }

  function capNhatNguoiChi() {
    const names = [
      ...new Set(dsPhieu.map((item) => item.nguoiChi).filter(Boolean)),
    ];
    $("dsNguoiChi").innerHTML = names
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");
  }

  function veBang() {
    const month = $("locThang").value;
    const rows = dsPhieu.filter(
      (item) => !month || String(item.ngayChi || "").startsWith(month),
    );

    $("bangLichSu").innerHTML = rows.length
      ? rows
          .map(
            (item) => `
        <tr>
          <td>${escapeHtml(item.soPhieu ?? "")}</td>
          <td>${escapeHtml(item.ngayChi ?? "")}</td>
          <td>${escapeHtml(item.hangMuc ?? "")}</td>
          <td>${escapeHtml(item.nguoiChi ?? "")}</td>
          <td>${escapeHtml(item.hinhThuc ?? "")}</td>
          <td class="money">${dinhDangTien(item.soTien)}</td>
          <td class="no-print">
            <button type="button" class="row-delete" data-delete="${Number(item.id)}">Xóa</button>
          </td>
        </tr>
      `,
          )
          .join("")
      : `<tr><td colspan="7" class="empty">Không có phiếu chi trong thời gian này.</td></tr>`;

    const total = rows.reduce(
      (sum, item) => sum + (Number(item.soTien) || 0),
      0,
    );
    $("tongChi").textContent = dinhDangTien(total);
    $("tongChiHienThi").value = dinhDangTien(total);
  }

  async function taiDuLieu() {
    dsPhieu = await layTatCa(STORE);
    dsPhieu.sort((a, b) => {
      const dateDiff = String(b.ngayChi || "").localeCompare(
        String(a.ngayChi || ""),
      );
      return dateDiff || Number(b.id || 0) - Number(a.id || 0);
    });
    veBang();
    capNhatNguoiChi();
  }

  function duLieuHopLe() {
    const soTien = layGiaTriTien($("soTien").value);

    if (!$("ngayChi").value) {
      thongBao("Vui lòng chọn ngày chi.", true);
      $("ngayChi").focus();
      return null;
    }
    if (!$("nguoiChi").value.trim()) {
      thongBao("Vui lòng nhập người chi.", true);
      $("nguoiChi").focus();
      return null;
    }
    if (!hangMucDangChon) {
      thongBao("Vui lòng chọn hạng mục chi.", true);
      return null;
    }
    if (!Number.isFinite(soTien) || soTien <= 0) {
      thongBao("Số tiền phải lớn hơn 0.", true);
      $("soTien").focus();
      return null;
    }

    return {
      soPhieu: $("soPhieu").value.trim(),
    soPhieuSo: Number($("soPhieu").value.replace(/^PC-/i, "")),
      ngayChi: $("ngayChi").value,
      nguoiChi: $("nguoiChi").value.trim(),
      hinhThuc: $("hinhThuc").value,
      hangMuc: hangMucDangChon,
      soTien,
      createdAt: Date.now(),
    };
  }

  async function luuPhieu() {
    if (dangLuu) return;

    const phieu = duLieuHopLe();
    if (!phieu) return;

    dangLuu = true;
    $("btnLuu").disabled = true;

    try {
      // Ghi phiếu và ghi nhớ hạng mục trong cùng một transaction:
      // nếu một thao tác lỗi thì cả hai cùng rollback.
      const tx = db.transaction([STORE, PRESET_STORE], "readwrite");
      tx.objectStore(STORE).add(phieu);
      tx.objectStore(PRESET_STORE).put({
        hangMuc: phieu.hangMuc,
        nguoiChi: phieu.nguoiChi,
        hinhThuc: phieu.hinhThuc,
        soTien: phieu.soTien,
      });

      await transactionHoanTat(tx);
      await taiDuLieu();
      await taoSoPhieu();

      $("trangThaiNho").textContent = "Đã lưu thông tin gần nhất của mục này";
      thongBao(`Đã lưu phiếu chi ${phieu.soPhieu} thành công.`);

      // Giữ hạng mục và người chi để tiện nhập phiếu tiếp theo.
      $("soTien").value = "";
    } catch (error) {
      console.error("Lỗi lưu phiếu chi:", error);
      thongBao(
        `Không lưu được phiếu chi: ${error.message || "Lỗi IndexedDB"}`,
        true,
      );
    } finally {
      dangLuu = false;
      $("btnLuu").disabled = false;
    }
  }

  function lamMoi() {
    hangMucDangChon = "";

    document.querySelectorAll('input[name="hangMuc"]').forEach((input) => {
      input.checked = false;
    });
    document.querySelectorAll(".category-option").forEach((item) => {
      item.classList.remove("selected");
    });

    $("ngayChi").value = ngayHomNay();
    $("nguoiChi").value = "";
    $("hinhThuc").value = "Tiền mặt";
    $("soTien").value = "";
    $("trangThaiNho").textContent = "Chưa có dữ liệu ghi nhớ";

    thongBao("Đã làm mới biểu mẫu.");
    taoSoPhieu();
  }

  async function xoaPhieu(id) {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await transactionHoanTat(tx);
    await taiDuLieu();
    await taoSoPhieu();
    thongBao("Đã xóa phiếu chi thành công.");
  }

  async function xuatPDF() {
    if (typeof window.html2pdf !== "function") {
      thongBao(
        "Không tải được thư viện xuất PDF. Hãy kiểm tra kết nối Internet rồi tải lại trang.",
        true,
      );
      return;
    }

    const button = $("btnXuatPDF");
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "ĐANG TẠO PDF...";

    let holder = null;
    try {
      // Tạo bản sao riêng cho PDF, không làm thay đổi giao diện đang sử dụng.
      const source = document.querySelector(".app");
      const clone = source.cloneNode(true);
      clone.classList.add("pdf-export-clone");
      clone.style.cssText =
        "width:1060px!important;max-width:none!important;min-width:1060px!important;margin:0 auto!important;padding:0!important;background:#fff!important;";

      // Bỏ các nút thao tác và bộ lọc; PDF chỉ giữ nội dung phiếu và bảng lịch sử.
      clone
        .querySelectorAll(
          ".form-actions, .bottom-actions, .filter-tools, .no-print, #thongBao, .hint, footer",
        )
        .forEach((element) => element.remove());

      // Chuyển giá trị form thành chữ tĩnh để PDF luôn hiển thị đúng dữ liệu.
      clone.querySelectorAll("input, select").forEach((field) => {
        if (field.type === "radio" || field.type === "checkbox") {
          field.remove();
          return;
        }
        const value =
          field.tagName === "SELECT"
            ? field.options[field.selectedIndex]?.text || ""
            : field.value || "";
        const replacement = document.createElement("span");
        replacement.className = "pdf-field-value";
        replacement.textContent = value || " ";
        field.replaceWith(replacement);
      });

      // Bỏ các thành phần điều khiển trong danh sách hạng mục, giữ tên mục.
      clone
        .querySelectorAll(".category-option input")
        .forEach((input) => input.remove());
      clone.querySelectorAll(".category-option").forEach((item) => {
        item.style.display = "inline-flex";
        item.style.width = "auto";
      });

      // CSS riêng cho PDF: khổ A4 ngang, bảng vừa trang, không bị cuộn ngang.
      const pdfStyle = document.createElement("style");

      pdfStyle.textContent = `
    /* KHUNG PDF */
    .pdf-export-clone,
    .pdf-export-clone * {
        box-sizing: border-box !important;
    }

    .pdf-export-clone {
        width: 1060px !important;
        min-width: 1060px !important;
        max-width: 1060px !important;
        padding: 0 10px !important;
         margin: 0 auto !important;
        background: #fff !important;
        color: #17313a !important;
        font-family: Arial, sans-serif !important;
    }

    /* TIÊU ĐỀ */
    .pdf-export-clone .page-header {
        border-radius: 0 !important;
        padding: 18px 22px !important;
        margin: 0 0 12px !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
    }

    .pdf-export-clone .page-header h1 {
        font-size: 27px !important;
    }

    /* KHUNG NỘI DUNG */
    .pdf-export-clone .panel {
        margin: 0 0 12px !important;
        padding: 14px 16px !important;
        box-shadow: none !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
    }

    .pdf-export-clone .history-panel {
        break-inside: auto !important;
        page-break-inside: auto !important;
    }

    /* BỐ CỤC FORM */
    .pdf-export-clone .form-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 10px 14px !important;
    }

    .pdf-export-clone .detail-grid {
        grid-template-columns: 1fr !important;
    }

    .pdf-export-clone .tien-row {
        grid-template-columns: 1fr 1fr !important;
    }
/* ẨN KHU VỰC CHỌN HẠNG MỤC KHI XUẤT PDF */
.pdf-export-clone .category-panel {
    display: none !important;
}
    /* DANH SÁCH HẠNG MỤC */
    .pdf-export-clone .category-list {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 5px !important;
    }

    .pdf-export-clone .category-option {
        min-height: 0 !important;
        padding: 6px 8px !important;
        margin: 0 !important;
        font-size: 11px !important;
        break-inside: avoid !important;
    }

    /* TIÊU ĐỀ TỪNG KHU VỰC */
    .pdf-export-clone .section-heading {
        margin-bottom: 9px !important;
    }

    .pdf-export-clone .section-heading h2 {
        font-size: 15px !important;
    }

    /* NHÃN VÀ GIÁ TRỊ */
    .pdf-export-clone .field > span {
        font-size: 11px !important;
    }

    .pdf-export-clone .pdf-field-value {
        display: block !important;
        min-height: 25px !important;
        padding: 5px 2px !important;
        border-bottom: 1px solid #cbd8d6 !important;
        font-size: 12px !important;
        overflow-wrap: anywhere !important;
    }

    /* KHUNG BẢNG */
    .pdf-export-clone .table-wrap {
        overflow: visible !important;
        width: 100% !important;
        border: 0 !important;
    }

    .pdf-export-clone .history-panel table {
        width: 100% !important;
        min-width: 0 !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
        font-size: 10px !important;
    }

    /* NỘI DUNG Ô BẢNG */
    .pdf-export-clone .history-panel th,
    .pdf-export-clone .history-panel td {
        padding: 7px 5px !important;
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        overflow-wrap: anywhere !important;
    }

    /* ĐỘ RỘNG CÁC CỘT */
    .pdf-export-clone .history-panel th:nth-child(1),
    .pdf-export-clone .history-panel td:nth-child(1) {
        width: 12% !important;
    }

    .pdf-export-clone .history-panel th:nth-child(2),
    .pdf-export-clone .history-panel td:nth-child(2) {
        width: 14% !important;
    }

    .pdf-export-clone .history-panel th:nth-child(3),
    .pdf-export-clone .history-panel td:nth-child(3) {
        width: 25% !important;
    }

    .pdf-export-clone .history-panel th:nth-child(4),
    .pdf-export-clone .history-panel td:nth-child(4) {
        width: 15% !important;
    }

    .pdf-export-clone .history-panel th:nth-child(5),
    .pdf-export-clone .history-panel td:nth-child(5) {
        width: 15% !important;
    }

    .pdf-export-clone .history-panel th:nth-child(6),
    .pdf-export-clone .history-panel td:nth-child(6) {
        width: 19% !important;
    }

    /* KHÔNG CHIA ĐÔI MỘT DÒNG PHIẾU */
    .pdf-export-clone .history-panel tbody tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
    }

    /* CỘT TIỀN */
    .pdf-export-clone .money {
        white-space: nowrap !important;
        text-align: right !important;
    }
`;

      clone.prepend(pdfStyle);

      // Đặt ngoài màn hình nhưng vẫn được trình duyệt dựng layout để html2canvas chụp.
      holder = document.createElement("div");
      holder.style.cssText =
        "position:absolute;left:0;top:0;width:1080px;background:#fff;z-index:-1;overflow:visible;";
      holder.appendChild(clone);
      document.body.appendChild(holder);

      // Chờ font và layout ổn định trước khi chụp trang.
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );

      const filename = `Phieu-chi-${ngayHomNay()}.pdf`;
      await window
        .html2pdf()
        .set({
          margin: [7, 7, 7, 7],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: 1080,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "landscape",
            compress: true,
          },
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: [".page-header", ".panel:not(.history-panel)", "tr"],
          },
        })
        .from(clone)
        .save();

      thongBao("Đã xuất PDF thành công.");
    } catch (error) {
      console.error("Lỗi xuất PDF:", error);
      thongBao(
        `Không xuất được PDF: ${error.message || "Vui lòng thử lại."}`,
        true,
      );
    } finally {
      if (holder && holder.parentElement) holder.remove();
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function ganSuKien() {
    $("btnLuu").addEventListener("click", luuPhieu);
    $("btnLamMoi").addEventListener("click", lamMoi);
    $("locThang").addEventListener("change", veBang);
    $("btnTatCa").addEventListener("click", () => {
      $("locThang").value = "";
      veBang();
    });
    $("btnXuatPDF").addEventListener("click", xuatPDF);

    $("soTien").addEventListener("input", function () {
      const digits = this.value.replace(/[^\d]/g, "");
      this.value = digits ? dinhDangTien(digits) : "";
    });

    $("bangLichSu").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-delete]");
      if (!button) return;

      const id = Number(button.dataset.delete);
      if (!Number.isFinite(id)) return;
      if (!window.confirm("Bạn có chắc muốn xóa phiếu chi này?")) return;

      button.disabled = true;
      try {
        await xoaPhieu(id);
      } catch (error) {
        console.error("Lỗi xóa phiếu:", error);
        thongBao("Không xóa được phiếu chi. Vui lòng thử lại.", true);
        button.disabled = false;
      }
    });
  }

  async function khoiDong() {
    try {
      const requiredIds = [
        "ngayChi",
        "soPhieu",
        "nguoiChi",
        "hinhThuc",
        "danhSachHangMuc",
        "soTien",
        "tongChiHienThi",
        "btnLuu",
        "btnLamMoi",
        "thongBao",
        "trangThaiNho",
        "locThang",
        "btnTatCa",
        "bangLichSu",
        "tongChi",
        "dsNguoiChi",
        "btnXuatPDF",
      ];
      const missing = requiredIds.filter((id) => !$(id));
      if (missing.length) {
        throw new Error("HTML đang thiếu thành phần: " + missing.join(", "));
      }

      db = await moDB();
      taoDanhSachHangMuc();

      $("ngayChi").value = ngayHomNay();
      $("locThang").value = ngayHomNay().slice(0, 7);

      await taiDuLieu();
      await taoSoPhieu();

      // Gợi ý người chi gần nhất từ dữ liệu lịch sử.
      if (dsPhieu.length && dsPhieu[0].nguoiChi) {
        $("nguoiChi").value = dsPhieu[0].nguoiChi;
      }

      ganSuKien();
      thongBao("Đã sẵn sàng quản lý chi phí.");
    } catch (error) {
      console.error("Lỗi khởi động quản lý chi phí:", error);
      thongBao(error.message || "Không khởi động được chương trình.", true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", khoiDong);
  } else {
    khoiDong();
  }
})();
