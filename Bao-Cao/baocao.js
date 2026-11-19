"use strict";

/*
  BÁO CÁO DOANH THU - LỢI NHUẬN
  Đọc dữ liệu thật từ:
  - LuuMuaHang: HoaDon, ThanhToan
  - LuuBanHang: HoaDonBan, ThuTien

  Không tạo database/store mới và không tự sinh số liệu mẫu.
*/

const $ = (id) => document.getElementById(id);

const DB_MUA = "LuuMuaHang";
const STORE_MUA = "HoaDon";
const STORE_TRA = "ThanhToan";

const DB_BAN = "LuuBanHang";
const STORE_BAN = "HoaDonBan";
const STORE_THU = "ThuTien";

const DB_CHIPHI = "QUAN_LY_CHI_PHI_DB";
const STORE_CHIPHI = "phieuChi";
const DB_CHAMCONG = "DONGDUONG_CHAMCONG_DB";
const STORE_CHAMCONG = "chamCong";
const STORE_LANUNG = "lanUng";

const reportState = {
  doanhThu: null,
  thueGTGT: null,
  loiNhuanTruocThue: null,
  phiVanHanh: null,
  vonChu: null,
  taiChinh: null,
  noNhaCC: null,
  khachHangNo: null,
  taiKhoan: null,
  tienMat: null,
  congTho: null,
  traLuong: null,
  nhaCungCap: [],
  nguoiMua: [],
};

let duLieuMua = [];
let duLieuTra = [];
let duLieuBan = [];
let duLieuThu = [];
let duLieuChi = [];
let duLieuCong = [];
let duLieuUng = [];

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let raw = String(value ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!raw) return 0;
  // Dữ liệu nhập theo chuẩn Việt Nam: 1.234.567,89
  if (raw.includes(",")) raw = raw.replace(/\./g, "").replace(/,/g, ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, "");
  return Number(raw.replace(/[^\d.-]/g, "")) || 0;
}

function formatMoney(value) {
  return Math.round(toNumber(value)).toLocaleString("vi-VN") + " đ";
}

function showMoney(id, value) {
  const element = $(id);
  if (!element) return;
  element.textContent =
    value === null || value === undefined || value === ""
      ? ""
      : formatMoney(value);
}

function getDate(invoice, fields) {
  for (const field of fields) {
    if (invoice && invoice[field]) return String(invoice[field]).slice(0, 10);
  }
  return "";
}

function inDateRange(date, from, to) {
  if (!date) return false;
  return (!from || date >= from) && (!to || date <= to);
}

/*
  Chỉ đọc database/store đã tồn tại.
  Nếu database chưa có thì trả về danh sách rỗng, không tạo database mới.
*/
function readExistingStore(dbName, storeName) {
  return new Promise((resolve, reject) => {
    function openDatabase() {
      let createdDuringOpen = false;
      const request = indexedDB.open(dbName);

      request.onupgradeneeded = () => {
        createdDuringOpen = true;
        try {
          request.transaction.abort();
        } catch (_) {}
      };

      request.onsuccess = () => {
        const db = request.result;

        if (createdDuringOpen || !db.objectStoreNames.contains(storeName)) {
          db.close();
          resolve([]);
          return;
        }

        try {
          const tx = db.transaction(storeName, "readonly");
          const get = tx.objectStore(storeName).getAll();
          get.onsuccess = () => {
            const rows = get.result || [];
            db.close();
            resolve(rows);
          };
          get.onerror = () => {
            const error = get.error;
            db.close();
            reject(error);
          };
        } catch (error) {
          db.close();
          reject(error);
        }
      };

      request.onerror = () => {
        // Trường hợp database chưa tồn tại hoặc bị hủy khi mở.
        resolve([]);
      };
    }

    if (typeof indexedDB.databases === "function") {
      indexedDB
        .databases()
        .then((list) => {
          if (!list.some((item) => item.name === dbName)) {
            resolve([]);
          } else {
            openDatabase();
          }
        })
        .catch(reject);
    } else {
      openDatabase();
    }
  });
}

