const $ = (id) => document.getElementById(id);

const DB_NAME = "LuuBanHang";
const DB_VERSION = 1;
const STORE_HOADON = "HoaDonBan";
const STORE_THUTIEN = "ThuTien";
const DB_MUAHANG = "LuuMuaHang";
const STORE_MUA_HOADON = "HoaDon";

let db;
let danhSachHangMua = [];
let hangMuaTheoTen = new Map();
let hangMuaTheoMa = new Map();

// ĐỊNH DẠNG TIỀN
function dinhDangTien(value) {
  return (Number(value) || 0).toLocaleString("vi-VN") + " đ";
}

// ĐỌC VÀ ĐỊNH DẠNG RIÊNG Ô GIÁ BÁN
function docGiaBan(value) {
  return (
    Number(
      String(value ?? "")
        .replace(/\./g, "")
        .replace(/[^\d-]/g, ""),
    ) || 0
  );
}

function dinhDangGiaBan(value) {
  const so = String(value ?? "").replace(/[^\d]/g, "");
  return so ? Number(so).toLocaleString("vi-VN") : "";
}

// LẤY SỐ HÓA ĐƠN TIẾP THEO TỪ CÁC HÓA ĐƠN ĐÃ LƯU
async function laySoHoaDonTiepTheo() {
  const danhSach = await docTatCa(STORE_HOADON);
  let soLonNhat = 0;
  danhSach.forEach((hd) => {
    const match = String(hd.maHoaDon || "").match(/^BH-(\d+)$/i);
    if (match) soLonNhat = Math.max(soLonNhat, Number(match[1]));
  });
  return "BH-" + String(soLonNhat + 1).padStart(4, "0");
}

// NGÀY HIỆN TẠI
function ngayHomNay() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

