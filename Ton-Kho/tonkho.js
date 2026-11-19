 "use strict";

/*
  BẢNG TỒN KHO
  - Danh sách chỉ lấy từ các mặt hàng đã phát sinh trong hóa đơn mua.
  - Nguon.json chỉ dùng tra tên sản phẩm.
  - Số lượng tồn được quy đổi về ĐVT đầu tiên của từng MaSP trong DVT.json.
  - Khi mua Cặp/Bộ có hàng đi kèm: tự tách tồn thành sản phẩm chính và sản phẩm đi kèm.
  - Giá mua của Cặp/Bộ được phân bổ theo tỷ lệ khai báo bên dưới.
*/

// TỶ LỆ GIÁ: 1 đơn vị Chéo có giá trị bằng 0.15 đơn vị Khung.
// Áp dụng cho các sản phẩm giàn SP-01 đến SP-18.
const TY_LE_PHAN_BO = {
  "SP-01": { "SP-20": 0.15 },
  "SP-02": { "SP-20": 0.15 },
  "SP-03": { "SP-20": 0.15 },
  "SP-04": { "SP-20": 0.15 },
  "SP-05": { "SP-20": 0.15 },
  "SP-06": { "SP-20": 0.15 },
  "SP-07": { "SP-20": 0.15 },
  "SP-08": { "SP-20": 0.15 },
  "SP-09": { "SP-20": 0.15 },
  "SP-10": { "SP-20": 0.15 },
  "SP-11": { "SP-20": 0.15 },
  "SP-12": { "SP-20": 0.15 },
  "SP-13": { "SP-19": 0.15 },
  "SP-14": { "SP-19": 0.15 },
  "SP-15": { "SP-19": 0.15 },
  "SP-16": { "SP-19": 0.15 },
  "SP-17": { "SP-19": 0.15 },
  "SP-18": { "SP-19": 0.15 }
};

const DB_MUA = "LuuMuaHang";
const STORE_MUA = "HoaDon";
const DB_BAN = "LuuBanHang";
const STORE_BAN = "HoaDonBan";

let danhSachTon = [];
let danhSachDVT = [];
let danhMucNguon = [];
let tuKhoaHienTai = "";

const $ = (id) => document.getElementById(id);
const chuanHoa = (v) =>
  String(v ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi-VN");
const dinhDangSo = (v) =>
  (Number(v) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
const dinhDangTien = (v) =>
  Math.round(Number(v) || 0).toLocaleString("vi-VN") + " đ";

function docSo(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").trim().replace(/\s/g, "");
  if (!s) return 0;
  return Number(s.replace(/\./g, "").replace(/,/g, ".")) || 0;
}

async function taiJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Không tải được " + path + " (HTTP " + res.status + ")");
  }
  return res.json();
}

// Chỉ mở database đã tồn tại; tuyệt đối không tạo database/store mới.
function docStoreNeuDaTonTai(dbName, storeName) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB.databases === "function") {
      indexedDB.databases()
        .then((dbs) => {
          if (!dbs.some((x) => x.name === dbName)) return resolve([]);
          moVaDoc();
        })
        .catch(reject);
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
          get.onsuccess = () => {
            const rows = get.result || [];
            database.close();
            resolve(rows);
          };
          get.onerror = () => {
            const err = get.error;
            database.close();
            reject(err);
          };
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
  return danhSachDVT.find(
    (x) =>
      chuanHoa(x.MaSP) === chuanHoa(maSP) &&
      chuanHoa(x.DonViTinh) === chuanHoa(donViTinh),
  );
}

function dvtGoc(maSP) {
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
  return String(
    tenDuPhong || item?.TenHang || maSP || "Sản phẩm chưa có tên",
  ).trim();
}

function ngayHoaDonMua(hd) {
  return String(hd.ngayLap || hd.ngayLuu || "");
}

function taoHoacLayMatHang(map, maSP, tenDuPhong) {
  const ma = String(maSP || "").trim();
  if (!ma) return null;

  const key = chuanHoa(ma);
  if (!map.has(key)) {
    const goc = dvtGoc(ma);
    map.set(key, {
      maHang: ma,
      tenHang: tenTheoMa(ma, tenDuPhong),
      donViGoc: String(goc?.DonViTinh || ""),
      heSoGoc: Number(goc?.HeSoQuyDoi) > 0 ? Number(goc.HeSoQuyDoi) : 1,
      tongMua: 0,
      tongBan: 0,
      giaMuaGanNhatGoc: 0,
      ngayMuaGanNhat: "",
      giaMuaTrucTiepGoc: 0,
      ngayMuaTrucTiep: "",
      giaPhanBoGoc: 0,
      ngayPhanBo: "",
      tongGiaTriNhap: 0
    });
  }
  return map.get(key);
}