function sumPayments(rows, keyField, keyValue, amountField) {
  return (rows || []).reduce((sum, item) => {
    return item[keyField] === keyValue
      ? sum + toNumber(item[amountField])
      : sum;
  }, 0);
}

function calculateSales(from, to) {
  const invoices = duLieuBan.filter((invoice) =>
    inDateRange(getDate(invoice, ["ngayBan", "ngayLap", "ngayLuu"]), from, to),
  );

  const revenue = invoices.reduce((sum, invoice) => {
    return sum + toNumber(invoice.tongTien);
  }, 0);

  const tax = invoices.reduce((sum, invoice) => {
    return sum + toNumber(invoice.tienThue);
  }, 0);

  const profit = invoices.reduce((sum, invoice) => {
    const value =
      invoice.tongLoiNhuan !== undefined
        ? toNumber(invoice.tongLoiNhuan)
        : toNumber(invoice.tongTien) - toNumber(invoice.tongVon);
    return sum + value;
  }, 0);

  return { revenue, tax, profit, invoiceCount: invoices.length };
}

function calculateSupplierDebts() {
  const map = new Map();

  duLieuMua.forEach((invoice) => {
    const name =
      String(invoice.nguoiBan || "").trim() || "Chưa ghi tên nhà cung cấp";
    const key = name.toLocaleLowerCase("vi");
    const total = toNumber(invoice.tongCong);
    const paid = sumPayments(duLieuTra, "hoaDonId", invoice.id, "soTien");
    const debt = total - paid;

    const old = map.get(key) || { name, debt: 0 };
    old.debt += debt;
    map.set(key, old);
  });

  return [...map.values()].sort((a, b) => b.debt - a.debt);
}

function calculateCustomerDebts() {
  const map = new Map();

  duLieuBan.forEach((invoice) => {
    const name =
      String(invoice.tenKhach || "").trim() || "Chưa ghi tên khách hàng";
    const key = name.toLocaleLowerCase("vi");
    const total =
      invoice.tongThanhToan !== undefined
        ? toNumber(invoice.tongThanhToan)
        : toNumber(invoice.tongTien) + toNumber(invoice.tienThue);

    const paidFromStore = sumPayments(
      duLieuThu,
      "maHoaDon",
      invoice.maHoaDon,
      "soTien",
    );
    const paid = duLieuThu.some((item) => item.maHoaDon === invoice.maHoaDon)
      ? paidFromStore
      : toNumber(invoice.tongDaThu);

    const debt = total - paid;
    const old = map.get(key) || { name, debt: 0 };
    old.debt += debt;
    map.set(key, old);
  });

  return [...map.values()].sort((a, b) => b.debt - a.debt);
}

function paymentKind(value) {
  const text = String(value || "")
    .trim()
    .toLocaleLowerCase("vi");
  if (
    text.includes("chuyển khoản") ||
    text.includes("ngân hàng") ||
    text.includes("bank")
  )
    return "bank";
  if (text.includes("tiền mặt") || text === "cash" || text.includes("tiền mặt"))
    return "cash";
  return "other";
}

function withinPeriod(row, dateFields, from, to) {
  return inDateRange(getDate(row, dateFields), from, to);
}

