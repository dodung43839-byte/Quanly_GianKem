// =====================================================
// ĐỒNG HỒ: THỨ - GIỜ - NGÀY
// =====================================================

function capNhatDongHo() {
  const now = new Date();

  const thu = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy"
  ];

  const ngay = String(now.getDate()).padStart(2, "0");
  const thang = String(now.getMonth() + 1).padStart(2, "0");
  const nam = now.getFullYear();

  const gio = String(now.getHours()).padStart(2, "0");
  const phut = String(now.getMinutes()).padStart(2, "0");
  const giay = String(now.getSeconds()).padStart(2, "0");

  const thuElement = document.getElementById("thuHienTai");
  const gioElement = document.getElementById("gioHienTai");
  const ngayElement = document.getElementById("ngayHienTai");

  if (thuElement) thuElement.textContent = thu[now.getDay()];
  if (gioElement) gioElement.textContent = `${gio}:${phut}:${giay}`;
  if (ngayElement) ngayElement.textContent = `${ngay}-${thang}-${nam}`;
}

capNhatDongHo();
setInterval(capNhatDongHo, 1000);
// =====================================================
// NÚT ĐƠN HÀNG: MỞ TRANG BÁO GIÁ
// =====================================================

const nutDonHang = document.getElementById("menuDonHang");

if (nutDonHang) {
  nutDonHang.addEventListener("click", function () {
    window.location.href = "Bao-Gia/baogia.html";
  });
}
