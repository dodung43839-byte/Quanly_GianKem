 "use strict";

/*
  BẢNG TỒN KHO
  - Hiển thị mặt hàng phát sinh từ mua hàng, sản xuất hoặc tiêu hao định mức.
  - Nguon.json dùng tra tên và nhóm sản phẩm.
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
const DB_CHAMCONG = "DONGDUONG_CHAMCONG_DB";
const STORE_CHAMKHOAN = "chamKhoan";
const DB_DINH_MUC = "QuanLyDinhMuc";
const STORE_DINH_MUC = "DinhMuc";

let danhSachTon = [];
let danhSachDVT = [];
let danhMucNguon = [];
let danhSachDinhMuc = [];
let canhBaoQuyDoiDinhMuc = [];
let tuKhoaHienTai = "";

// Các bảng tra cứu được dựng một lần, tránh .find() lặp trong 10.000+ dòng.
let mapNguonTheoMa = new Map();
let mapDVTTheoMaVaDonVi = new Map();
let mapDVTGocTheoMa = new Map();

function taoKhoaDVT(maSP, donViTinh) {
  return chuanHoa(maSP) + "\u0000" + chuanHoa(donViTinh);
}

function taoChiMucTraCuu() {
  mapNguonTheoMa = new Map();
  for (const item of danhMucNguon) {
    const key = chuanHoa(item.MaSP);
    if (key && !mapNguonTheoMa.has(key)) mapNguonTheoMa.set(key, item);
  }

  mapDVTTheoMaVaDonVi = new Map();
  mapDVTGocTheoMa = new Map();
  for (const item of danhSachDVT) {
    const maKey = chuanHoa(item.MaSP);
    if (!maKey) continue;
    const dvtKey = taoKhoaDVT(item.MaSP, item.DonViTinh);
    if (!mapDVTTheoMaVaDonVi.has(dvtKey)) mapDVTTheoMaVaDonVi.set(dvtKey, item);
    if (!mapDVTGocTheoMa.has(maKey)) mapDVTGocTheoMa.set(maKey, item);
  }
}

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

// Định mức trong JSON dùng dấu chấm thập phân (ví dụ 0.7, 0.015).
// Không dùng docSo() ở đây vì docSo() phục vụ số tiền kiểu Việt Nam và bỏ dấu chấm.
function docSoDinhMuc(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").trim().replace(/\s/g, "");
  if (!s) return 0;
  const normalized = s.includes(",") && !s.includes(".") ? s.replace(/,/g, ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function laNhomThanhPham(nhom) {
  const s = String(nhom ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  return s === "thanhpham" || s === "spcong";
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
  return mapDVTTheoMaVaDonVi.get(taoKhoaDVT(maSP, donViTinh));
}

function dvtGoc(maSP) {
  return mapDVTGocTheoMa.get(chuanHoa(maSP)) || null;
}

function heSoDVT(maSP, donViTinh, heSoDaLuu) {
  const dvt = timDVT(maSP, donViTinh);
  const factor = Number(dvt?.HeSoQuyDoi);
  if (factor > 0) return factor;
  const saved = Number(heSoDaLuu);
  return saved > 0 ? saved : 1;
}

function tenTheoMa(maSP, tenDuPhong) {
  const item = mapNguonTheoMa.get(chuanHoa(maSP));
  return String(
    tenDuPhong || item?.TenHang || maSP || "Sản phẩm chưa có tên",
  ).trim();
}

function ngayHoaDonMua(hd) {
  return String(hd.ngayLap || hd.ngayLuu || "");
}

// Đọc định mức đã lưu trong IndexedDB nếu có; dữ liệu này được ưu tiên hơn JSON gốc.
async function docDinhMucDaLuu() {
  return docStoreNeuDaTonTai(DB_DINH_MUC, STORE_DINH_MUC);
}

function hopNhatDinhMuc(jsonRows, savedRows) {
  const map = new Map();
  (jsonRows || []).forEach((row) => {
    const ma = String(row["Mã Thành Phẩm"] || "").trim();
    if (!ma) return;
    if (!map.has(chuanHoa(ma))) {
      map.set(chuanHoa(ma), {
        maThanhPham: ma,
        tenThanhPham: String(row["Thành Phẩm"] || ""),
        nguyenLieu: [],
      });
    }
    map.get(chuanHoa(ma)).nguyenLieu.push({
      maNL: String(row["Mã NL"] || "").trim(),
      nguyenLieu: String(row["Nguyên Liệu"] || "").trim(),
      dvt: String(row["ĐVT"] || "").trim(),
      dinhMuc: docSoDinhMuc(row["Đ.Mức"]),
    });
  });
  (savedRows || []).forEach((row) => {
    const ma = String(row.maThanhPham || "").trim();
    if (ma) map.set(chuanHoa(ma), row);
  });
  return map;
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
      tongSanXuat: 0,
      tongTieuHao: 0,
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
  canhBaoQuyDoiDinhMuc = [];
  $("trangThai").textContent = "Đang đọc mua hàng, sản xuất, bán hàng và định mức...";
  const [hoaDonMua, hoaDonBan, phieuChamKhoan, dinhMucLuu] = await Promise.all([
    docStoreNeuDaTonTai(DB_MUA, STORE_MUA),
    docStoreNeuDaTonTai(DB_BAN, STORE_BAN),
    docStoreNeuDaTonTai(DB_CHAMCONG, STORE_CHAMKHOAN),
    docDinhMucDaLuu(),
  ]);

  const dinhMucTheoMa = hopNhatDinhMuc(danhSachDinhMuc, dinhMucLuu);
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

  // SẢN XUẤT: lấy các dòng chấm khoán thuộc nhóm Thành phẩm.
  // Số lượng sản xuất luôn được quy về ĐVT đầu tiên của thành phẩm.
  phieuChamKhoan.forEach((dong) => {
    const ma = String(dong.maSP || "").trim();
    const sl = docSo(dong.soLuong);
    if (!ma || sl <= 0) return;

    // Chỉ tính các mã thuộc nhóm Thành phẩm trong Nguon.json.
    const thongTinSP = mapNguonTheoMa.get(chuanHoa(ma));
    // Chấm khoán lưu số lượng theo sản phẩm đã chọn. Chỉ nhận nhóm thành phẩm
    // giống danh sách mà màn hình Chấm khoán đang cho phép; nếu có định mức thì
    // vẫn dùng định mức của chính mã thành phẩm đó để khấu trừ nguyên liệu.
    const dinhMuc = dinhMucTheoMa.get(chuanHoa(ma));
    if (!laNhomThanhPham(thongTinSP?.Nhom) && !dinhMuc) return;

    const sp = taoHoacLayMatHang(map, ma, dong.sanPham);
    const soLuongSanXuat = sl; // chỉ dùng ĐVT đầu tiên, không quy đổi đơn vị
    sp.tongSanXuat = (sp.tongSanXuat || 0) + soLuongSanXuat;

    // Khấu hao = số lượng thành phẩm chấm khoán × định mức nguyên liệu.
    // Định mức và tồn nguyên liệu đều tính theo ĐVT đầu tiên; không quy đổi DVT.
    (dinhMuc?.nguyenLieu || []).forEach((nl) => {
      const maNL = String(nl.maNL || "").trim();
      const muc = docSoDinhMuc(nl.dinhMuc);
      if (!maNL || muc <= 0) return;

      const spNL = taoHoacLayMatHang(map, maNL, nl.nguyenLieu);
      spNL.tongTieuHao = (spNL.tongTieuHao || 0) + soLuongSanXuat * muc;
    });
  });

  // XUẤT KHO: trừ mọi mặt hàng được bán, gồm cả thành phẩm và nguyên liệu.
  // Không phụ thuộc mặt hàng đã từng xuất hiện trong phiếu mua/chấm khoán hay chưa.
  // Bán theo Cặp/Bộ cũng trừ riêng sản phẩm chính và hàng đi kèm.
  hoaDonBan.forEach((hd) => {
    (hd.hangHoa || []).forEach((dong) => {
      const ma = String(dong.maHang || "").trim();
      const sl = docSo(dong.soLuong);
      if (!ma || sl <= 0) return;

      const sp = taoHoacLayMatHang(map, ma, dong.tenHang);
      const factor = heSoDVT(ma, dong.donViTinh, dong.heSoQuyDoi);
      const qtyMain = (sl * factor) / sp.heSoGoc;
      sp.tongBan += qtyMain;

      const diKem = layThongTinDiKem(ma, dong.donViTinh);
      if (diKem) {
        const spDiKem = taoHoacLayMatHang(map, diKem.maDiKem);
        spDiKem.tongBan += (sl * diKem.soLuongDiKem) / spDiKem.heSoGoc;
      }
    });
  });

  danhSachTon = [...map.values()]
    .map((sp) => ({
      ...sp,
      // Thành phẩm được cộng từ Chấm khoán; nguyên liệu được trừ theo định mức.
      // Mọi mặt hàng bán ra (thành phẩm hoặc nguyên liệu) đều được trừ tại tongBan.
      tonKho: sp.tongMua + (sp.tongSanXuat || 0) - sp.tongTieuHao - sp.tongBan,
      giaTriTon:
        (sp.tongMua + (sp.tongSanXuat || 0) - sp.tongTieuHao - sp.tongBan) *
        sp.giaMuaGanNhatGoc,
    }))
    .sort((a, b) => a.tenHang.localeCompare(b.tenHang, "vi"));

  render();
  $("trangThai").textContent =
    `Đã đọc ${hoaDonMua.length} phiếu mua · ${phieuChamKhoan.length} dòng chấm khoán · ${hoaDonBan.length} phiếu bán` +
    (canhBaoQuyDoiDinhMuc.length
      ? ` · Cần kiểm tra ĐVT định mức: ${canhBaoQuyDoiDinhMuc.join("; ")}`
      : "");
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
        : "Chưa có phát sinh mua hàng, sản xuất hoặc bán hàng để tính tồn kho.") +
      "</span>";
    list.appendChild(empty);
  } else {
    const fragment = document.createDocumentFragment();
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
        taoChiTiet("Mua hàng", dinhDangSo(sp.tongMua) + " " + sp.donViGoc),
        taoChiTiet("Sản xuất", dinhDangSo(sp.tongSanXuat || 0) + " " + sp.donViGoc),
        taoChiTiet("Bán hàng", dinhDangSo(sp.tongBan) + " " + sp.donViGoc),
        taoChiTiet("Tiêu hao định mức", dinhDangSo(sp.tongTieuHao || 0) + " " + sp.donViGoc),
        taoChiTiet(
          "Giá mua gần nhất",
          dinhDangTien(sp.giaMuaGanNhatGoc) + " / " + (sp.donViGoc || "ĐVT"),
        ),
        taoChiTiet("Nguồn giá", sp.nguonGia || "Chưa có giá"),
        taoChiTiet("Giá trị tồn", dinhDangTien(sp.giaTriTon)),
      );
      row.append(main, details);
      fragment.appendChild(row);
    });
    list.appendChild(fragment);
  }

  let tongSoLuong = 0;
  let tongGiaTri = 0;
  for (const item of danhSachTon) {
    tongSoLuong += item.tonKho;
    tongGiaTri += item.giaTriTon;
  }
  $("soMatHang").textContent = dinhDangSo(danhSachTon.length);
  $("tongSoLuong").textContent = dinhDangSo(tongSoLuong);
  $("soKetQua").textContent = `${ds.length} sản phẩm`;
  $("tongTienTon").textContent = dinhDangTien(tongGiaTri);
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
    const [dvt, nguon, dinhMuc] = await Promise.all([
      taiJSON("../Bao-Gia/DVT.json"),
      taiJSON("../Bao-Gia/Nguon.json"),
      taiJSON("./DinhMuc.json").catch(() => []),
    ]);
    danhSachDVT = Array.isArray(dvt) ? dvt : [];
    danhMucNguon = Array.isArray(nguon) ? nguon : [];
    danhSachDinhMuc = Array.isArray(dinhMuc) ? dinhMuc : [];
    taoChiMucTraCuu();
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