function calculateCashBalances(from, to) {
  let cashIn = 0,
    cashOut = 0,
    bankIn = 0,
    bankOut = 0;

  duLieuThu
    .filter((x) => withinPeriod(x, ["ngayThu", "date"], from, to))
    .forEach((x) => {
      const kind = paymentKind(x.phuongThuc);
      if (kind === "cash") cashIn += toNumber(x.soTien);
      if (kind === "bank") bankIn += toNumber(x.soTien);
    });
  duLieuTra
    .filter((x) => withinPeriod(x, ["ngayTra", "date"], from, to))
    .forEach((x) => {
      const kind = paymentKind(x.hinhThuc);
      if (kind === "cash") cashOut += toNumber(x.soTien);
      if (kind === "bank") bankOut += toNumber(x.soTien);
    });
  duLieuChi
    .filter((x) => withinPeriod(x, ["ngayChi", "date"], from, to))
    .forEach((x) => {
      const kind = paymentKind(x.hinhThuc);
      if (kind === "cash") cashOut += toNumber(x.soTien);
      if (kind === "bank") bankOut += toNumber(x.soTien);
    });
  // TRỪ TIỀN ỨNG CHO NHÂN VIÊN
  duLieuUng
    .filter((x) => withinPeriod(x, ["date"], from, to))
    .forEach((x) => {
      const kind = paymentKind(x.hinhThuc);

      if (kind === "cash") cashOut += toNumber(x.amount);
      if (kind === "bank") bankOut += toNumber(x.amount);
    });
  const openingCash = toNumber($("tienMatDauKy")?.value);
  const openingBank = toNumber($("taiKhoanDauKy")?.value);
  const cash = openingCash + cashIn - cashOut;
  const bank = openingBank + bankIn - bankOut;
  return { cash, bank, cashIn, cashOut, bankIn, bankOut };
}

function calculateOperatingCosts(from, to) {
  const expenses = duLieuChi
    .filter((x) => withinPeriod(x, ["ngayChi", "date"], from, to))
    .reduce((sum, x) => sum + toNumber(x.soTien), 0);
  const wages = duLieuCong
    .filter((x) => withinPeriod(x, ["date"], from, to))
    .reduce((sum, x) => sum + toNumber(x.amount), 0);
  const advances = duLieuUng
    .filter((x) => withinPeriod(x, ["date"], from, to))
    .reduce((sum, x) => sum + toNumber(x.amount), 0);
  return { expenses, wages, advances, total: expenses + wages };
}

function renderDebtList(containerId, rows, groupName) {
  const container = $(containerId);
  if (!container) return;
  container.replaceChildren();

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "debt-item";
    empty.style.gridTemplateColumns = "1fr";
    empty.textContent = "Không có công nợ";
    container.appendChild(empty);
    return;
  }

  rows.forEach((record, index) => {
    const label = document.createElement("label");
    label.className = "debt-item";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = groupName;
    radio.value = String(index);

    const title = document.createElement("span");
    title.className = "debt-name";
    title.textContent = record.name;

    const amount = document.createElement("span");
    amount.className = "debt-value";
    amount.textContent = formatMoney(record.debt);

    label.append(radio, title, amount);
    container.appendChild(label);
  });
}

function renderSummary(data = reportState) {
  [
    "doanhThu",
    "thueGTGT",
    "loiNhuanTruocThue",
    "loiNhuanRong",
    "phiVanHanh",
    "doanhThuHoaVon",
    "tySuatLoiNhuan",
    "diemHoaVon",
    "taiChinh",
    "noNhaCC",
    "khachHangNo",
    "taiKhoan",
    "tienMat",
    "congTho",
    "traLuong",
  ].forEach((id) => {
    const el = $(id);
    if (el) el.textContent = "";
  });

  [
    "doanhThu",
    "thueGTGT",
    "loiNhuanTruocThue",
    "phiVanHanh",
    "taiChinh",
    "noNhaCC",
    "khachHangNo",
    "taiKhoan",
    "tienMat",
    "congTho",
    "traLuong",
  ].forEach((id) => {
    if (data[id] !== null && data[id] !== undefined) showMoney(id, data[id]);
  });

  calculateReport(data);
}

