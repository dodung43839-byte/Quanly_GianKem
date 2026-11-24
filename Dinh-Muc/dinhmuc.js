"use strict";
const $ = (id) => document.getElementById(id);
const DB_MUA = "LuuMuaHang",
  STORE_HOA_DON = "HoaDon",
  DB_DINH_MUC = "QuanLyDinhMuc",
  STORE_DINH_MUC = "DinhMuc";
let danhMucHang = [],
  danhSachDVT = [],
  dinhMucGoc = [],
  dinhMucHienTai = new Map(),
  danhSachGiaMua = [];
let sanPhamDangChon = null,
  dongDangChon = -1,
  cheDoHopThoai = "them",
  dongDangSua = -1,
  dbDinhMuc = null;
const norm = (v) =>
  String(v ?? "")
    .trim()
    .toLocaleLowerCase("vi");
function so(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
const tien = (v) => `${Math.round(so(v)).toLocaleString("vi-VN")} đ`;
const luong = (v) =>
  so(v).toLocaleString("vi-VN", { maximumFractionDigits: 6 });
function thongBao(msg, error = false) {
  $("thongBao").textContent = msg;
  $("thongBao").style.color = error ? "#b91c1c" : "#176b3b";
}
async function taiJSON(path) {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error(`Không tải được ${path} (HTTP ${r.status})`);
  return r.json();
}
function layDVT(ma) {
  return danhSachDVT.filter((x) => norm(x.MaSP) === norm(ma));
}
function timSanPham(ma) {
  return danhMucHang.find((x) => norm(x.MaSP) === norm(ma));
}
function heSoHopLe(row) {
  const n = Number(row.HeSoQuyDoi);
  return Number.isFinite(n) && n > 0 ? n : null;
}
async function moDatabaseMuaNeuCo() {
  if (typeof indexedDB.databases !== "function") {
    throw new Error(
      "Trình duyệt không hỗ trợ kiểm tra database hiện có. Không thể xác nhận dữ liệu giá mua.",
    );
  }
  const ds = await indexedDB.databases();
  if (!ds.some((x) => x.name === DB_MUA)) return [];
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_MUA);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_HOA_DON)) {
        db.close();
        resolve([]);
        return;
      }
      const tx = db.transaction(STORE_HOA_DON, "readonly"),
        get = tx.objectStore(STORE_HOA_DON).getAll();
      get.onsuccess = () => {
        const a = get.result || [];
        db.close();
        resolve(a);
      };
      get.onerror = () => {
        const e = get.error;
        db.close();
        reject(e);
      };
      tx.onerror = () => {
        const e = tx.error;
        db.close();
        reject(e);
      };
    };
    req.onerror = () => reject(req.error);
  });
}
function giaMuaMoiNhat(ma, dvt) {
  const ds = [];
  for (const hd of danhSachGiaMua) {
    for (const item of hd.chiTiet || []) {
      if (
        norm(item.maHang) === norm(ma) &&
        norm(item.donViTinh) === norm(dvt) &&
        so(item.donGia) > 0
      )
        ds.push({
          gia: so(item.donGia),
          ngay: String(hd.ngayLap || hd.ngayLuu || ""),
        });
    }
  }
  ds.sort((a, b) => b.ngay.localeCompare(a.ngay));
  return ds.length ? ds[0].gia : null;
}
function moDBDinhMuc() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_DINH_MUC, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DINH_MUC))
        db.createObjectStore(STORE_DINH_MUC, { keyPath: "maThanhPham" });
    };
    req.onsuccess = () => {
      dbDinhMuc = req.result;
      dbDinhMuc.onversionchange = () => dbDinhMuc.close();
      resolve(dbDinhMuc);
    };
    req.onerror = () => reject(req.error);
  });
}
function docTatCaDinhMucDaSua() {
  return new Promise((resolve, reject) => {
    const tx = dbDinhMuc.transaction(STORE_DINH_MUC, "readonly"),
      req = tx.objectStore(STORE_DINH_MUC).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
function luuDinhMucSanPham(record) {
  return new Promise((resolve, reject) => {
    const tx = dbDinhMuc.transaction(STORE_DINH_MUC, "readwrite");
    tx.objectStore(STORE_DINH_MUC).put(record);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Không lưu được định mức"));
  });
}
function chuanHoaDong(r) {
  return {
    maNL: String(r["Mã NL"] ?? r.maNL ?? "").trim(),
    nguyenLieu: String(r["Nguyên Liệu"] ?? r.nguyenLieu ?? "").trim(),
    dvt: String(r["ĐVT"] ?? r.dvt ?? "").trim(),
    dinhMuc: so(r["Đ.Mức"] ?? r.dinhMuc),
    giaNhapCu: so(r["Giá nhập"] ?? r.giaNhapCu),
  };
}
function napDinhMucGoc() {
  const map = new Map();
  for (const r of dinhMucGoc) {
    const ma = String(r["Mã Thành Phẩm"] ?? "").trim();
    if (!ma) continue;
    if (!map.has(ma))
      map.set(ma, {
        maThanhPham: ma,
        tenThanhPham: String(r["Thành Phẩm"] ?? ""),
        nguyenLieu: [],
      });
    map.get(ma).nguyenLieu.push(chuanHoaDong(r));
  }
  return map;
}
async function hopNhatDinhMuc() {
  const map = napDinhMucGoc();
  for (const r of await docTatCaDinhMucDaSua()) map.set(r.maThanhPham, r);
  return map;
}
function veDanhSachSanPham() {
  const kw = norm($("tuKhoa").value),
    group = $("locNhom").value;
  const ds = danhMucHang.filter(
    (x) =>
      (!group || norm(x.Nhom) === norm(group)) &&
      (!kw || norm(x.MaSP).includes(kw) || norm(x.TenHang).includes(kw)),
  );
  $("soSanPham").textContent = `${ds.length} sản phẩm`;
  const tb = $("dsSanPham");
  tb.replaceChildren();
  const cards = $("dsSanPhamMobile");
  cards.replaceChildren();
  if (!ds.length) {
    const tr = document.createElement("tr"),
      td = document.createElement("td");
    td.colSpan = 3;
    td.className = "empty";
    td.textContent = "Không tìm thấy sản phẩm";
    tr.append(td);
    tb.append(tr);
    cards.textContent = "Không tìm thấy sản phẩm";
    return;
  }
  for (const x of ds) {
    const tr = document.createElement("tr");
    if (sanPhamDangChon && norm(sanPhamDangChon.MaSP) === norm(x.MaSP))
      tr.className = "active";
    [x.MaSP, x.TenHang, x.DonViTinh || ""].forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v || "";
      tr.append(td);
    });
    tr.addEventListener("click", () => chonSanPham(x));
    tb.append(tr);
    const b = document.createElement("button");
    b.type = "button";
    b.className =
      "product-card" +
      (sanPhamDangChon && norm(sanPhamDangChon.MaSP) === norm(x.MaSP)
        ? " active"
        : "");
    const n = document.createElement("span");
    n.className = "p-name";
    n.textContent = x.TenHang;
    const c = document.createElement("span");
    c.className = "p-code";
    c.textContent = x.MaSP;
    const u = document.createElement("span");
    u.className = "p-unit";
    u.textContent = x.DonViTinh || "";
    b.append(n, c, u);
    b.addEventListener("click", () => chonSanPham(x));
    cards.append(b);
  }
}
function chonSanPham(x) {
  sanPhamDangChon = x;
  dongDangChon = -1;
  veDanhSachSanPham();
  veChiTiet();
}
// phần sua

function renderUnitCards(baseTotal, complete, nhanCong = 0) {
  const box = $("dsGiaTheoDVT");
  box.replaceChildren();

  if (!sanPhamDangChon) {
    box.innerHTML =
      '<div class="empty-card">Chọn thành phẩm để xem giá thành theo đơn vị tính.</div>';
    return;
  }

  const units = layDVT(sanPhamDangChon.MaSP);
  if (!units.length) {
    box.innerHTML =
      '<div class="empty-card">Chưa có đơn vị tính trong DVT.json.</div>';
    return;
  }

  // Giá thành một đơn vị gốc của sản phẩm đi kèm:
  // tổng nguyên liệu theo định mức + nhân công đã lưu của sản phẩm đó.
  function tinhGiaThanhDinhMuc(maSP) {
    const record = dinhMucHienTai.get(maSP);
    if (
      !record ||
      !Array.isArray(record.nguyenLieu) ||
      !record.nguyenLieu.length
    ) {
      return null;
    }

    let tongNguyenLieu = 0;
    for (const r of record.nguyenLieu) {
      const gia = giaMuaMoiNhat(r.maNL, r.dvt);
      if (gia === null) return null;
      tongNguyenLieu += gia * so(r.dinhMuc);
    }

    return tongNguyenLieu + so(record.nhanCong);
  }

  for (const u of units) {
    const card = document.createElement("div");
    card.className = "unit-card";

    const name = document.createElement("div");
    name.className = "unit-name";
    name.textContent = u.DonViTinh || "Chưa đặt ĐVT";

    const factor = heSoHopLe(u);
    const f = document.createElement("div");
    f.className = "unit-factor";
    f.textContent = factor
      ? `Hệ số quy đổi: ${luong(factor)}`
      : "Thiếu hệ số quy đổi";

    const price = document.createElement("strong");
    const status = document.createElement("div");
    status.className = "unit-status";

    if (!complete) {
      price.textContent = "CHƯA ĐỦ DỮ LIỆU";
      status.textContent = "Cần bổ sung giá mua nguyên liệu định mức";
    } else if (!factor) {
      price.textContent = "THIẾU HỆ SỐ";
      status.textContent = "Kiểm tra HeSoQuyDoi trong DVT.json";
    } else {
      let tongGia = (baseTotal + so(nhanCong)) * factor;
      let hopLe = true;
      let ghiChu = "Đã gồm nhân công sản phẩm chính";

      const maDiKem = String(u.MaSPDiKem || "").trim();
      const soLuongDiKem = so(u.SoLuongDiKem);

      if (soLuongDiKem < 0) {
        hopLe = false;
        ghiChu = "Số lượng sản phẩm đi kèm không hợp lệ";
      } else if (soLuongDiKem > 0) {
        const giaDiKem = tinhGiaThanhDinhMuc(maDiKem);
        if (giaDiKem === null) {
          hopLe = false;
          ghiChu = `Chưa có định mức hoặc thiếu giá nguyên liệu của ${maDiKem}`;
        } else {
          tongGia += giaDiKem * soLuongDiKem;
          ghiChu = `Đã gồm nhân công; cộng ${maDiKem} × ${luong(soLuongDiKem)} (đã gồm nhân công đi kèm)`;
        }
      }

      price.textContent = hopLe ? tien(tongGia) : "CHƯA ĐỦ DỮ LIỆU";
      status.textContent = ghiChu;
    }

    card.append(name, f, price, status);
    box.append(card);
  }
}

// phần xong

function veChiTiet() {
  const has = !!sanPhamDangChon;
  ["btnThem", "btnSua", "btnXoa", "btnLuu"].forEach(
    (id) => ($(id).disabled = !has),
  );
  if (!has) return;
  const ma = sanPhamDangChon.MaSP,
    record = dinhMucHienTai.get(ma) || {
      maThanhPham: ma,
      tenThanhPham: sanPhamDangChon.TenHang,
      nguyenLieu: [],
    };
  $("tenThanhPham").textContent = sanPhamDangChon.TenHang;
  $("maThanhPham").textContent = `${ma} · ${sanPhamDangChon.Nhom || ""}`;
  const units = layDVT(ma),
    baseUnit = units.find((x) => heSoHopLe(x) === 1) || units[0];
  $("donViGiaThanhPham").textContent =
    `Đơn vị gốc: ${baseUnit?.DonViTinh || sanPhamDangChon.DonViTinh || "—"}`;
  const tb = $("dsNguyenLieu"),
    cards = $("dsNguyenLieuMobile");
  tb.replaceChildren();
  cards.replaceChildren();
  let total = 0,
    missing = 0;
  const rows = record.nguyenLieu || [];
  $("soDongNguyenLieu").textContent = `${rows.length} nguyên liệu`;
  if (!rows.length) {
    const tr = document.createElement("tr"),
      td = document.createElement("td");
    td.colSpan = 6;
    td.className = "empty";
    td.textContent = "Sản phẩm chưa có định mức nguyên liệu";
    tr.append(td);
    tb.append(tr);
    cards.innerHTML =
      '<div class="empty-card">Sản phẩm chưa có định mức nguyên liệu.</div>';
  } else
    rows.forEach((r, i) => {
      const price = giaMuaMoiNhat(r.maNL, r.dvt),
        line = price === null ? null : price * so(r.dinhMuc);
      if (line === null) missing++;
      else total += line;
      const vals = [
        r.maNL,
        r.nguyenLieu,
        r.dvt,
        luong(r.dinhMuc),
        price === null ? "CHƯA CÓ GIÁ" : tien(price),
        line === null ? "CHƯA CÓ GIÁ" : tien(line),
      ];
      const tr = document.createElement("tr");
      if (i === dongDangChon) tr.className = "selected";
      vals.forEach((v, j) => {
        const td = document.createElement("td");
        td.textContent = v;
        if (j >= 3) td.className = "number";
        tr.append(td);
      });
      tr.addEventListener("click", () => {
        dongDangChon = i;
        veChiTiet();
      });
      tb.append(tr);
      const card = document.createElement("div");
      card.className =
        "material-card" + (i === dongDangChon ? " selected" : "");
      const top = document.createElement("div");
      top.className = "mc-top";
      const name = document.createElement("div");
      name.className = "mc-name";
      name.textContent = r.nguyenLieu;
      const code = document.createElement("div");
      code.className = "mc-code";
      code.textContent = r.maNL;
      name.append(code);
      const unit = document.createElement("span");
      unit.className = "mc-unit";
      unit.textContent = r.dvt;
      top.append(name, unit);
      const data = document.createElement("div");
      data.className = "mc-data";
      [
        ["Định mức", luong(r.dinhMuc)],
        ["Giá mua", price === null ? "CHƯA CÓ GIÁ" : tien(price)],
        ["Thành tiền / TP gốc", line === null ? "CHƯA CÓ GIÁ" : tien(line)],
      ].forEach((pair, j) => {
        const cell = document.createElement("div");
        if (j === 2) cell.className = "mc-total";
        const label = document.createElement("span");
        label.textContent = pair[0];
        const val = document.createElement("strong");
        val.textContent = pair[1];
        cell.append(label, val);
        data.append(cell);
      });
      card.append(top, data);
      card.addEventListener("click", () => {
        dongDangChon = i;
        veChiTiet();
      });
      cards.append(card);
    });
  const complete = rows.length > 0 && missing === 0;
  const totalText = complete ? tien(total) : "CHƯA ĐỦ DỮ LIỆU";
  const nhanCong = so(record.nhanCong);
  $("tongGiaNguyenLieu").textContent = totalText;
  $("nhanCongNhap").value = tien(nhanCong);

  $("tongGiaThanhCoNhanCong").textContent = complete
    ? tien(total + nhanCong)
    : "CHƯA ĐỦ DỮ LIỆU";
  $("giaThanhPham").textContent = complete
    ? tien(total + nhanCong)
    : "CHƯA ĐỦ DỮ LIỆU";
  $("btnSua").disabled = dongDangChon < 0;
  $("btnXoa").disabled = dongDangChon < 0;
  renderUnitCards(total, complete, nhanCong);
}
function timVatTu(value) {
  const raw = String(value || "").trim();
  return (
    danhMucHang.find((x) => norm(x.MaSP) === norm(raw)) ||
    danhMucHang.find((x) => norm(x.TenHang) === norm(raw))
  );
}
function napGoiY() {
  const list = $("goiYNguyeLieu");
  list.replaceChildren();
  danhMucHang
    .filter((x) => ["nguyen_lieu", "hang_hoa"].includes(norm(x.Nhom)))
    .forEach((x) => {
      const op = document.createElement("option");
      op.value = x.MaSP;
      op.label = `${x.TenHang} (${x.MaSP})`;
      list.append(op);
    });
}
function capNhatDVT(item, selected = "") {
  const s = $("dvtNguyenLieu");
  s.replaceChildren();
  const names = [
    ...new Set(
      layDVT(item.MaSP)
        .map((x) => String(x.DonViTinh || "").trim())
        .filter(Boolean),
    ),
  ];
  if (!names.length && item.DonViTinh) names.push(item.DonViTinh);
  names.forEach((n) => {
    const op = document.createElement("option");
    op.value = n;
    op.textContent = n;
    s.append(op);
  });
  if (selected) s.value = selected;
  capNhatPreview();
}
function capNhatPreview() {
  const item = timVatTu($("chonNguyenLieu").value),
    price = item ? giaMuaMoiNhat(item.MaSP, $("dvtNguyenLieu").value) : null;
  $("giaNguyenLieuPreview").textContent =
    price === null ? "CHƯA CÓ GIÁ" : tien(price);
}
function moHopThoai(mode) {
  if (!sanPhamDangChon) return;
  cheDoHopThoai = mode;
  dongDangSua = mode === "sua" ? dongDangChon : -1;
  const rec = dinhMucHienTai.get(sanPhamDangChon.MaSP) || { nguyenLieu: [] },
    row = mode === "sua" ? rec.nguyenLieu[dongDangSua] : null;
  $("tieuDeHopThoai").textContent =
    mode === "sua" ? "Sửa nguyên liệu" : "Thêm nguyên liệu";
  $("chonNguyenLieu").value = row?.maNL || "";
  $("dinhMucNhap").value = row ? String(row.dinhMuc).replace(".", ",") : "";
  const item = row ? timVatTu(row.maNL) : null;
  if (item) capNhatDVT(item, row.dvt);
  else {
    $("dvtNguyenLieu").replaceChildren();
    $("giaNguyenLieuPreview").textContent = "CHƯA CÓ GIÁ";
  }
  $("hopThoaiNguyenLieu").showModal();
}
function dongHopThoai() {
  $("hopThoaiNguyenLieu").close();
}
function xacNhanNguyenLieu(e) {
  e.preventDefault();
  const item = timVatTu($("chonNguyenLieu").value),
    dvt = $("dvtNguyenLieu").value,
    qty = so($("dinhMucNhap").value);
  if (!item) {
    thongBao("Vui lòng chọn nguyên liệu có trong danh mục.", true);
    return;
  }
  if (!dvt || !(qty > 0)) {
    thongBao("Đơn vị tính và định mức phải hợp lệ.", true);
    return;
  }
  const rec = dinhMucHienTai.get(sanPhamDangChon.MaSP) || {
    maThanhPham: sanPhamDangChon.MaSP,
    tenThanhPham: sanPhamDangChon.TenHang,
    nguyenLieu: [],
  };
  const row = {
    maNL: item.MaSP,
    nguyenLieu: item.TenHang,
    dvt,
    dinhMuc: qty,
    giaNhapCu: 0,
  };
  if (cheDoHopThoai === "sua" && dongDangSua >= 0)
    rec.nguyenLieu[dongDangSua] = row;
  else rec.nguyenLieu.push(row);
  dinhMucHienTai.set(sanPhamDangChon.MaSP, rec);
  dongHopThoai();
  dongDangChon = -1;
  veChiTiet();
  thongBao("Đã cập nhật trên màn hình. Nhấn “Lưu định mức” để lưu lâu dài.");
}
async function luuHienTai() {
  if (!sanPhamDangChon) return;
  const rec = dinhMucHienTai.get(sanPhamDangChon.MaSP) || {
    maThanhPham: sanPhamDangChon.MaSP,
    tenThanhPham: sanPhamDangChon.TenHang,
    nguyenLieu: [],
  };
  rec.tenThanhPham = sanPhamDangChon.TenHang;
  const rawNhanCong = String($("nhanCongNhap").value ?? "").trim();
  const nhanCong = so(rawNhanCong.replace(/\./g, ""));
  if (nhanCong < 0 || (rawNhanCong && !Number.isFinite(nhanCong))) {
    thongBao("Tiền nhân công phải là số không âm.", true);
    return;
  }
  rec.nhanCong = nhanCong;
  try {
    await luuDinhMucSanPham(rec);
    dinhMucHienTai.set(sanPhamDangChon.MaSP, rec);
    veChiTiet();
    thongBao(
      `Đã lưu định mức ${sanPhamDangChon.MaSP} vào IndexedDB “${DB_DINH_MUC}”.`,
    );
  } catch (e) {
    console.error(e);
    thongBao("Lỗi lưu định mức: " + e.message, true);
  }
}
function xoaDong() {
  if (!sanPhamDangChon || dongDangChon < 0) return;
  const rec = dinhMucHienTai.get(sanPhamDangChon.MaSP);
  if (
    !confirm(
      `Xóa nguyên liệu “${rec.nguyenLieu[dongDangChon].nguyenLieu}” khỏi định mức?`,
    )
  )
    return;
  rec.nguyenLieu.splice(dongDangChon, 1);
  dongDangChon = -1;
  veChiTiet();
  thongBao("Đã xóa trên màn hình. Nhấn “Lưu định mức” để lưu thay đổi.");
}
async function taiLai() {
  try {
    $("trangThaiNguon").textContent = "Đang đọc dữ liệu danh mục và giá mua...";
    const [nguon, dvt, dm, hd] = await Promise.all([
      taiJSON("../Bao-Gia/Nguon.json"),
      taiJSON("../Bao-Gia/DVT.json"),
      taiJSON("./DinhMuc.json"),
      moDatabaseMuaNeuCo(),
    ]);
    danhMucHang = Array.isArray(nguon) ? nguon : [];
    danhSachDVT = Array.isArray(dvt) ? dvt : [];
    dinhMucGoc = Array.isArray(dm) ? dm : [];
    danhSachGiaMua = hd;
    if (!danhMucHang.length || !danhSachDVT.length)
      throw new Error("Nguon.json hoặc DVT.json không có dữ liệu.");
    if (!dbDinhMuc) await moDBDinhMuc();
    dinhMucHienTai = await hopNhatDinhMuc();
    $("trangThaiNguon").textContent =
      `Nguồn: ${danhMucHang.length} mã hàng · ${dinhMucGoc.length} dòng định mức · ${danhSachGiaMua.length} hóa đơn mua`;
    napGoiY();
    veDanhSachSanPham();
    veChiTiet();
    thongBao(
      danhSachGiaMua.length
        ? "Đã tải xong dữ liệu và lịch sử mua hàng."
        : "Đã tải danh mục. Chưa tìm thấy hóa đơn mua trong IndexedDB LuuMuaHang.",
    );
  } catch (e) {
    console.error(e);
    $("trangThaiNguon").textContent =
      "Không tải được dữ liệu. Kiểm tra đường dẫn JSON và IndexedDB.";
    thongBao(e.message, true);
  }
}
$("locNhom").addEventListener("change", veDanhSachSanPham);
$("tuKhoa").addEventListener("input", veDanhSachSanPham);
$("nhanCongNhap").addEventListener("input", function () {
  let giaTri = this.value.replace(/\D/g, "");
  this.value = giaTri.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
});
$("btnTaiLai").addEventListener("click", taiLai);
$("btnThem").addEventListener("click", () => moHopThoai("them"));
$("btnSua").addEventListener("click", () => moHopThoai("sua"));
$("btnXoa").addEventListener("click", xoaDong);
$("btnLuu").addEventListener("click", luuHienTai);
$("btnDong").addEventListener("click", dongHopThoai);
$("btnHuy").addEventListener("click", dongHopThoai);
$("formNguyenLieu").addEventListener("submit", xacNhanNguyenLieu);
$("chonNguyenLieu").addEventListener("input", () => {
  const item = timVatTu($("chonNguyenLieu").value);
  if (item) capNhatDVT(item);
  else capNhatPreview();
});
$("dvtNguyenLieu").addEventListener("change", capNhatPreview);
$("nhanCongNhap").addEventListener("input", () => {
  const ma = sanPhamDangChon?.MaSP;
  if (!ma) return;
  const record = dinhMucHienTai.get(ma) || { nguyenLieu: [] };
  const nhanCong = so($("nhanCongNhap").value);
  const rows = record.nguyenLieu || [];
  let tong = 0;
  let missing = rows.length === 0;
  for (const r of rows) {
    const gia = giaMuaMoiNhat(r.maNL, r.dvt);
    if (gia === null) {
      missing = true;
      break;
    }
    tong += gia * so(r.dinhMuc);
  }
  $("tongGiaThanhCoNhanCong").textContent = missing
    ? "CHƯA ĐỦ DỮ LIỆU"
    : tien(tong + nhanCong);
  $("giaThanhPham").textContent = missing
    ? "CHƯA ĐỦ DỮ LIỆU"
    : tien(tong + nhanCong);
  renderUnitCards(tong, !missing, nhanCong);
});
taiLai();
// ĐIỀU KHIỂN ẨN / HIỆN CHI TIẾT NGUYÊN LIỆU
const btnHienChiTiet = document.getElementById("btnHienChiTiet");
const bangChiTiet = document.querySelector(".table-wrap");
const dsNguyenLieuMobile = document.getElementById("dsNguyenLieuMobile");

let dangHienChiTiet = false;

function capNhatHienThiChiTiet() {
  bangChiTiet.style.display = dangHienChiTiet ? "" : "none";
  dsNguyenLieuMobile.style.display = dangHienChiTiet ? "" : "none";

  btnHienChiTiet.textContent = dangHienChiTiet
    ? "☰ Ẩn chi tiết nguyên liệu"
    : "☰ Hiện chi tiết nguyên liệu";
}

btnHienChiTiet.addEventListener("click", function () {
  dangHienChiTiet = !dangHienChiTiet;
  capNhatHienThiChiTiet();
});

capNhatHienThiChiTiet();
