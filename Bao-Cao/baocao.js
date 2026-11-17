"use strict";

/*
  BÁO CÁO DOANH THU - LỢI NHUẬN
  - Không chứa tên nhà cung cấp/khách hàng hoặc số liệu mẫu.
  - Dữ liệu sẽ được đưa vào từ IndexedDB hoặc các trang nghiệp vụ sau này.
  - Các hàm bên dưới phụ trách hiển thị và tính toán.
*/
const $ = id => document.getElementById(id);
const toNumber = value => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
};
const formatMoney = value => toNumber(value).toLocaleString("en-US", {
  maximumFractionDigits: 0
});

const reportState = {
  doanhThu: 0,
  thueGTGT: 0,
  loiNhuanTruocThue: 0,
  phiVanHanh: 0,
  vonChu: 0,
  taiChinh: 0,
  noNhaCC: 0,
  khachHangNo: 0,
  taiKhoan: 0,
  tienMat: 0,
  congTho: 0,
  traLuong: 0,
  nhaCungCap: [],
  nguoiMua: []
};

function showMoney(id, value) {
  const element = $(id);
  if (element) element.textContent = value === null || value === undefined ? "" : formatMoney(value);
}

function renderSummary(data = reportState) {
  [
    "doanhThu", "thueGTGT", "loiNhuanTruocThue", "loiNhuanRong",
    "phiVanHanh", "doanhThuHoaVon", "tySuatLoiNhuan", "diemHoaVon",
    "taiChinh", "noNhaCC", "khachHangNo", "taiKhoan", "tienMat",
    "congTho", "traLuong"
  ].forEach(id => {
    const el = $(id);
    if (el) el.textContent = "";
  });

  // Các chỉ số đầu vào được hiển thị từ dữ liệu đã nạp.
  ["doanhThu", "thueGTGT", "loiNhuanTruocThue", "phiVanHanh",
   "taiChinh", "noNhaCC", "khachHangNo", "taiKhoan", "tienMat",
   "congTho", "traLuong"].forEach(id => {
    if (data[id] !== null && data[id] !== undefined) showMoney(id, data[id]);
  });
  calculateReport(data);
}

function renderDebtList(containerId, rows, groupName) {
  const container = $(containerId);
  container.replaceChildren();
  (Array.isArray(rows) ? rows : []).forEach((record, index) => {
    const name = record.name ?? record.ten ?? "";
    const debt = toNumber(record.debt ?? record.no ?? 0);
    const label = document.createElement("label");
    label.className = "debt-item";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = groupName;
    radio.value = String(index);

    const title = document.createElement("span");
    title.className = "debt-name";
    title.textContent = name;

    const amount = document.createElement("span");
    amount.className = "debt-value";
    amount.textContent = formatMoney(debt);

    label.append(radio, title, amount);
    container.append(label);
  });
}

function calculateReport(data = reportState) {
  const revenue = toNumber(data.doanhThu);
  const profitBeforeTax = toNumber(data.loiNhuanTruocThue);
  const operatingCost = toNumber(data.phiVanHanh);
  const ownerCapital = toNumber(data.vonChu);

  const netProfit = profitBeforeTax - operatingCost;
  const profitRate = revenue !== 0 ? (netProfit / revenue) * 100 : 0;

  /*
    Công thức hòa vốn hiện là khung tạm tính.
    Muốn tính điểm hòa vốn kế toán chính xác cần bổ sung:
    chi phí cố định và tỷ lệ biến phí / lãi góp.
  */
  const breakEvenRevenue = ownerCapital + operatingCost;

  showMoney("loiNhuanRong", netProfit);
  showMoney("doanhThuHoaVon", breakEvenRevenue);
  showMoney("diemHoaVon", breakEvenRevenue);

  const rateElement = $("tySuatLoiNhuan");
  if (rateElement) rateElement.textContent = revenue ? `${profitRate.toFixed(2)}%` : "";

  // Cập nhật giá trị tính toán trở lại state để các phần khác có thể sử dụng.
  data.loiNhuanRong = netProfit;
  data.tySuatLoiNhuan = profitRate;
  data.doanhThuHoaVon = breakEvenRevenue;
  data.diemHoaVon = breakEvenRevenue;
}

/*
  Hàm nạp dữ liệu dùng khi kết nối IndexedDB.
  Ví dụ:
  setReportData({
    doanhThu: 500000000,
    thueGTGT: 50000000,
    loiNhuanTruocThue: 120000000,
    phiVanHanh: 20000000,
    vonChu: 200000000,
    nhaCungCap: [{name: "Nhà cung cấp A", debt: 1000000}],
    nguoiMua: [{name: "Khách hàng B", debt: 2000000}]
  });
*/
function setReportData(data = {}) {
  Object.assign(reportState, data);
  renderSummary(reportState);
  renderDebtList("dsNhaCungCap", reportState.nhaCungCap, "ncc");
  renderDebtList("dsNguoiMua", reportState.nguoiMua, "buyer");
}

function getSelectedDebt(containerId, rows) {
  const selected = $(containerId).querySelector("input:checked");
  return selected ? [rows[Number(selected.value)]] : rows;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
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
  const body = selectedRows.map(item => `
    <tr><td>${escapeHTML(item.name ?? item.ten ?? "")}</td>
    <td>${formatMoney(item.debt ?? item.no ?? 0)}</td></tr>`).join("");
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

  function updateDateRange() {
    const month = Number(monthSelect.value);
    const year = now.getFullYear();
    const lastDay = new Date(year, month, 0).getDate();
    $("tuNgay").value = `${year}-${String(month).padStart(2, "0")}-01`;
    $("denNgay").value = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    $("periodLabel").textContent = `Tháng ${month} / ${year}`;
  }

  updateDateRange();
  monthSelect.addEventListener("change", updateDateRange);

  // Vốn chủ là dữ liệu nhập; các kết quả được tính bằng JavaScript.
  $("vonChu").addEventListener("input", () => {
    reportState.vonChu = toNumber($("vonChu").value);
    calculateReport(reportState);
  });

  $("btnBaoCaoQuyNam").addEventListener("click", () => window.print());
  $("btnInNoNCC").addEventListener("click", () =>
    printDebtReport("Công nợ nhà cung cấp", "dsNhaCungCap", reportState.nhaCungCap));
  $("btnInNoNguoiMua").addEventListener("click", () =>
    printDebtReport("Công nợ người mua", "dsNguoiMua", reportState.nguoiMua));

  // Khởi tạo giao diện rỗng, không tự điền dữ liệu giả.
  renderDebtList("dsNhaCungCap", [], "ncc");
  renderDebtList("dsNguoiMua", [], "buyer");
  renderSummary(reportState);
}

document.addEventListener("DOMContentLoaded", initReportPage);

// Cho phép module khác gọi khi đã lấy dữ liệu từ IndexedDB.
window.setReportData = setReportData;
window.reportState = reportState;