function calculateReport(data = reportState) {
  const revenue = toNumber(data.doanhThu);
  const profitBeforeTax = data.loiNhuanTruocThue;
  const operatingCost = data.phiVanHanh;
  const ownerCapital = data.vonChu;

  // Chỉ tính lợi nhuận ròng khi có số liệu chi phí vận hành.
  if (
    profitBeforeTax !== null &&
    profitBeforeTax !== undefined &&
    operatingCost !== null &&
    operatingCost !== undefined
  ) {
    const netProfit = toNumber(profitBeforeTax) - toNumber(operatingCost);
    showMoney("loiNhuanRong", netProfit);
    const rate = revenue !== 0 ? (netProfit / revenue) * 100 : 0;
    const rateElement = $("tySuatLoiNhuan");
    if (rateElement) rateElement.textContent = `${rate.toFixed(2)}%`;
    data.loiNhuanRong = netProfit;
    data.tySuatLoiNhuan = rate;
  }

  // Công thức hòa vốn cần chi phí vận hành; không tự suy đoán khi thiếu dữ liệu.
  if (
    ownerCapital !== null &&
    ownerCapital !== undefined &&
    operatingCost !== null &&
    operatingCost !== undefined
  ) {
    const breakEvenRevenue = toNumber(ownerCapital) + toNumber(operatingCost);
    showMoney("doanhThuHoaVon", breakEvenRevenue);
    showMoney("diemHoaVon", breakEvenRevenue);
    data.doanhThuHoaVon = breakEvenRevenue;
    data.diemHoaVon = breakEvenRevenue;
  }
}

function getSelectedDebt(containerId, rows) {
  const selected = $(containerId)?.querySelector("input:checked");
  return selected ? [rows[Number(selected.value)]] : rows;
}

