"use strict";

/*
  BẢNG TỒN KHO
  - Chỉ lấy sản phẩm có phát sinh trong hóa đơn mua đã lưu (LuuMuaHang/HoaDon).
  - Không dùng Nguon.json để tạo danh sách sản phẩm.
  - Nguon.json chỉ dùng tra tên theo MaSP; không có phát sinh mua thì không hiển thị.
  - Số lượng và giá mua được quy đổi về ĐVT đầu tiên của từng MaSP trong DVT.json.
*/

const DB_MUA = "LuuMuaHang";
const STORE_MUA = "HoaDon";
const DB_BAN = "LuuBanHang";
const STORE_BAN = "HoaDonBan";

let danhSachTon = [];
let danhSachDVT = [];
let danhMucNguon = [];
let tuKhoaHienTai = "";

const $ = (id) => document.getElementById(id);
const chuanHoa = (v) => String(v ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
const dinhDangSo = (v) => (Number(v) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
const dinhDangTien = (v) => Math.round(Number(v) || 0).toLocaleString("vi-VN") + " đ";

function docSo(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").trim().replace(/\s/g, "");
  if (!s) return 0;
  return Number(s.replace(/\./g, "").replace(/,/g, ".")) || 0;
}

async function taiJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error("Không tải được " + path + " (HTTP " + res.status + ")");
  return res.json();
}

// Chỉ mở database đã tồn tại; tuyệt đối không tạo database/store mới.
function docStoreNeuDaTonTai(dbName, storeName) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB.databases === "function") {
      indexedDB.databases().then((dbs) => {
        if (!dbs.some((x) => x.name === dbName)) return resolve([]);
        moVaDoc();
      }).catch(reject);
    } else {
      moVaDoc();
    }

    function moVaDoc() {
      let vuaTao = false;
      const req = indexedDB.open(dbName);
      req.onupgradeneeded = () => {
        vuaTao = true;
        req.transaction.abort();
      };
      req.onsuccess = () => {
        const database = req.result;
        if (vuaTao || !database.objectStoreNames.contains(storeName)) {
          database.close();
          resolve([]);
          return;
        }
        try {
          const tx = database.transaction(storeName, "readonly");
          const get = tx.objectStore(storeName).getAll();
          get.onsuccess = () => { const rows = get.result || []; database.close(); resolve(rows); };
          get.onerror = () => { const err = get.error; database.close(); reject(err); };
        } catch (err) {
          database.close();
          reject(err);
        }
      };
      req.onerror = () => resolve([]);
    }
  });
}

function timDVT(maSP, donViTinh) {
  return danhSachDVT.find((x) =>
    chuanHoa(x.MaSP) === chuanHoa(maSP) &&
    chuanHoa(x.DonViTinh) === chuanHoa(donViTinh)
  );
}

function dvtGoc(maSP) {
  // Thứ tự trong DVT.json được giữ nguyên; dòng đầu tiên của mã hàng là đơn vị chuẩn.
  return danhSachDVT.find((x) => chuanHoa(x.MaSP) === chuanHoa(maSP)) || null;
}

function heSoDVT(maSP, donViTinh, heSoDaLuu) {
  const dvt = timDVT(maSP, donViTinh);
  const saved = Number(heSoDaLuu);
  if (saved > 0) return saved;
  const factor = Number(dvt?.HeSoQuyDoi);
  return factor > 0 ? factor : 1;
}

function tenTheoMa(maSP, tenDuPhong) {
  const item = danhMucNguon.find((x) => chuanHoa(x.MaSP) === chuanHoa(maSP));
  return String(tenDuPhong || item?.TenHang || maSP || "Sản phẩm chưa có tên").trim();
}

function ngayHoaDonMua(hd) {
  return String(hd.ngayLap || hd.ngayLuu || "");
}