function layThongTinDiKem(maSP, donViTinh) {
  const dvt = timDVT(maSP, donViTinh);
  if (!dvt) return null;

  const maDiKem = String(dvt.MaSPDiKem || "").trim();
  const soLuongDiKem = Number(dvt.SoLuongDiKem) || 0;
  if (!maDiKem || soLuongDiKem <= 0) return null;

  return { maDiKem, soLuongDiKem };
}

function tyLeDiKem(maSP, maDiKem) {
  const rate = Number(TY_LE_PHAN_BO[chuanHoa(maSP).toUpperCase()]?.[chuanHoa(maDiKem).toUpperCase()]);
  return rate > 0 ? rate : 0;
}

function capNhatGiaMuaGanNhat(sp, giaDonViGoc, ngay) {
  if (
    giaDonViGoc > 0 &&
    (!sp.ngayMuaGanNhat || ngay >= sp.ngayMuaGanNhat)
  ) {
    sp.ngayMuaGanNhat = ngay;
    sp.giaMuaGanNhatGoc = giaDonViGoc;
  }
}

async function napTonKho() {
  $("trangThai").textContent = "Đang đọc hóa đơn nhập và bán...";
  const [hoaDonMua, hoaDonBan] = await Promise.all([
    docStoreNeuDaTonTai(DB_MUA, STORE_MUA),
    docStoreNeuDaTonTai(DB_BAN, STORE_BAN),
  ]);

  const map = new Map();

  // NHẬP KHO: tách sản phẩm chính và hàng đi kèm thành hai mã tồn riêng.
  // Giá được ghi nhận thành 2 loại:
  // 1) Giá mua trực tiếp theo đúng ĐVT có trong hóa đơn mua.
  // 2) Giá phân bổ từ Cặp/Bộ, chỉ dùng khi mã thành phần chưa có giá mua trực tiếp.
  hoaDonMua.forEach((hd) => {
    (hd.chiTiet || []).forEach((dong) => {
      const ma = String(dong.maHang || "").trim();
      if (!ma) return;

      const sp = taoHoacLayMatHang(map, ma, dong.tenHang);
      const sl = docSo(dong.soLuong);
      if (sl <= 0) return;

      const factor = heSoDVT(ma, dong.donViTinh, dong.heSoQuyDoi);
      const soLuongChinh = (sl * factor) / sp.heSoGoc;
      const giaDonHang = docSo(dong.donGia);
      const tongTienDong = sl * giaDonHang;
      const ngay = ngayHoaDonMua(hd);
      const diKem = layThongTinDiKem(ma, dong.donViTinh);

      sp.tongMua += soLuongChinh;
      sp.tongGiaTriNhap += tongTienDong;

      if (diKem) {
        // Mua theo Cặp/Bộ: tăng tồn riêng cho sản phẩm đi kèm.
        const spDiKem = taoHoacLayMatHang(map, diKem.maDiKem);
        const soLuongDiKem = (sl * diKem.soLuongDiKem) / spDiKem.heSoGoc;
        spDiKem.tongMua += soLuongDiKem;

        // Chỉ tạo giá phân bổ dự phòng. Giá này sẽ không ghi đè
        // giá mua trực tiếp nếu hóa đơn mua có dòng đúng mã/ĐVT thành phần.
        const rate = tyLeDiKem(ma, diKem.maDiKem);
        if (rate > 0 && tongTienDong > 0) {
          const tongTrongSo = soLuongChinh + soLuongDiKem * rate;
          if (tongTrongSo > 0) {
            const giaMotKhung = tongTienDong / tongTrongSo;
            const giaMotCheo = giaMotKhung * rate;

            if (!sp.ngayPhanBo || ngay >= sp.ngayPhanBo) {
              sp.ngayPhanBo = ngay;
              sp.giaPhanBoGoc = giaMotKhung;
            }
            if (!spDiKem.ngayPhanBo || ngay >= spDiKem.ngayPhanBo) {
              spDiKem.ngayPhanBo = ngay;
              spDiKem.giaPhanBoGoc = giaMotCheo;
            }
          }
        }
      } else {
        // Có dòng mua trực tiếp theo ĐVT của chính mã hàng:
        // ưu tiên giá trên hóa đơn mua, không dùng giá phân bổ từ Cặp/Bộ.
        const giaDonViGoc = giaDonHang / factor;
        if (
          giaDonViGoc > 0 &&
          (!sp.ngayMuaTrucTiep || ngay >= sp.ngayMuaTrucTiep)
        ) {
          sp.ngayMuaTrucTiep = ngay;
          sp.giaMuaTrucTiepGoc = giaDonViGoc;
        }
      }
    });
  });

  // Chọn giá cuối cùng: có giá mua trực tiếp thì dùng giá trực tiếp;
  // chỉ khi không có dữ liệu mua trực tiếp mới dùng giá phân bổ Cặp/Bộ.
  map.forEach((sp) => {
    if (sp.giaMuaTrucTiepGoc > 0) {
      sp.giaMuaGanNhatGoc = sp.giaMuaTrucTiepGoc;
      sp.ngayMuaGanNhat = sp.ngayMuaTrucTiep;
      sp.nguonGia = "Mua trực tiếp";
    } else if (sp.giaPhanBoGoc > 0) {
      sp.giaMuaGanNhatGoc = sp.giaPhanBoGoc;
      sp.ngayMuaGanNhat = sp.ngayPhanBo;
      sp.nguonGia = "Phân bổ từ Cặp/Bộ";
    } else {
      sp.giaMuaGanNhatGoc = 0;
      sp.ngayMuaGanNhat = "";
      sp.nguonGia = "Chưa có giá";
    }
  });

  // XUẤT KHO: bán theo Cặp/Bộ cũng phải trừ riêng sản phẩm chính và hàng đi kèm.
  hoaDonBan.forEach((hd) => {
    (hd.hangHoa || []).forEach((dong) => {
      const ma = String(dong.maHang || "").trim();
      if (!ma) return;

      const sp = map.get(chuanHoa(ma));
      if (!sp) return;

      const sl = docSo(dong.soLuong);
      if (sl <= 0) return;

      const factor = heSoDVT(ma, dong.donViTinh, dong.heSoQuyDoi);
      const qtyMain = (sl * factor) / sp.heSoGoc;
      sp.tongBan += qtyMain;

      const diKem = layThongTinDiKem(ma, dong.donViTinh);
      if (diKem) {
        const spDiKem = map.get(chuanHoa(diKem.maDiKem));
        if (spDiKem) {
          spDiKem.tongBan += (sl * diKem.soLuongDiKem) / spDiKem.heSoGoc;
        }
      }
    });
  });

  danhSachTon = [...map.values()]
    .map((sp) => ({
      ...sp,
      tonKho: sp.tongMua - sp.tongBan,
      giaTriTon: (sp.tongMua - sp.tongBan) * sp.giaMuaGanNhatGoc,
    }))
    .sort((a, b) => a.tenHang.localeCompare(b.tenHang, "vi"));

  render();
  $("trangThai").textContent =
    `Đã đọc ${hoaDonMua.length} phiếu mua · ${hoaDonBan.length} phiếu bán`;
}