function escapeHTML(value) {
  return String(value).replace(
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

function printDebtReport(title, containerId, rows) {
  const selectedRows = getSelectedDebt(containerId, rows);
  if (!selectedRows.length) {
    alert("Chưa có dữ liệu công nợ để in.");
    return;
  }

  const popup = window.open("", "_blank");
  if (!popup) {
    alert("Vui lòng cho phép cửa sổ bật lên để in báo cáo.");
    return;
  }

  const body = selectedRows
    .map(
      (item) => `
    <tr><td>${escapeHTML(item.name)}</td>
    <td>${formatMoney(item.debt)}</td></tr>`,
    )
    .join("");

  popup.document.write(`<!doctype html><html lang="vi"><meta charset="utf-8">
    <title>${escapeHTML(title)}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px}h2{text-align:center}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:9px}
    td:last-child,th:last-child{text-align:right}</style>
    <h2>${escapeHTML(title)}</h2><table><thead><tr><th>Tên</th><th>Công nợ</th></tr></thead>
    <tbody>${body}</tbody></table></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

function updateDateRangeFromMonth() {
  const month = Number($("thang").value);
  const year = new Date().getFullYear();
  const lastDay = new Date(year, month, 0).getDate();
  $("tuNgay").value = `${year}-${String(month).padStart(2, "0")}-01`;
  $("denNgay").value =
    `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  updatePeriodLabel();
}

function updatePeriodLabel() {
  const from = $("tuNgay").value;
  const to = $("denNgay").value;
  $("periodLabel").textContent =
    from && to
      ? `${from.split("-").reverse().join("/")} – ${to.split("-").reverse().join("/")}`
      : "Khoảng thời gian đã chọn";
}

function updateReportForPeriod() {
  const from = $("tuNgay").value;
  const to = $("denNgay").value;
  const sales = calculateSales(from, to);
  const costs = calculateOperatingCosts(from, to);
  const balances = calculateCashBalances(from, to);

  reportState.doanhThu = sales.revenue;
  reportState.thueGTGT = sales.tax;
  reportState.loiNhuanTruocThue = sales.profit;
  reportState.phiVanHanh = costs.total;
  reportState.congTho = costs.wages;
  reportState.traLuong = costs.advances;
  reportState.taiKhoan = balances.bank;
  reportState.tienMat = balances.cash;
  reportState.taiChinh = balances.bank + balances.cash;

  const supplierDebts = calculateSupplierDebts();
  const customerDebts = calculateCustomerDebts();

  reportState.nhaCungCap = supplierDebts;
  reportState.nguoiMua = customerDebts;
  reportState.noNhaCC = supplierDebts.reduce((sum, x) => sum + x.debt, 0);
  reportState.khachHangNo = customerDebts.reduce((sum, x) => sum + x.debt, 0);
  // TÍNH VỐN CHỦ
  const tienMat = balances.cash;
  const tienNganHang = balances.bank;

  // Tổng công nợ khách hàng
  const noKhachHang = reportState.khachHangNo;

  // Tổng công nợ nhà cung cấp
  const noNhaCungCap = reportState.noNhaCC;

  // Giá trị hàng tồn kho
  const giaTriTonKho = reportState.giaTriTonKho || 0;

  // Tính vốn chủ
  reportState.vonChu =
    tienMat + tienNganHang + giaTriTonKho + noKhachHang - noNhaCungCap;

  // Hiển thị kết quả vào ô Vốn chủ
  $("vonChu").value = Math.round(reportState.vonChu).toLocaleString("vi-VN");
  renderSummary(reportState);
  renderDebtList("dsNhaCungCap", supplierDebts, "ncc");
  renderDebtList("dsNguoiMua", customerDebts, "buyer");

  const status = $("periodLabel");
  if (status) {
    status.title = `Đã tổng hợp ${sales.invoiceCount} hóa đơn bán hàng trong kỳ`;
  }
}

async function loadReportData() {
  const status = $("periodLabel");
  if (status) status.textContent = "Đang đọc dữ liệu...";

  const results = await Promise.all([
    readExistingStore(DB_MUA, STORE_MUA),
    readExistingStore(DB_MUA, STORE_TRA),
    readExistingStore(DB_BAN, STORE_BAN),
    readExistingStore(DB_BAN, STORE_THU),
    readExistingStore(DB_CHIPHI, STORE_CHIPHI),
    readExistingStore(DB_CHAMCONG, STORE_CHAMCONG),
    readExistingStore(DB_CHAMCONG, STORE_LANUNG),
  ]);

  [
    duLieuMua,
    duLieuTra,
    duLieuBan,
    duLieuThu,
    duLieuChi,
    duLieuCong,
    duLieuUng,
  ] = results;
  updateReportForPeriod();
}

function setReportData(data = {}) {
  Object.assign(reportState, data);
  renderSummary(reportState);
  renderDebtList("dsNhaCungCap", reportState.nhaCungCap || [], "ncc");
  renderDebtList("dsNguoiMua", reportState.nguoiMua || [], "buyer");
}

function initReportPage() {
  const monthSelect = $("thang");
  const now = new Date();

  for (let month = 1; month <= 12; month++) {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = `Tháng ${month}`;
    if (month === now.getMonth() + 1) option.selected = true;
    monthSelect.append(option);
  }

  updateDateRangeFromMonth();

  monthSelect.addEventListener("change", () => {
    updateDateRangeFromMonth();
    updateReportForPeriod();
  });

  $("tuNgay").addEventListener("change", () => {
    updatePeriodLabel();
    updateReportForPeriod();
  });

  $("denNgay").addEventListener("change", () => {
    updatePeriodLabel();
    updateReportForPeriod();
  });

  ["taiKhoanDauKy", "tienMatDauKy"].forEach((id) => {
    const input = $(id);
    if (!input) return;
    input.value = localStorage.getItem("baoCao_" + id) || "0";
    input.addEventListener("input", () => {
      localStorage.setItem("baoCao_" + id, input.value);
      updateReportForPeriod();
    });
  });

  $("btnBaoCaoQuyNam").addEventListener("click", () => window.print());
  $("btnInNoNCC").addEventListener("click", () =>
    printDebtReport(
      "Công nợ nhà cung cấp",
      "dsNhaCungCap",
      reportState.nhaCungCap,
    ),
  );
  $("btnInNoNguoiMua").addEventListener("click", () =>
    printDebtReport("Công nợ người mua", "dsNguoiMua", reportState.nguoiMua),
  );

  loadReportData().catch((error) => {
    console.error("Lỗi tải báo cáo:", error);
    const label = $("periodLabel");
    if (label) label.textContent = "Không đọc được dữ liệu";
    alert(
      "Không đọc được dữ liệu báo cáo. Hãy kiểm tra IndexedDB và chạy trang bằng HTTPS hoặc Live Server.",
    );
  });
}

document.addEventListener("DOMContentLoaded", initReportPage);
window.setReportData = setReportData;
window.reportState = reportState;