async function napTonKho() {
  $("trangThai").textContent = "Đang đọc hóa đơn nhập và bán...";
  const [hoaDonMua, hoaDonBan] = await Promise.all([
    docStoreNeuDaTonTai(DB_MUA, STORE_MUA),
    docStoreNeuDaTonTai(DB_BAN, STORE_BAN)
  ]);

  const map = new Map();

  // Tạo danh sách mặt hàng từ các dòng đã mua, không duyệt toàn bộ Nguon.json.
  hoaDonMua.forEach((hd) => {
    (hd.chiTiet || []).forEach((dong) => {
      const ma = String(dong.maHang || "").trim();
      const ten = tenTheoMa(ma, dong.tenHang);
      if (!ma && !ten) return;
      const key = ma ? chuanHoa(ma) : "ten:" + chuanHoa(ten);
      const goc = dvtGoc(ma);
      if (!map.has(key)) {
        map.set(key, {
          maHang: ma,
          tenHang: ten,
          donViGoc: String(goc?.DonViTinh || dong.donViTinh || ""),
          heSoGoc: Number(goc?.HeSoQuyDoi) > 0 ? Number(goc.HeSoQuyDoi) : 1,
          tongMua: 0,
          tongBan: 0,
          giaMuaGanNhatGoc: 0,
          ngayMuaGanNhat: "",
          tongGiaTriNhap: 0
        });
      }
      const sp = map.get(key);
      const sl = docSo(dong.soLuong);
      const factor = heSoDVT(ma, dong.donViTinh, dong.heSoQuyDoi);
      const qtyBase = sl * factor / sp.heSoGoc;
      sp.tongMua += qtyBase;

      const gia = docSo(dong.donGia);
      const giaBase = gia * sp.heSoGoc / factor;
      const ngay = ngayHoaDonMua(hd);
      if (gia > 0 && (!sp.ngayMuaGanNhat || ngay >= sp.ngayMuaGanNhat)) {
        sp.ngayMuaGanNhat = ngay;
        sp.giaMuaGanNhatGoc = giaBase;
      }
    });
  });

  // Trừ các dòng bán có mã hàng khớp; nếu thiếu mã thì đối chiếu tên hàng.
  hoaDonBan.forEach((hd) => {
    (hd.hangHoa || []).forEach((dong) => {
      const ma = String(dong.maHang || "").trim();
      const tenKey = "ten:" + chuanHoa(dong.tenHang);
      const key = ma ? chuanHoa(ma) : tenKey;
      let sp = map.get(key);
      if (!sp && !ma) sp = [...map.values()].find((x) => chuanHoa(x.tenHang) === chuanHoa(dong.tenHang));
      if (!sp) return; // Chỉ trừ bán của sản phẩm đã từng nhập.
      const factor = heSoDVT(sp.maHang, dong.donViTinh, 0);
      const qtyBase = docSo(dong.soLuong) * factor / sp.heSoGoc;
      sp.tongBan += qtyBase;
    });
  });

  danhSachTon = [...map.values()]
    .map((sp) => ({
      ...sp,
      tonKho: sp.tongMua - sp.tongBan,
      giaTriTon: (sp.tongMua - sp.tongBan) * sp.giaMuaGanNhatGoc
    }))
    .sort((a, b) => a.tenHang.localeCompare(b.tenHang, "vi"));

  render();
  $("trangThai").textContent = `Đã đọc ${hoaDonMua.length} phiếu mua · ${hoaDonBan.length} phiếu bán`;
}