function render() {
  const ds = danhSachTon.filter(
    (sp) =>
      !tuKhoaHienTai ||
      chuanHoa(sp.tenHang).includes(chuanHoa(tuKhoaHienTai)) ||
      chuanHoa(sp.maHang).includes(chuanHoa(tuKhoaHienTai)),
  );
  const list = $("danhSachTonKho");
  list.replaceChildren();

  if (!ds.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML =
      '<span class="empty-icon">▤</span><strong>' +
      (danhSachTon.length
        ? "Không tìm thấy sản phẩm phù hợp"
        : "Chưa có mặt hàng nhập kho") +
      "</strong><span>" +
      (danhSachTon.length
        ? "Thử tìm bằng tên hoặc mã sản phẩm khác."
        : "Khi chưa có hóa đơn mua hàng được lưu, danh sách tồn kho sẽ để trống. Danh mục Nguon.json không tự đổ vào bảng.") +
      "</span>";
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
        taoChiTiet(
          "Giá mua gần nhất",
          dinhDangTien(sp.giaMuaGanNhatGoc) + " / " + (sp.donViGoc || "ĐVT"),
        ),
        taoChiTiet("Nguồn giá", sp.nguonGia || "Chưa có giá"),
        taoChiTiet("Giá trị tồn", dinhDangTien(sp.giaTriTon)),
      );
      row.append(main, details);
      list.appendChild(row);
    });
  }

  $("soMatHang").textContent = dinhDangSo(danhSachTon.length);
  $("tongSoLuong").textContent = dinhDangSo(
    danhSachTon.reduce((s, x) => s + x.tonKho, 0),
  );
  $("soKetQua").textContent = `${ds.length} sản phẩm`;
  $("tongTienTon").textContent = dinhDangTien(
    danhSachTon.reduce((s, x) => s + x.giaTriTon, 0),
  );
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
      taiJSON("../Bao-Gia/DVT.json"),
      taiJSON("../Bao-Gia/Nguon.json"),
    ]);
    danhSachDVT = Array.isArray(dvt) ? dvt : [];
    danhMucNguon = Array.isArray(nguon) ? nguon : [];
    await napTonKho();
  } catch (error) {
    console.error(error);
    $("trangThai").textContent = "Không tải được dữ liệu";
    $("danhSachTonKho").innerHTML =
      '<div class="empty-state"><strong>Lỗi tải dữ liệu</strong><span>' +
      error.message +
      "</span></div>";
  }
}

document.addEventListener("DOMContentLoaded", khoiTao);
