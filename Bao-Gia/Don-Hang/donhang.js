document.addEventListener("DOMContentLoaded", function () {
  const baoGia = document.getElementById("baoGia");
  const tbody = baoGia.querySelector('[data-role="danhSachHang"]');
  const KEY = "duLieuThueGTGT";
  const $ = (field) => baoGia.querySelector('[data-field="' + field + '"]');
  const num = (v) =>
    typeof v === "number"
      ? Number.isFinite(v)
        ? v
        : 0
      : Number(String(v ?? "").replace(/[^\d-]/g, "")) || 0;
  const money = (v) => Math.round(Number(v) || 0).toLocaleString("vi-VN");
  function set(field, value) {
    const el = $(field);
    if (el) el.textContent = value == null ? "" : String(value);
  }
  function formatDate(value) {
    if (!value) value = new Date();
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return [d.getDate(), d.getMonth() + 1, d.getFullYear()]
      .map((x, i) => (i < 2 ? String(x).padStart(2, "0") : x))
      .join("/");
  }
  function amountWords(number) {
    const n = Math.floor(Math.abs(Number(number) || 0));
    if (!n) return "Không đồng";
    const words = [
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
      ],
      units = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
    function group(x, full) {
      const a = Math.floor(x / 100),
        b = Math.floor((x % 100) / 10),
        c = x % 10;
      let s = "";
      if (a || full) s += words[a] + " trăm";
      if (b > 1) {
        s += (s ? " " : "") + words[b] + " mươi";
        if (c === 1) s += " mốt";
        else if (c === 5) s += " lăm";
        else if (c) s += " " + words[c];
      } else if (b === 1) {
        s += (s ? " " : "") + "mười";
        if (c === 5) s += " lăm";
        else if (c) s += " " + words[c];
      } else if (c) s += (s ? " " : "") + (a || full ? "lẻ " : "") + words[c];
      return s.trim();
    }
    const parts = [];
    let x = n,
      i = 0;
    while (x) {
      const g = x % 1000;
      if (g) parts.unshift(group(g, i > 0 && g < 100) + (units[i] || ""));
      x = Math.floor(x / 1000);
      i++;
    }
    const out = parts.join(" ").replace(/\s+/g, " ").trim();
    return out.charAt(0).toUpperCase() + out.slice(1) + " đồng";
  }
  function readData() {
    for (const key of [KEY, "duLieuBaoGia", "duLieuDonHang"]) {
      try {
        const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn(e);
      }
    }
    return null;
  }
  function itemData(h) {
    const qty = num(h.SoLuong ?? h.soLuong ?? h.sl);
    const price = num(h.DonGia ?? h.donGia ?? h.gia);
    const total = h.ThanhTien ?? h.thanhTien;
    return {
      name: h.TenHang ?? h.tenHang ?? h.ten ?? h.TenSP ?? "",
      unit: h.DonViTinh ?? h.dvt ?? h.donViTinh ?? h.DVT ?? "",
      price,
      qty,
      total: total !== undefined && total !== "" ? num(total) : price * qty,
    };
  }
  function render(data) {
    if (!data) {
      set("ngayLap", formatDate());
      set("soDonHang", "");
      return;
    }
    set("ngayLap", formatDate(data.ngayLap || data.NgayLap || data.ngayBaoGia));
    set(
      "soDonHang",
      data.soDonHang || data.SoDonHang || data.maDonHang || data.soDH || "",
    );
    const customer =
      data.khachHang ||
      data.tenKhachHang ||
      data.tenDonVi ||
      data.TenKhachHang ||
      "";
    set("khachHang", customer);
    set("khachHangLoiChao", customer || "Quý Khách Hàng");
    set("diaChi", data.diaChi || data.diaChiKhachHang || "");
    set(
      "maSoThue",
      data.maSoThue || data.mstKhachHang || data.maSoThueKhachHang || "",
    );
    set(
      "dienThoai",
      data.dienThoai || data.soDienThoai || data.dienThoaiKhachHang || "",
    );
    const list = (
      Array.isArray(data.danhSachHang)
        ? data.danhSachHang
        : Array.isArray(data.chiTiet)
          ? data.chiTiet
          : []
    )
      .map(itemData)
      .filter((x) => x.name);
    tbody.innerHTML = "";
    list.forEach((h, i) => {
      const tr = document.createElement("tr");
      [
        i + 1,
        h.name,
        h.unit,
        money(h.price),
        money(h.qty),
        money(h.total),
      ].forEach((v) => {
        const td = document.createElement("td");
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    const subtotal =
      data.tongTienHang !== undefined
        ? num(data.tongTienHang)
        : list.reduce((s, h) => s + h.total, 0);
    const vatRate = num(data.thueSuat ?? data.thueGTGT ?? 10);
    const vat =
      data.tienVAT !== undefined
        ? num(data.tienVAT)
        : num(
            data.tienThue ??
              data.tienThueGTGT ??
              Math.round((subtotal * vatRate) / 100),
          );
    const grand =
      data.tongThanhToan !== undefined
        ? num(data.tongThanhToan)
        : subtotal + vat;
    set("tongTienHang", money(subtotal) + " VNĐ");
    set("thueSuat", vatRate);
    set("tienVAT", money(vat) + " VNĐ");
    set("tongThanhToan", money(grand) + " VNĐ");
    set("tienBangChu", data.tienBangChu || amountWords(grand));
    if (Array.isArray(data.ghiChu) && data.ghiChu.length)
      ((document.getElementById("ghiChu").innerHTML = data.ghiChu
        .map((x) => "<li></li>")
        .join("")),
        [...document.querySelectorAll("#ghiChu li")].forEach(
          (li, i) => (li.textContent = data.ghiChu[i]),
        ));
    else if (typeof data.ghiChu === "string" && data.ghiChu.trim())
      ((document.getElementById("ghiChu").innerHTML = data.ghiChu
        .split(/\n/)
        .filter(Boolean)
        .map((x) => "<li></li>")
        .join("")),
        [...document.querySelectorAll("#ghiChu li")].forEach(
          (li, i) =>
            (li.textContent = data.ghiChu.split(/\n/).filter(Boolean)[i]),
        ));
  }
  render(readData());
  window.xuatPDFDonHang = async function (options = {}) {
    if (typeof window.html2pdf !== "function") {
      alert("Chưa tải được thư viện xuất PDF. Hãy kiểm tra kết nối mạng.");
      return false;
    }
    const opt = options || {};
    const hide = [".an-khi-xuat-pdf", ...(opt.hideSelectors || [])],
      show = [".chi-hien-khi-xuat-pdf", ...(opt.showSelectors || [])],
      changed = [];
    [...new Set(hide)].forEach((s) =>
      document.querySelectorAll(s).forEach((el) => {
        changed.push([el, el.style.display]);
        el.style.display = "none";
      }),
    );
    [...new Set(show)].forEach((s) =>
      document.querySelectorAll(s).forEach((el) => {
        changed.push([el, el.style.display]);
        el.style.display = "";
      }),
    );
    try {
      const order = ($("soDonHang").textContent || "BaoGia").replace(
        /[\\/:*?"<>|]/g,
        "_",
      );
    //...............................
      // đây là dòng đã sửa
     //.................................
      
     await window.PDFChung.xuat({
        element: "#khungDonHang",
        options: {
          margin: 0,
          filename: opt.filename || "Bao_Gia_" + order + ".pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            scrollY: 0,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        },
      });
     // Kết thúc sửa 
      
      if (window.parent !== window)
        window.parent.postMessage(
          { type: "donHangDaXuatPDF" },
          window.location.origin,
        );
      return true;
    } catch (e) {
      console.error(e);
      alert("Không thể xuất PDF: " + (e.message || e));
      return false;
    } finally {
      changed
        .reverse()
        .forEach(([el, display]) => (el.style.display = display));
    }
  };
  window.hienThiLaiDuLieuDonHang = () => render(readData());
  window.addEventListener("message", (e) => {
    if (e.data?.type === "xuatPDFDonHang")
      window.xuatPDFDonHang(e.data.options || {});
    if (e.data?.type === "capNhatDonHang") render(e.data.data || readData());
  });
});