function render() {
  const ds = danhSachTon.filter((sp) => !tuKhoaHienTai || chuanHoa(sp.tenHang).includes(chuanHoa(tuKhoaHienTai)) || chuanHoa(sp.maHang).includes(chuanHoa(tuKhoaHienTai)));
  const list = $("danhSachTonKho");
  list.replaceChildren();

  if (!ds.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = '<span class="empty-icon">▤</span><strong>' +
      (danhSachTon.length ? "Không tìm thấy sản phẩm phù hợp" : "Chưa có mặt hàng nhập kho") +
      '</strong><span>' +
      (danhSachTon.length ? "Thử tìm bằng tên hoặc mã sản phẩm khác." : "Khi chưa có hóa đơn mua hàng được lưu, danh sách tồn kho sẽ để trống. Danh mục Nguon.json không tự đổ vào bảng.") +
      '</span>';
    list.appendChild(empty);
  } else {
    ds.forEach((sp, index) => {
      const row = document.createElement("article");
      row.className = "stock-item" + (sp.tonKho < 0 ? " stock-negative" : "");
      const main = document.createElement("div");
      main.className = "stock-main";
      const nameWrap = document.createElement("div");
      nameWrap.className = "stock-name-wrap";
      const number = document.createElement("span");
      number.className = "stock-index";
      number.textContent = String(index + 1).padStart(2, "0");
      const nameBlock = document.createElement("div");
      const name = document.createElement("div");
      name.className = "stock-name";
      name.textContent = sp.tenHang;
      const code = document.createElement("div");
      code.className = "stock-code";
      code.textContent = sp.maHang ? "Mã hàng: " + sp.maHang : "";
      nameBlock.append(name, code);
      nameWrap.append(number, nameBlock);
      const qty = document.createElement("div");
      qty.className = "stock-qty";
      const amount = document.createElement("strong");
      amount.textContent = dinhDangSo(sp.tonKho);
      const unit = document.createElement("span");
      unit.textContent = sp.donViGoc || "Đơn vị tính";
      qty.append(amount, unit);
      main.append(nameWrap, qty);

      const details = document.createElement("div");
      details.className = "stock-details";
      details.append(
        taoChiTiet("Tổng nhập", dinhDangSo(sp.tongMua) + " " + sp.donViGoc),
        taoChiTiet("Tổng bán", dinhDangSo(sp.tongBan) + " " + sp.donViGoc),
        taoChiTiet("Giá mua gần nhất", dinhDangTien(sp.giaMuaGanNhatGoc) + " / " + (sp.donViGoc || "ĐVT")),
        taoChiTiet("Giá trị tồn", dinhDangTien(sp.giaTriTon))
      );
      row.append(main, details);
      list.appendChild(row);
    });
  }

  $("soMatHang").textContent = dinhDangSo(danhSachTon.length);
  $("tongSoLuong").textContent = dinhDangSo(danhSachTon.reduce((s, x) => s + x.tonKho, 0));
  $("soKetQua").textContent = `${ds.length} sản phẩm`;
  $("tongTienTon").textContent = dinhDangTien(danhSachTon.reduce((s, x) => s + x.giaTriTon, 0));
}

function taoChiTiet(label, value) {
  const span = document.createElement("span");
  span.className = "detail";
  const b = document.createElement("b");
  b.textContent = value;
  span.append(document.createTextNode(label), b);
  return span;
}

async function khoiTao() {
  $("timKiem").addEventListener("input", (e) => {
    tuKhoaHienTai = e.target.value;
    render();
  });
  $("xoaTimKiem").addEventListener("click", () => {
    $("timKiem").value = "";
    tuKhoaHienTai = "";
    render();
    $("timKiem").focus();
  });
  $("btnTaiLai").addEventListener("click", taiLai);
  await taiLai();
}

async function taiLai() {
  try {
    $("trangThai").textContent = "Đang tải...";
    const [dvt, nguon] = await Promise.all([
      taiJSON("../DVT.json"),
      taiJSON("../Nguon.json")
    ]);
    danhSachDVT = Array.isArray(dvt) ? dvt : [];
    danhMucNguon = Array.isArray(nguon) ? nguon : [];
    await napTonKho();
  } catch (error) {
    console.error(error);
    $("trangThai").textContent = "Không tải được dữ liệu";
    $("danhSachTonKho").innerHTML = '<div class="empty-state"><strong>Lỗi tải dữ liệu</strong><span>' + error.message + '</span></div>';
  }
}

document.addEventListener("DOMContentLoaded", khoiTao);