// TẠO DATABASE INDEXEDDB
function moDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_HOADON)) {
        const store = database.createObjectStore(STORE_HOADON, {
          keyPath: "maHoaDon",
        });

        store.createIndex("ngayBan", "ngayBan", {
          unique: false,
        });
      }

      if (!database.objectStoreNames.contains(STORE_THUTIEN)) {
        const store = database.createObjectStore(STORE_THUTIEN, {
          keyPath: "id",
        });

        store.createIndex("maHoaDon", "maHoaDon", {
          unique: false,
        });

        store.createIndex("ngayThu", "ngayThu", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ĐỌC DỮ LIỆU
function docTatCa(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ĐỌC DATABASE MUA HÀNG (KHÔNG TẠO DATABASE MỚI NẾU CHƯA CÓ)
function docHoaDonMuaHang() {
  return new Promise((resolve, reject) => {
    if (indexedDB.databases) {
      indexedDB
        .databases()
        .then((ds) => {
          if (!ds.some((x) => x.name === DB_MUAHANG)) {
            resolve([]);
            return;
          }
          moVaDoc();
        })
        .catch(reject);
    } else {
      moVaDoc();
    }

    function moVaDoc() {
      let vuaTaoDatabase = false;
      const req = indexedDB.open(DB_MUAHANG);
      req.onupgradeneeded = () => {
        vuaTaoDatabase = true;
        req.transaction.abort();
      };
      req.onsuccess = () => {
        const muaDb = req.result;
        if (
          vuaTaoDatabase ||
          !muaDb.objectStoreNames.contains(STORE_MUA_HOADON)
        ) {
          muaDb.close();
          resolve([]);
          return;
        }
        try {
          const tx = muaDb.transaction(STORE_MUA_HOADON, "readonly");
          const get = tx.objectStore(STORE_MUA_HOADON).getAll();
          get.onsuccess = () => {
            const rows = get.result || [];
            muaDb.close();
            resolve(rows);
          };
          get.onerror = () => {
            muaDb.close();
            reject(get.error);
          };
        } catch (e) {
          muaDb.close();
          reject(e);
        }
      };
      req.onerror = () => {
        // Database mua hàng chưa được tạo hoặc chưa thể truy cập.
        resolve([]);
      };
    }
  });
}

function chuanHoaTenHang(ten) {
  return String(ten || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi-VN");
}
function boDau(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN");
}
function ngayMuaDeSoSanh(hoaDon) {
  return String(hoaDon.ngayLap || hoaDon.ngayLuu || "");
}

// TỶ LỆ PHÂN BỔ GIÁ KHI MUA THEO CẶP/BỘ, ĐỒNG BỘ VỚI tonkho.js
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

let danhSachDVT = [];
let danhMucNguon = [];
let danhSachTonDayDu = [];

function chuanHoaMa(ma) {
  return String(ma || "").trim().toUpperCase();
}

function docSoTon(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").trim().replace(/\s/g, "");
  if (!s) return 0;
  return Number(s.replace(/\./g, "").replace(/,/g, ".")) || 0;
}

function timDVTTheoMa(maHang, donViTinh) {
  return danhSachDVT.find(
    (x) =>
      chuanHoaMa(x.MaSP) === chuanHoaMa(maHang) &&
      chuanHoaTenHang(x.DonViTinh) === chuanHoaTenHang(donViTinh),
  );
}

function layDVTGoc(maHang) {
  return danhSachDVT.find((x) => chuanHoaMa(x.MaSP) === chuanHoaMa(maHang)) || null;
}

function layHeSoDVT(maHang, donViTinh, heSoDaLuu) {
  const dongDVT = timDVTTheoMa(maHang, donViTinh);
  const heSoLuu = Number(heSoDaLuu);
  if (heSoLuu > 0) return heSoLuu;
  const heSo = Number(dongDVT?.HeSoQuyDoi);
  return heSo > 0 ? heSo : 1;
}

function layTenHangTuNguon(maHang) {
  const item = danhMucNguon.find(
    (x) => chuanHoaMa(x.MaSP) === chuanHoaMa(maHang),
  );
  return String(item?.TenHang || "").trim();
}

function layDiKem(maHang, donViTinh) {
  const dvt = timDVTTheoMa(maHang, donViTinh);
  const maDiKem = String(dvt?.MaSPDiKem || "").trim();
  const soLuongDiKem = Number(dvt?.SoLuongDiKem) || 0;
  return maDiKem && soLuongDiKem > 0
    ? { maDiKem, soLuongDiKem }
    : null;
}

function layTyLePhanBo(maHang, maDiKem) {
  return Number(
    TY_LE_PHAN_BO[chuanHoaMa(maHang)]?.[chuanHoaMa(maDiKem)],
  ) || 0;
}

function taoThongTinTon(map, maHang) {
  const ma = String(maHang || "").trim();
  if (!ma) return null;
  const key = chuanHoaMa(ma);
  if (!map.has(key)) {
    const dvtGoc = layDVTGoc(ma);
    map.set(key, {
      maHang: ma,
      tenHang: layTenHangTuNguon(ma),
      donViGoc: String(dvtGoc?.DonViTinh || ""),
      heSoGoc: Number(dvtGoc?.HeSoQuyDoi) > 0 ? Number(dvtGoc.HeSoQuyDoi) : 1,
      tongMua: 0,
      tongBan: 0,
      giaMuaTrucTiep: 0,
      ngayMuaTrucTiep: "",
      giaPhanBo: 0,
      ngayPhanBo: "",
      giaVonGoc: 0,
      tonKho: 0,
    });
  }
  return map.get(key);
}

function capNhatGiaTheoNgay(sp, tenTruongGia, tenTruongNgay, gia, ngay) {
  if (gia > 0 && (!sp[tenTruongNgay] || ngay >= sp[tenTruongNgay])) {
    sp[tenTruongGia] = gia;
    sp[tenTruongNgay] = ngay;
  }
}

function ngayMuaDeSoSanh(hoaDon) {
  return String(hoaDon.ngayLap || hoaDon.ngayLuu || "");
}

// Tính tồn theo cùng nguyên tắc với bảng Tồn Kho.
// Tên hàng lấy từ Nguon.json, ĐVT lấy từ DVT.json.
// Giá vốn Cặp/Bộ = giá Khung theo hệ số + giá Chéo theo số lượng đi kèm.
async function napDanhSachHangTon() {
  const [hoaDonMua, hoaDonBan, dvt, nguon] = await Promise.all([
    docHoaDonMuaHang(),
    docTatCa(STORE_HOADON),
    fetch("../Bao-Gia/DVT.json", { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error("Không tải được DVT.json");
      return r.json();
    }),
    fetch("../Bao-Gia/Nguon.json", { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error("Không tải được Nguon.json");
      return r.json();
    }),
  ]);

  danhSachDVT = Array.isArray(dvt) ? dvt : [];
  danhMucNguon = Array.isArray(nguon) ? nguon : [];

  const mapTon = new Map();

  // Nhập hàng: tính số lượng tồn và giá vốn của từng mã thành phần.
  hoaDonMua.forEach((hd) => {
    const ngay = ngayMuaDeSoSanh(hd);
    (hd.chiTiet || []).forEach((dong) => {
      const ma = String(dong.maHang || "").trim();
      const sl = docSoTon(dong.soLuong);
      if (!ma || sl <= 0) return;

      const sp = taoThongTinTon(mapTon, ma);
      const heSo = layHeSoDVT(ma, dong.donViTinh, dong.heSoQuyDoi);
      const soLuongChinh = (sl * heSo) / sp.heSoGoc;
      const tongTienDong = sl * docSoTon(dong.donGia);
      sp.tongMua += soLuongChinh;

      const diKem = layDiKem(ma, dong.donViTinh);
      if (diKem) {
        const spDiKem = taoThongTinTon(mapTon, diKem.maDiKem);
        const soLuongDiKem = (sl * diKem.soLuongDiKem) / spDiKem.heSoGoc;
        spDiKem.tongMua += soLuongDiKem;

        const tyLe = layTyLePhanBo(ma, diKem.maDiKem);
        if (tyLe > 0 && tongTienDong > 0) {
          const tongTrongSo = soLuongChinh + soLuongDiKem * tyLe;
          if (tongTrongSo > 0) {
            const giaKhung = tongTienDong / tongTrongSo;
            const giaCheo = giaKhung * tyLe;
            capNhatGiaTheoNgay(sp, "giaPhanBo", "ngayPhanBo", giaKhung, ngay);
            capNhatGiaTheoNgay(spDiKem, "giaPhanBo", "ngayPhanBo", giaCheo, ngay);
          }
        }
      } else {
        // Dòng mua trực tiếp của mã hàng: giá theo đúng ĐVT mua, quy về ĐVT gốc.
        const giaGoc = docSoTon(dong.donGia) / heSo;
        capNhatGiaTheoNgay(sp, "giaMuaTrucTiep", "ngayMuaTrucTiep", giaGoc, ngay);
      }
    });
  });

  // Bán theo Cặp/Bộ: trừ cả hàng chính và hàng đi kèm.
  hoaDonBan.forEach((hd) => {
    (hd.hangHoa || []).forEach((dong) => {
      const ma = String(dong.maHang || "").trim();
      const sl = docSoTon(dong.soLuong);
      if (!ma || sl <= 0) return;

      const sp = mapTon.get(chuanHoaMa(ma));
      if (!sp) return;

      const heSo = layHeSoDVT(ma, dong.donViTinh, dong.heSoQuyDoi);
      sp.tongBan += (sl * heSo) / sp.heSoGoc;

      const diKem = layDiKem(ma, dong.donViTinh);
      if (diKem) {
        const spDiKem = mapTon.get(chuanHoaMa(diKem.maDiKem));
        if (spDiKem) {
          spDiKem.tongBan +=
            (sl * diKem.soLuongDiKem) / spDiKem.heSoGoc;
        }
      }
    });
  });

  // Chọn giá mua trực tiếp nếu có; nếu chưa có mới dùng giá phân bổ từ Cặp/Bộ.
  mapTon.forEach((sp) => {
    sp.giaVonGoc =
      sp.giaMuaTrucTiep > 0 ? sp.giaMuaTrucTiep : sp.giaPhanBo;
    sp.tonKho = sp.tongMua - sp.tongBan;
  });

  danhSachTonDayDu = [...mapTon.values()];

  // Lưu giá bán gần nhất theo TÊN HÀNG + ĐVT, kể cả khi tồn kho hiện tại <= 0.
  const giaBanGanNhat = new Map();
  hoaDonBan.forEach((hd) => {
    const ngay = String(hd.capNhatLuc || hd.ngayBan || "");
    (hd.hangHoa || []).forEach((dong) => {
      const ten = chuanHoaTenHang(dong.tenHang);
      const dvtKey = chuanHoaTenHang(dong.donViTinh);
      if (!ten || !dvtKey) return;
      const key = ten + "|" + dvtKey;
      const cu = giaBanGanNhat.get(key);
      if (!cu || ngay >= cu.ngay) {
        giaBanGanNhat.set(key, {
          giaBan: Number(dong.giaBan) || 0,
          ngay,
        });
      }
    });
  });

  // Danh mục bán chỉ hiển thị mã hàng còn tồn DƯƠNG.
  // Nhưng giá bán cũ vẫn được giữ trong giaBanGanNhat để dùng lại khi hàng có tồn trở lại.
  danhSachHangMua = danhSachTonDayDu
    .filter((sp) => sp.tonKho > 0 && sp.tenHang)
    .map((sp) => {
      const cacDVT = danhSachDVT.filter(
        (x) => chuanHoaMa(x.MaSP) === chuanHoaMa(sp.maHang),
      );
      const donViTinhs = cacDVT.map((dvtRow) => {
        const heSo = Number(dvtRow.HeSoQuyDoi) > 0 ? Number(dvtRow.HeSoQuyDoi) : 1;
        const giaChinh = sp.giaVonGoc * (heSo / sp.heSoGoc);
        const maDiKem = String(dvtRow.MaSPDiKem || "").trim();
        const slDiKem = Number(dvtRow.SoLuongDiKem) || 0;
        const spDiKem = maDiKem
          ? mapTon.get(chuanHoaMa(maDiKem))
          : null;
        const giaDiKem =
          spDiKem && slDiKem > 0
            ? spDiKem.giaVonGoc * (slDiKem / spDiKem.heSoGoc)
            : 0;
        const giaVon = giaChinh + giaDiKem;
        const key =
          chuanHoaTenHang(sp.tenHang) +
          "|" +
          chuanHoaTenHang(dvtRow.DonViTinh);
        const giaBanCu = giaBanGanNhat.get(key);

        return {
          maHang: sp.maHang,
          donViTinh: String(dvtRow.DonViTinh || ""),
          giaVon,
          giaBan: giaBanCu ? giaBanCu.giaBan : 0,
          heSoQuyDoi: heSo,
        };
      });

      return {
        tenHang: sp.tenHang,
        maHang: sp.maHang,
        donViTinhs,
      };
    })
    .filter((sp) => sp.donViTinhs.length > 0)
    .sort((a, b) => a.tenHang.localeCompare(b.tenHang, "vi"));

  // Giá bán cũ của sản phẩm đang hết tồn vẫn còn được giữ trong Map trên,
  // không xóa hoặc ghi đè dữ liệu hóa đơn cũ.
  const list = $("danhMucHangHoa");
  if (list) hienThiDanhMucHang(danhSachHangMua);
}

//.....................................................

function hienThiDanhMucHang(ds) {
  const list = $("danhMucHangHoa");
  if (!list) return;
  list.innerHTML = "";
  if (!ds.length) {
    list.innerHTML =
      '<div class="product-list-empty">Không tìm thấy hàng hóa</div>';
    return;
  }
  ds.forEach((sp) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "product-list-item";
    row.textContent = sp.tenHang; // Chỉ hiển thị TÊN HÀNG, không hiện mã/ĐVT/giá.
    row.addEventListener("click", () => themHangTuDanhMuc(sp));
    list.appendChild(row);
  });
}

function locDanhMucHang() {
  const tuKhoa = boDau($("timTenHang").value.trim());
  const ketQua = !tuKhoa
    ? danhSachHangMua
    : danhSachHangMua.filter((sp) => boDau(sp.tenHang).includes(tuKhoa));
  hienThiDanhMucHang(ketQua);
}

function themHangTuDanhMuc(sp) {
  const item = sp.donViTinhs[0] || { donViTinh: "", giaVon: 0 };
  // KIỂM TRA HÀNG TRÙNG TÊN VÀ ĐƠN VỊ TÍNH
  const dongTrung = [...document.querySelectorAll("#dsHang tr")].find(
    (tr) =>
      chuanHoaTenHang(tr.querySelector(".product-name").value) ===
        chuanHoaTenHang(sp.tenHang) &&
      tr.querySelector(".unit").value.trim().toLowerCase() ===
        item.donViTinh.trim().toLowerCase(),
  );

  if (dongTrung) {
    const oSoLuong = dongTrung.querySelector(".qty");
    oSoLuong.value = (Number(oSoLuong.value) || 0) + 1;
    tinhTong();
    return;
  }
  taoDongHang({
    maHang: item.maHang || sp.maHang || "",
    tenHang: sp.tenHang,
    donViTinh: item.donViTinh,
    heSoQuyDoi: item.heSoQuyDoi || 1,
    cacDVT: sp.donViTinhs,
    giaVon: item.giaVon,
    soLuong: 1,
    giaBan: item.giaBan || 0,
  });
}

function capNhatGiaTheoDVT(tr) {
  const ten = chuanHoaTenHang(tr.querySelector(".product-name").value);
  const sp = danhSachHangMua.find((x) => chuanHoaTenHang(x.tenHang) === ten);
  if (!sp) return;
  const dvt = tr.querySelector(".unit").value;
  const item = sp.donViTinhs.find(
    (x) =>
      x.donViTinh.toLocaleLowerCase("vi-VN") === dvt.toLocaleLowerCase("vi-VN"),
  );
  if (item) {
    tr.querySelector(".cost").value = Math.round(item.giaVon);
    tr.querySelector(".product-name").dataset.maHang =
      item.maHang || sp.maHang || "";
    tr.querySelector(".product-name").dataset.heSoQuyDoi =
      String(item.heSoQuyDoi || 1);
    tinhTong();
  }
}

// TẠO MÃ LẦN THU
function taoMaThu() {
  return "TT-" + Date.now() + "-" + Math.random().toString(16).slice(2, 8);
}

// LẤY DANH SÁCH HÀNG HÓA
function layDongHang() {
  return [...document.querySelectorAll("#dsHang tr")]
    .map((tr) => ({
      maHang: tr.querySelector(".product-name").dataset.maHang || "",
      tenHang: tr.querySelector(".product-name").value.trim(),
      donViTinh: tr.querySelector(".unit").value.trim(),
      heSoQuyDoi: Number(tr.querySelector(".product-name").dataset.heSoQuyDoi) || 1,
      soLuong: Number(tr.querySelector(".qty").value) || 0,
      giaVon: Number(tr.querySelector(".cost").value) || 0,
      giaBan: docGiaBan(tr.querySelector(".price").value),
    }))
    .filter((x) => x.tenHang || x.soLuong || x.giaBan || x.giaVon);
}

// LẤY LỊCH SỬ THU TIỀN
function layLichSuThu() {
  return [...document.querySelectorAll("#dsThuTien tr[data-id]")].map((tr) => ({
    id: tr.dataset.id,
    maHoaDon: tr.dataset.mahoadon || $("soHoaDon").value.trim(),
    ngayThu: tr.dataset.date,
    soTien: Number(tr.dataset.amount),
    phuongThuc: tr.dataset.method,
    noiDung: tr.dataset.note || "",
  }));
}

// TÍNH TỔNG TIỀN, THUẾ GTGT VÀ LỢI NHUẬN
function tinhTong() {
  let tongTien = 0;
  let tongVon = 0;

  document.querySelectorAll("#dsHang tr").forEach((tr) => {
    const sl = Number(tr.querySelector(".qty").value) || 0;
    const von = Number(tr.querySelector(".cost").value) || 0;
    const ban = docGiaBan(tr.querySelector(".price").value);

    const thanhTien = sl * ban;

    tongTien += thanhTien;
    tongVon += sl * von;

    tr.querySelector(".amount").textContent = dinhDangTien(thanhTien);

    tr.querySelector(".profit").textContent = dinhDangTien(
      thanhTien - sl * von,
    );
  });

  // TÍNH THUẾ GTGT CHUNG
  const mucThue = Number($("thueGTGT").value) || 0;
  const tienThue = Math.round((tongTien * mucThue) / 100);

  // TỔNG THANH TOÁN BAO GỒM THUẾ
  const tongThanhToan = tongTien + tienThue;

  const daThu = layLichSuThu().reduce((s, x) => s + x.soTien, 0);

  $("tongTien").textContent = dinhDangTien(tongTien);

  $("tienThue").textContent = dinhDangTien(tienThue);
  $("tongVon").textContent = dinhDangTien(tongVon);
  $("tongLoiNhuan").textContent = dinhDangTien(tongTien - tongVon);

  $("hienDaThanhToan").textContent = dinhDangTien(daThu);
  $("conPhaiThu").textContent = dinhDangTien(tongThanhToan - daThu);

  $("soLanThu").textContent = layLichSuThu().length + " lần thu";
}

// CẬP NHẬT SỐ THỨ TỰ HÀNG
function capNhatSTTHang() {
  document.querySelectorAll("#dsHang tr").forEach((tr, i) => {
    tr.querySelector(".stt").textContent = i + 1;
  });
}

// THÊM DÒNG HÀNG VÀO CHI TIẾT HÓA ĐƠN
function taoDongHang(item = {}) {
  const tr = document.createElement("tr");
  const cacDVT = Array.isArray(item.cacDVT) ? item.cacDVT : [];
  const unitOptions = cacDVT.length
    ? cacDVT
        .map(
          (x) =>
            `<option value="${String(x.donViTinh).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">${String(x.donViTinh).replace(/</g, "&lt;")}</option>`,
        )
        .join("")
    : `<option value="${item.donViTinh || ""}">${item.donViTinh || "Chọn ĐVT"}</option>`;

  tr.innerHTML = `
    <td class="stt"></td>
    <td><input class="product-name" type="text" readonly></td>
    <td><select class="unit">${unitOptions}</select></td>
    <td><input class="qty" type="number" min="0" step="any" value="1"></td>
    <td><input class="cost" type="number" min="0" step="1" value="0"></td>
    <td><input class="price" type="text" inputmode="numeric" value="0"></td>
    <td class="amount">0 đ</td>
    <td class="profit">0 đ</td>
    <td><button type="button" class="btn btn-remove">Xóa</button></td>
  `;
  $("dsHang").appendChild(tr);

  const tenInput = tr.querySelector(".product-name");
  tenInput.value = item.tenHang || "";
  tenInput.dataset.maHang = item.maHang || "";
  tenInput.dataset.heSoQuyDoi = String(item.heSoQuyDoi || 1);
  const unitSelect = tr.querySelector(".unit");
  if (item.donViTinh) unitSelect.value = item.donViTinh;
  tr.querySelector(".qty").value = item.soLuong ?? 1;
  tr.querySelector(".cost").value = Math.round(Number(item.giaVon) || 0);
  tr.querySelector(".price").value = dinhDangGiaBan(item.giaBan);
  //..........................................................................
  unitSelect.addEventListener("change", () => {
    const ten = chuanHoaTenHang(tenInput.value);

    const sp = danhSachHangMua.find((x) => chuanHoaTenHang(x.tenHang) === ten);

    const dvtItem = sp?.donViTinhs.find(
      (x) =>
        x.donViTinh.toLocaleLowerCase("vi-VN") ===
        unitSelect.value.toLocaleLowerCase("vi-VN"),
    );

    if (dvtItem) {
      tr.querySelector(".cost").value = Math.round(dvtItem.giaVon || 0);
      tr.querySelector(".price").value = dinhDangGiaBan(dvtItem.giaBan || 0);
      tenInput.dataset.maHang = dvtItem.maHang || sp.maHang || "";
      tenInput.dataset.heSoQuyDoi = String(dvtItem.heSoQuyDoi || 1);
    }

    tinhTong();
  });

  tr.querySelectorAll("input").forEach((el) => {
    el.addEventListener("input", () => {
      if (el.classList.contains("price")) {
        const giaTriCu = el.value;
        el.value = dinhDangGiaBan(giaTriCu);

        if (document.activeElement === el) {
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }

      tinhTong();
    });
  });

  tr.querySelector(".btn-remove").addEventListener("click", () => {
    tr.remove();
    capNhatSTTHang();
    tinhTong();
  });

  capNhatSTTHang();
  tinhTong();
}
//..................................................................
// HIỂN THỊ MỘT LẦN THU TIỀN
function hienThiLanThu(item) {
  const tbody = $("dsThuTien");

  tbody.querySelector(".empty-payment")?.remove();

  const tr = document.createElement("tr");
  // sua
  tr.dataset.id = item.id || taoMaThu();
  tr.dataset.mahoadon = item.maHoaDon || $("soHoaDon").value.trim();
  tr.dataset.date = item.ngayThu;
  tr.dataset.amount = String(item.soTien);
  tr.dataset.method = item.phuongThuc;
  tr.dataset.note = item.noiDung || "";
  // xong
  const values = [
    tbody.querySelectorAll("tr[data-id]").length + 1,
    item.ngayThu,
    dinhDangTien(item.soTien),
    item.phuongThuc,
    item.noiDung || "—",
  ];

  values.forEach((value) => {
    const td = document.createElement("td");
    td.textContent = value;
    tr.appendChild(td);
  });

  const tdXoa = document.createElement("td");
  const btn = document.createElement("button");

  btn.type = "button";
  btn.className = "btn btn-remove";
  btn.textContent = "Xóa";
  btn.addEventListener("click", async () => {
    if (!confirm("Bạn có chắc muốn xóa khoản thu này không?")) {
      return;
    }

    // Nếu khoản thu đã lưu thì xóa trong IndexedDB
    if (tr.dataset.saved === "true") {
      try {
        const tx = db.transaction([STORE_THUTIEN, STORE_HOADON], "readwrite");

        tx.objectStore(STORE_THUTIEN).delete(tr.dataset.id);

        const maHoaDon = tr.dataset.mahoadon || $("soHoaDon").value.trim();

        const hoaDonStore = tx.objectStore(STORE_HOADON);
        const request = hoaDonStore.get(maHoaDon);

        request.onsuccess = () => {
          const invoice = request.result;

          if (invoice) {
            invoice.tongDaThu = Math.max(
              0,
              (Number(invoice.tongDaThu) || 0) - Number(tr.dataset.amount),
            );

            invoice.conPhaiThu =
              (Number(invoice.tongThanhToan) || 0) - invoice.tongDaThu;

            invoice.capNhatLuc = new Date().toISOString();

            hoaDonStore.put(invoice);
          }
        };

        await new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      } catch (error) {
        console.error(error);
        alert("Không xóa được khoản thu: " + error.message);
        return;
      }
    }

    tr.remove();
    capNhatSTTLanThu();
    tinhTong();
    hienDongTrongNeuCan();

    $("trangThaiLuu").textContent = "Đã cập nhật lịch sử thanh toán";
  });

  tdXoa.appendChild(btn);
  tr.appendChild(tdXoa);
  tbody.appendChild(tr);

  if (item.saved) {
    tr.dataset.saved = "true";
  }

  tinhTong();
}

// CẬP NHẬT STT LẦN THU
function capNhatSTTLanThu() {
  document.querySelectorAll("#dsThuTien tr[data-id]").forEach((tr, i) => {
    tr.cells[0].textContent = i + 1;
  });
}

// HIỂN THỊ DÒNG TRỐNG
function hienDongTrongNeuCan() {
  if (!$("dsThuTien").querySelector("tr[data-id]")) {
    $("dsThuTien").innerHTML = `
      <tr class="empty-payment">
        <td colspan="6">Chưa ghi nhận khoản thu nào</td>
      </tr>
    `;
  }
}

// THÊM LẦN THU TIỀN
function themLanThuTien() {
  const amount = docGiaBan($("soTienThu").value);

  if (amount <= 0) {
    alert("Bạn hãy nhập số tiền thu lớn hơn 0.");
    $("soTienThu").focus();
    return;
  }

  // TÍNH TỔNG TIỀN HÀNG
  const tongTienHang = layDongHang().reduce(
    (s, x) => s + x.soLuong * x.giaBan,
    0,
  );

  // TÍNH THUẾ GTGT
  const mucThue = Number($("thueGTGT").value) || 0;
  const tienThue = Math.round((tongTienHang * mucThue) / 100);

  // TỔNG TIỀN BAO GỒM THUẾ
  const tong = tongTienHang + tienThue;

  const daThu = layLichSuThu().reduce((s, x) => s + x.soTien, 0);

  if (amount + daThu > tong && tong > 0) {
    if (
      !confirm("Số tiền thu vượt quá tổng tiền phiếu. Bạn vẫn muốn ghi nhận?")
    )
      return;
  }

  hienThiLanThu({
    id: taoMaThu(),
    ngayThu: $("ngayThu").value || ngayHomNay(),
    soTien: amount,
    phuongThuc: $("phuongThuc").value,
    noiDung: $("ghiChuThanhToan").value.trim(),
    saved: false,
  });

  $("soTienThu").value = "";
  $("ghiChuThanhToan").value = "";

  capNhatSTTLanThu();
  tinhTong();
}

// LƯU HÓA ĐƠN VÀ LỊCH SỬ THU TIỀN
async function luuPhieu() {
  const maHoaDon = $("soHoaDon").value.trim();

  if (!maHoaDon) {
    alert("Vui lòng nhập số hóa đơn.");
    $("soHoaDon").focus();
    return;
  }

  const hangHoa = layDongHang();

  if (!hangHoa.length || !hangHoa.some((x) => x.tenHang)) {
    alert("Vui lòng nhập ít nhất một tên sản phẩm.");
    return;
  }

  const lichSuThu = layLichSuThu();

  const tongTien = hangHoa.reduce((s, x) => s + x.soLuong * x.giaBan, 0);

  const tongVon = hangHoa.reduce((s, x) => s + x.soLuong * x.giaVon, 0);

  const tongDaThu = lichSuThu.reduce((s, x) => s + x.soTien, 0);
  // TÍNH THUẾ GTGT
  const mucThue = Number($("thueGTGT").value) || 0;
  const tienThue = Math.round((tongTien * mucThue) / 100);
  const tongThanhToan = tongTien + tienThue;
  const invoice = {
    maHoaDon,
    ngayBan: $("ngayBan").value,
    tenKhach: $("tenKhach").value.trim(),
    dienThoai: $("dienThoai").value.trim(),
    diaChi: $("diaChi").value.trim(),
    ghiChu: $("ghiChu").value.trim(),
    hangHoa,
    tongTien,
    tongVon,
    tongLoiNhuan: tongTien - tongVon,
    tongDaThu,
    mucThue,
    tienThue,
    tongThanhToan,
    conPhaiThu: tongThanhToan - tongDaThu,
    capNhatLuc: new Date().toISOString(),
  };

  try {
    const tx = db.transaction([STORE_HOADON, STORE_THUTIEN], "readwrite");

    tx.objectStore(STORE_HOADON).put(invoice);

    const thuStore = tx.objectStore(STORE_THUTIEN);

    lichSuThu.forEach((item) => {
      thuStore.put({
        ...item,
        maHoaDon,
      });
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Giao dịch lưu bị hủy"));
    });

    document
      .querySelectorAll("#dsThuTien tr[data-id]")
      .forEach((tr) => (tr.dataset.saved = "true"));

    $("trangThaiLuu").textContent =
      "Đã lưu phiếu và " + lichSuThu.length + " khoản thu";

    await capNhatDanhSachHoaDon();
    await capNhatDanhSachKhachHang();
    // SUA
    // TẠO HÓA ĐƠN MỚI +1
    $("soHoaDon").value = await laySoHoaDonTiepTheo();
    $("ngayBan").value = ngayHomNay();

    // XÓA BẢNG HÀNG
    $("dsHang").innerHTML = "";

    // XÓA TÊN KHÁCH HÀNG VÀ ĐIỆN THOẠI
    $("tenKhach").value = "";
    $("dienThoai").value = "";

    // XÓA BẢNG THU TIỀN
    $("dsThuTien").innerHTML = `
  <tr class="empty-payment">
    <td colspan="6">Chưa ghi nhận khoản thu nào</td>
  </tr>
`;

    $("soTienThu").value = "";
    $("ghiChuThanhToan").value = "";
    $("chonHoaDon").value = "";

    capNhatSTTHang();
    capNhatSTTLanThu();
    tinhTong();

    $("trangThaiLuu").textContent =
      "Đã lưu hóa đơn " + maHoaDon + " · Phiếu mới " + $("soHoaDon").value;

    alert(
      "Đã lưu hóa đơn " +
        maHoaDon +
        " và chuyển sang hóa đơn mới " +
        $("soHoaDon").value,
    );
    // XONG
  } catch (error) {
    console.error(error);
    alert("Không lưu được phiếu: " + error.message);
  }
}

// CẬP NHẬT DANH SÁCH HÓA ĐƠN
async function capNhatDanhSachHoaDon() {
  const invoices = await docTatCa(STORE_HOADON);

  invoices.sort((a, b) => (b.ngayBan || "").localeCompare(a.ngayBan || ""));

  const select = $("chonHoaDon");

  select.innerHTML = '<option value="">-- Chọn phiếu đã lưu --</option>';

  invoices.forEach((inv) => {
    const op = document.createElement("option");

    op.value = inv.maHoaDon;

    op.textContent = `${inv.maHoaDon} · ${inv.tenKhach || "Chưa có tên"} · ${dinhDangTien(inv.tongTien)}`;

    select.appendChild(op);
  });
}

// LỌC TRÙNG KHÁCH HÀNG TỪ CÁC HÓA ĐƠN ĐÃ LƯU
function chuanHoaTenKhach(ten) {
  return String(ten || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi-VN");
}

async function capNhatDanhSachKhachHang() {
  const invoices = await docTatCa(STORE_HOADON);
  const khachHangMap = new Map();

  // Ưu tiên thông tin từ hóa đơn được cập nhật gần đây nhất.
  invoices
    .filter((inv) => String(inv.tenKhach || "").trim())
    .sort((a, b) =>
      String(b.capNhatLuc || b.ngayBan || "").localeCompare(
        String(a.capNhatLuc || a.ngayBan || ""),
      ),
    )
    .forEach((inv) => {
      const ten = String(inv.tenKhach || "")
        .trim()
        .replace(/\s+/g, " ");
      const key = chuanHoaTenKhach(ten);
      if (!khachHangMap.has(key)) {
        khachHangMap.set(key, {
          tenKhach: ten,
          dienThoai: inv.dienThoai || "",
          diaChi: inv.diaChi || "",
        });
      }
    });

  const datalist = $("danhSachKhachHang");
  if (!datalist) return;

  datalist.innerHTML = "";
  [...khachHangMap.values()]
    .sort((a, b) => a.tenKhach.localeCompare(b.tenKhach, "vi"))
    .forEach((kh) => {
      const option = document.createElement("option");
      option.value = kh.tenKhach;
      datalist.appendChild(option);
    });
}

async function dienThongTinKhachHangDaChon() {
  const tenNhap = $("tenKhach").value;
  const key = chuanHoaTenKhach(tenNhap);
  if (!key) return;

  const invoices = await docTatCa(STORE_HOADON);
  const matched = invoices
    .filter((inv) => chuanHoaTenKhach(inv.tenKhach) === key)
    .sort((a, b) =>
      String(b.capNhatLuc || b.ngayBan || "").localeCompare(
        String(a.capNhatLuc || a.ngayBan || ""),
      ),
    )[0];

  if (!matched) return;

  // Khi chọn đúng khách hàng đã lưu, tự điền số điện thoại và địa chỉ.
  $("dienThoai").value = matched.dienThoai || "";
  $("diaChi").value = matched.diaChi || "";
}

// MỞ HÓA ĐƠN ĐÃ LƯU
async function moPhieuDaLuu() {
  const id = $("chonHoaDon").value;

  if (!id) {
    alert("Bạn hãy chọn một phiếu đã lưu.");
    return;
  }

  const invoice = await new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE_HOADON, "readonly")
      .objectStore(STORE_HOADON)
      .get(id);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (!invoice) {
    alert("Không tìm thấy phiếu.");
    return;
  }

  const receipts = (await docTatCa(STORE_THUTIEN)).filter(
    (x) => x.maHoaDon === id,
  );

  $("soHoaDon").value = invoice.maHoaDon;
  $("ngayBan").value = invoice.ngayBan || "";
  $("tenKhach").value = invoice.tenKhach || "";
  $("dienThoai").value = invoice.dienThoai || "";
  $("diaChi").value = invoice.diaChi || "";
  $("ghiChu").value = invoice.ghiChu || "";
  $("thueGTGT").value = invoice.mucThue ?? "";
  $("dsHang").innerHTML = "";

  (invoice.hangHoa || []).forEach((h) => {
    const sp = danhSachTonDayDu.find(
      (x) => chuanHoaMa(x.maHang) === chuanHoaMa(h.maHang),
    );
    const hangTrongDanhMuc = danhSachHangMua.find(
      (x) =>
        chuanHoaMa(x.maHang) === chuanHoaMa(h.maHang) ||
        chuanHoaTenHang(x.tenHang) === chuanHoaTenHang(h.tenHang),
    );
    const cacDVT = hangTrongDanhMuc?.donViTinhs ||
      danhSachDVT
        .filter((x) => chuanHoaMa(x.MaSP) === chuanHoaMa(h.maHang))
        .map((x) => ({
          maHang: h.maHang,
          donViTinh: x.DonViTinh,
          heSoQuyDoi: Number(x.HeSoQuyDoi) || 1,
          giaVon: Number(h.giaVon) || 0,
          giaBan: Number(h.giaBan) || 0,
        }));
    taoDongHang({ ...h, cacDVT });
  });

  // Không tự tạo dòng trống; hàng được thêm từ danh mục phía trên.

  $("dsThuTien").innerHTML = "";

  receipts.sort((a, b) => (a.ngayThu || "").localeCompare(b.ngayThu || ""));

  receipts.forEach((x) => {
    hienThiLanThu({
      ...x,
      saved: true,
    });
  });

  hienDongTrongNeuCan();
  capNhatSTTLanThu();
  tinhTong();

  $("trangThaiLuu").textContent = `Đang mở phiếu ${id}`;
}

// TẠO PHIẾU MỚI VÀ TỰ ĐỘNG TĂNG SỐ HÓA ĐƠN
async function phieuMoi() {
  if (!confirm("Tạo phiếu mới? Những thay đổi chưa lưu sẽ bị bỏ.")) return;

  try {
    const soMoi = await laySoHoaDonTiepTheo();
    $("soHoaDon").value = soMoi;
    $("ngayBan").value = ngayHomNay();

    [
      "tenKhach",
      "dienThoai",
      "diaChi",
      "ghiChu",
      "soTienThu",
      "ghiChuThanhToan",
    ].forEach((id) => {
      $(id).value = "";
    });

    $("ngayThu").value = ngayHomNay();
    $("thueGTGT").value = "";
    $("dsHang").innerHTML = "";
    capNhatSTTHang();
    $("dsThuTien").innerHTML = `
      <tr class="empty-payment"><td colspan="6">Chưa ghi nhận khoản thu nào</td></tr>
    `;
    $("chonHoaDon").value = "";
    $("trangThaiLuu").textContent = "Phiếu mới · Chưa lưu";
    tinhTong();
  } catch (error) {
    console.error(error);
    alert("Không lấy được số hóa đơn mới: " + error.message);
  }
}

// KHỞI ĐỘNG
async function khoiDong() {
  try {
    db = await moDatabase();

    await napDanhSachHangTon();
    await capNhatDanhSachHoaDon();
    await capNhatDanhSachKhachHang();
    $("soHoaDon").value = await laySoHoaDonTiepTheo();

    $("trangThaiLuu").textContent = danhSachHangMua.length
      ? `Đã kết nối · ${danhSachHangMua.length} mặt hàng còn tồn từ Bảng Tồn Kho`
      : "Đã kết nối · Không có mặt hàng còn tồn để bán";
  } catch (error) {
    console.error(error);

    $("trangThaiLuu").textContent = "Không kết nối được IndexedDB";

    alert("Không mở được IndexedDB. Hãy chạy trang bằng Live Server.");
  }
}

// XÓA HÓA ĐƠN ĐÃ LƯU VÀ TOÀN BỘ KHOẢN THU LIÊN QUAN
async function xoaHoaDonDaLuu() {
  const maHoaDon = $("chonHoaDon").value;
  if (!maHoaDon) {
    alert("Vui lòng chọn hóa đơn cần xóa!");
    return;
  }
  if (
    !confirm(
      `Bạn có chắc muốn xóa hóa đơn ${maHoaDon} và toàn bộ lịch sử thu tiền liên quan?`,
    )
  )
    return;

  try {
    const tx = db.transaction([STORE_HOADON, STORE_THUTIEN], "readwrite");
    tx.objectStore(STORE_HOADON).delete(maHoaDon);
    const index = tx.objectStore(STORE_THUTIEN).index("maHoaDon");
    const request = index.openCursor(IDBKeyRange.only(maHoaDon));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () =>
        reject(tx.error || new Error("Giao dịch xóa thất bại"));
      tx.onabort = () => reject(tx.error || new Error("Giao dịch xóa bị hủy"));
    });

    await capNhatDanhSachHoaDon();
    await capNhatDanhSachKhachHang();
    $("chonHoaDon").value = "";
    $("soHoaDon").value = await laySoHoaDonTiepTheo();
    alert(`Đã xóa hóa đơn ${maHoaDon} và các khoản thu liên quan.`);
  } catch (error) {
    console.error(error);
    alert("Không xóa được hóa đơn: " + error.message);
  }
}

// CÁC NÚT CHỨC NĂNG
$("timTenHang").addEventListener("input", locDanhMucHang);

$("tenKhach").addEventListener("change", () => {
  dienThongTinKhachHangDaChon().catch((error) => {
    console.error("Không lấy được thông tin khách hàng:", error);
  });
});

$("btnThemThu").addEventListener("click", themLanThuTien);

$("btnLuu").addEventListener("click", luuPhieu);

$("btnMo").addEventListener("click", () => {
  moPhieuDaLuu().catch((error) => {
    alert("Lỗi mở phiếu: " + error.message);
  });
});

$("btnLamMoi").addEventListener("click", phieuMoi);
$("btnXoaHoaDon")?.addEventListener("click", xoaHoaDonDaLuu);

$("btnIn").addEventListener("click", () => {
  window.print();
});

// NGÀY MẶC ĐỊNH
$("ngayBan").value = ngayHomNay();
$("ngayThu").value = ngayHomNay();

// Danh mục hàng hóa được nạp từ IndexedDB; chọn một tên hàng để thêm vào hóa đơn.

// KẾT NỐI DATABASE
khoiDong();
$("soTienThu").addEventListener("input", function () {
  let so = this.value.replace(/\D/g, "");
  this.value = so.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
});

// XUẤT PHIẾU BÁN HÀNG RA PDF
const nutXuatPDF = document.getElementById("btnXuatPDF");

nutXuatPDF.addEventListener("click", async function () {
  if (typeof window.html2pdf !== "function") {
    alert("Chưa tải được thư viện xuất PDF. Vui lòng kiểm tra Internet.");
    return;
  }

  const noiDung = document.querySelector(".page");
  const nut = this;

  if (!noiDung) {
    alert("Không tìm thấy nội dung phiếu bán hàng.");
    return;
  }

  try {
    nut.disabled = true;
    nut.textContent = "ĐANG TẠO PDF...";

    document.body.classList.add("dang-xuat-pdf");

    if (document.fonts?.ready) await document.fonts.ready;

    await window
      .html2pdf()
      .set({
        filename: "Phieu-ban-hang.pdf",
        margin: [8, 8, 8, 8],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollY: 0,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(noiDung)
      .save();
  } catch (error) {
    console.error("Lỗi xuất PDF:", error);
    alert("Không thể xuất PDF. Vui lòng thử lại.");
  } finally {
    document.body.classList.remove("dang-xuat-pdf");
    nut.disabled = false;
    nut.textContent = "XUẤT PDF";
  }
});

// ẨN CÁC CỘT KHÔNG CẦN IN
const stylePDF = document.createElement("style");

stylePDF.textContent = `
  body.dang-xuat-pdf .items-table th:nth-child(5),
  body.dang-xuat-pdf .items-table td:nth-child(5),
  body.dang-xuat-pdf .items-table th:nth-child(8),
  body.dang-xuat-pdf .items-table td:nth-child(8),
  body.dang-xuat-pdf .items-table th:nth-child(9),
  body.dang-xuat-pdf .items-table td:nth-child(9) {
    display: none !important;
  }

  body.dang-xuat-pdf .payment-table th:last-child,
  body.dang-xuat-pdf .payment-table td:last-child {
    display: none !important;
}
/* ẨN TOÀN BỘ PHẦN THU TIỀN KHÁCH HÀNG */
body.dang-xuat-pdf .collection-panel {
  display: none !important;
}

body.dang-xuat-pdf .summary-item:nth-child(4),
body.dang-xuat-pdf .summary-item:nth-child(5) {
  display: none !important;
}

  body.dang-xuat-pdf .product-catalog,
  body.dang-xuat-pdf .collection-form,
  body.dang-xuat-pdf .actions,
  body.dang-xuat-pdf .footer-note,
  body.dang-xuat-pdf .saved-row {
    display: none !important;
  }
`;

document.head.appendChild(stylePDF);

// ==================================================
// DANH SÁCH HÓA ĐƠN CUỐI TRANG - CHỨC NĂNG BỔ SUNG
// Không thay đổi các chức năng cũ
// ==================================================

async function hienThiDanhSachHoaDonCuoiTrang() {
  try {
    const invoices = await docTatCa(STORE_HOADON);

    const thangChon = $("locThangHoaDon")?.value || "";

    const danhSach = invoices
      .filter((inv) => {
        if (!thangChon) return true;
        return String(inv.ngayBan || "").slice(0, 7) === thangChon;
      })
      .sort((a, b) =>
        String(b.ngayBan || "").localeCompare(String(a.ngayBan || "")),
      );

    const tbody = $("danhSachHoaDonDaLuu");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (danhSach.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;">
            Không có hóa đơn trong tháng này
          </td>
        </tr>
      `;
      return;
    }

    danhSach.forEach((inv) => {
      const tr = document.createElement("tr");

      const tdMa = document.createElement("td");
      tdMa.textContent = inv.maHoaDon || "";

      const tdKhach = document.createElement("td");
      tdKhach.textContent = inv.tenKhach || "Chưa có tên";

      const tdNgay = document.createElement("td");
      tdNgay.textContent = inv.capNhatLuc
        ? new Date(inv.capNhatLuc).toLocaleString("vi-VN")
        : inv.ngayBan || "";

      const tdThaoTac = document.createElement("td");
      tdThaoTac.style.textAlign = "center";

      const btnTai = document.createElement("button");
      btnTai.type = "button";
      btnTai.textContent = "Tải";
      btnTai.dataset.action = "tai";
      btnTai.dataset.id = inv.maHoaDon;

      const btnXoa = document.createElement("button");
      btnXoa.type = "button";
      btnXoa.textContent = "Xóa";
      btnXoa.dataset.action = "xoa";
      btnXoa.dataset.id = inv.maHoaDon;

      tdThaoTac.append(btnTai, btnXoa);
      tr.append(tdMa, tdKhach, tdNgay, tdThaoTac);
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Lỗi hiển thị danh sách hóa đơn:", error);
  }
}

// ==================================================
// LỌC THÁNG VÀ TẢI LẠI DANH SÁCH HÓA ĐƠN CUỐI TRANG
// ==================================================

// Khi chọn tháng, tự động lọc danh sách
document
  .getElementById("locThangHoaDon")
  ?.addEventListener("change", function () {
    hienThiDanhSachHoaDonCuoiTrang();
  });

// Hiển thị danh sách khi mở trang
async function khoiTaoDanhSachHoaDonCuoiTrang() {
  try {
    if (!db) {
      db = await moDatabase();
    }

    await hienThiDanhSachHoaDonCuoiTrang();
  } catch (error) {
    console.error("Không tải được danh sách hóa đơn:", error);
  }
}

khoiTaoDanhSachHoaDonCuoiTrang();

// ==================================================
// NÚT TẢI VÀ XÓA TỪ DANH SÁCH HÓA ĐƠN CUỐI TRANG
// ==================================================

document
  .getElementById("danhSachHoaDonDaLuu")
  ?.addEventListener("click", async function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const maHoaDon = button.dataset.id;
    const thaoTac = button.dataset.action;

    if (!maHoaDon) return;

    // NÚT TẢI: Tận dụng hàm mở hóa đơn cũ
    if (thaoTac === "tai") {
      const selectCu = $("chonHoaDon");
      const giaTriCu = selectCu.value;

      try {
        selectCu.value = maHoaDon;

        await moPhieuDaLuu();
      } catch (error) {
        console.error(error);
        alert("Không tải được hóa đơn: " + error.message);
      } finally {
        selectCu.value = giaTriCu;
      }
    }

    // NÚT XÓA: Tận dụng hàm xóa hóa đơn cũ
    if (thaoTac === "xoa") {
      const selectCu = $("chonHoaDon");
      const giaTriCu = selectCu.value;

      try {
        selectCu.value = maHoaDon;

        await xoaHoaDonDaLuu();

        await hienThiDanhSachHoaDonCuoiTrang();
      } catch (error) {
        console.error(error);
        alert("Không xóa được hóa đơn: " + error.message);
      } finally {
        // Khôi phục lựa chọn cũ nếu hóa đơn đó vẫn còn
        if ([...selectCu.options].some((op) => op.value === giaTriCu)) {
          selectCu.value = giaTriCu;
        } else {
          selectCu.value = "";
        }
      }
    }
  });

// ==================================================
// BỘ CHỌN THÁNG TIẾNG VIỆT
// ==================================================

(function boChonThangTiengViet() {
  const oChonThang = document.getElementById("locThangHoaDon");
  const hienNam = document.getElementById("namDangChon");
  const hienThang = document.getElementById("thangDaChon");
  const cacNutThang = document.querySelectorAll(".month-picker-grid button");

  if (!oChonThang || !hienNam || !hienThang) return;

  let nam = new Date().getFullYear();

  function capNhatGiaoDien() {
    hienNam.textContent = nam;

    const giaTri = oChonThang.value;

    cacNutThang.forEach((nut) => {
      const thang = nut.dataset.month;
      nut.classList.toggle("active", giaTri === `${nam}-${thang}`);
    });

    hienThang.textContent = giaTri
      ? `Đang lọc: Tháng ${Number(giaTri.slice(5, 7))} năm ${giaTri.slice(0, 4)}`
      : "Đang hiển thị tất cả hóa đơn";
  }

  function locDanhSachMoi() {
    capNhatGiaoDien();
    hienThiDanhSachHoaDonCuoiTrang();
  }

  // Chuyển năm trước
  document.getElementById("namTruoc")?.addEventListener("click", function () {
    nam--;
    locDanhSachMoi();
  });

  // Chuyển năm sau
  document.getElementById("namSau")?.addEventListener("click", function () {
    nam++;
    locDanhSachMoi();
  });

  // Chọn tháng
  cacNutThang.forEach((nut) => {
    nut.addEventListener("click", function () {
      const thang = this.dataset.month;

      oChonThang.value = `${nam}-${thang}`;

      locDanhSachMoi();
    });
  });

  // Hiện tất cả hóa đơn
  document.getElementById("boLocThang")?.addEventListener("click", function () {
    oChonThang.value = "";
    locDanhSachMoi();
  });

  // Tải lại danh sách
  document
    .getElementById("btnTaiLaiDanhSach")
    ?.addEventListener("click", function () {
      hienThiDanhSachHoaDonCuoiTrang();
    });

  capNhatGiaoDien();
})();
// TỰ ĐỘNG TÍNH LẠI KHI THAY ĐỔI THUẾ
$("thueGTGT").addEventListener("input", function () {
  tinhTong();
});
