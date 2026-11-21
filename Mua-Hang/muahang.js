"use strict";

/*

  Dữ liệu đầu vào:

  Nguon.json: MaSP, TenHang

  DVT.json: MaSP, DonViTinh, HeSoQuyDoi, MaSPDiKem,

            SoLuongDiKem, GiaSX

*/

const $ = (id) => document.getElementById(id);

// IndexedDB lưu hóa đơn mua hàng
const DB_NAME = "LuuMuaHang";
const DB_VERSION = 2;
const STORE_NAME = "HoaDon";
const STORE_THANHTOAN = "ThanhToan";

let db;

let danhMucHang = [];

let danhSachDVT = [];

let chiTietHoaDon = [];
let danhSachTraTien = [];
let hoaDonDangMoId = null;

function hienThongBao(noiDung, laLoi = false) {
  const el = $("thongBao");

  el.textContent = noiDung;

  el.style.color = laLoi ? "#b00020" : "#17633b";
}

function chuanHoa(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("vi");
}

// Định dạng số theo chuẩn Việt Nam: 1.234.567

function dinhDangSo(value, soLeToiDa = 0) {
  const number = Number(value) || 0;

  return number.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,

    maximumFractionDigits: soLeToiDa,
  });
}

// Đơn giá và thành tiền làm tròn đến đồng; số lượng có thể có phần lẻ.

function dinhDangTien(value) {
  return dinhDangSo(Math.round(Number(value) || 0));
}

function docSoNhap(value) {
  let raw = String(value ?? "")
    .trim()
    .replace(/\s/g, "");

  if (!raw) return 0;

  // Dấu chấm là phân cách hàng nghìn, dấu phẩy là thập phân theo kiểu Việt Nam.

  raw = raw.replace(/\./g, "").replace(/,/g, ".");

  const number = Number(raw);

  return Number.isFinite(number) ? number : 0;
}

function ngayHomNay() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Mở hoặc tạo IndexedDB
function moDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORE_THANHTOAN)) {
        const paymentStore = database.createObjectStore(STORE_THANHTOAN, {
          keyPath: "id",
        });
        paymentStore.createIndex("hoaDonId", "hoaDonId", { unique: false });
        paymentStore.createIndex("soHoaDon", "soHoaDon", { unique: false });
      }
    };

    request.onsuccess = function (event) {
      db = event.target.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

// Đọc toàn bộ hóa đơn
function docDuLieuDaLuu() {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database chưa được mở."));
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

// Lưu hoặc cập nhật một hóa đơn
function luuDuLieuDaLuu(hoaDon) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database chưa được mở."));
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(hoaDon);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error || new Error("Giao dịch lưu bị hủy."));
  });
}

// Xóa một hóa đơn theo id
function xoaDuLieuDaLuu(id) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database chưa được mở."));
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error || new Error("Giao dịch xóa bị hủy."));
  });
}

// Tạo datalist nếu HTML chưa khai báo và gắn vào input.
// Datalist chỉ gợi ý, người dùng vẫn được nhập giá trị mới.

function damBaoDatalist(inputId, listId) {
  const input = $(inputId);
  if (!input) return null;

  let datalist = document.getElementById(listId);
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = listId;
    input.insertAdjacentElement("afterend", datalist);
  }

  input.setAttribute("list", listId);
  input.setAttribute("autocomplete", "on");
  return datalist;
}

const listNguoiBan = damBaoDatalist("nguoiBan", "goiYNguoiBan");
const listDienThoai = damBaoDatalist("dienThoai", "goiYDienThoai");

// Lấy tên người bán và số điện thoại không trùng từ các hóa đơn đã lưu.
async function capNhatGoiYNguoiBan() {
  const tuKhoa = chuanHoa($("timSoHoaDonDaLuu")?.value || "");
  const danhSach = (await docDuLieuDaLuu()).filter((item) =>
    chuanHoa(item.soHoaDon).includes(tuKhoa),
  );

  const uniqueValues = (values) => {
    const seen = new Set();
    return values
      .map((value) => String(value ?? "").trim())
      .filter((value) => {
        if (!value) return false;
        const key = value.toLocaleLowerCase("vi");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, "vi"));
  };

  if (listNguoiBan) {
    listNguoiBan.replaceChildren();
    uniqueValues(danhSach.map((item) => item.nguoiBan)).forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      listNguoiBan.appendChild(option);
    });
  }

  if (listDienThoai) {
    listDienThoai.replaceChildren();
    uniqueValues(danhSach.map((item) => item.dienThoai)).forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      listDienThoai.appendChild(option);
    });
  }
}

function layDanhSachDonVi(maSP) {
  return danhSachDVT.filter((row) => chuanHoa(row.MaSP) === chuanHoa(maSP));
}
// LẤY GIÁ MUA GẦN NHẤT TỪ INDEXEDDB
async function layGiaMuaGanNhat(maSP, donViTinh) {
  const danhSachHoaDon = await docDuLieuDaLuu();

  const cacLanMua = [];

  danhSachHoaDon.forEach((hoaDon) => {
    (hoaDon.chiTiet || []).forEach((item) => {
      if (
        chuanHoa(item.maHang) === chuanHoa(maSP) &&
        chuanHoa(item.donViTinh) === chuanHoa(donViTinh) &&
        Number(item.donGia) > 0
      ) {
        cacLanMua.push({
          donGia: Number(item.donGia),
          ngayLap: hoaDon.ngayLap || "",
          ngayLuu: hoaDon.ngayLuu || "",
        });
      }
    });
  });

  if (!cacLanMua.length) return 0;

  // Sắp xếp hóa đơn mới nhất lên trước
  cacLanMua.sort((a, b) => {
    const ngayA = a.ngayLap || a.ngayLuu;
    const ngayB = b.ngayLap || b.ngayLuu;

    return String(ngayB).localeCompare(String(ngayA));
  });

  return cacLanMua[0].donGia;
}
function chuyenDVTThanhLuaChon(row) {
  return {
    donViTinh: String(row.DonViTinh ?? "").trim(),

    heSoQuyDoi: Number(row.HeSoQuyDoi) || 1,

    maSPDiKem: String(row.MaSPDiKem ?? ""),

    soLuongDiKem: Number(row.SoLuongDiKem) || 0,

    // Giá sẽ được lấy từ IndexedDB, không lấy GiaSX trong DVT.json.
    donGia: 0,
  };
}

async function taoSoHoaDonMoi() {
  const daLuu = await docDuLieuDaLuu();

  let soLonNhat = 0;

  daLuu.forEach((item) => {
    const match = String(item.soHoaDon || "").match(/(\d+)$/);

    if (match) soLonNhat = Math.max(soLonNhat, Number(match[1]));
  });

  $("soHoaDon").value = `MH-${String(soLonNhat + 1).padStart(4, "0")}`;
}

async function taiJSON(tenFile) {
  const response = await fetch(`./${tenFile}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Không tải được ${tenFile} (HTTP ${response.status}).`);
  }

  return response.json();
}

// ===== THEO DOI CAC LAN TRA TIEN CHO HOA DON MUA =====
function layTongTienMua() {
  return chiTietHoaDon.reduce(
    (sum, row) => sum + (Number(row.soLuong) || 0) * (Number(row.donGia) || 0),
    0,
  );
}

function dinhDangNgayHienThi(value) {
  if (!value) return "";

  const parts = String(value).split("-");

  if (parts.length !== 3) return value;

  const [nam, thang, ngay] = parts;

  return `${ngay}/${thang}/${nam}`;
}

function veLaiDanhSachThanhToan() {
  const tbody = $("danhSachThanhToan");
  if (!tbody) return;
  tbody.replaceChildren();

  if (!danhSachTraTien.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "empty-cell";
    td.textContent = "Chưa ghi nhận lần trả tiền nào";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    danhSachTraTien.forEach((item, index) => {
      const tr = document.createElement("tr");
      [
        index + 1,
        dinhDangNgayHienThi(item.ngayTra),
        dinhDangTien(item.soTien),
        item.hinhThuc || "",
        item.noiDung || "—",
      ].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });
      const tdXoa = document.createElement("td");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "delete-btn";
      btn.textContent = "Xóa";
      btn.addEventListener("click", () => {
        danhSachTraTien.splice(index, 1);
        veLaiDanhSachThanhToan();
      });
      tdXoa.appendChild(btn);
      tr.appendChild(tdXoa);
      tbody.appendChild(tr);
    });
  }

  capNhatTongThanhToan();
}

function capNhatTongThanhToan() {
  const tong = layTongTienMua();
  const daTra = danhSachTraTien.reduce(
    (sum, item) => sum + (Number(item.soTien) || 0),
    0,
  );
  $("tongTienMua").textContent = dinhDangTien(tong) + " đ";
  $("tongDaTra").textContent = dinhDangTien(daTra) + " đ";
  $("conPhaiTra").textContent = dinhDangTien(tong - daTra) + " đ";
}

function themLanTraTien() {
  const raw = $("soTienTra").value.trim();
  const soTien = docSoNhap(raw);
  if (!(soTien > 0)) {
    hienThongBao("Vui lòng nhập số tiền trả lớn hơn 0.", true);
    $("soTienTra").focus();
    return;
  }

  danhSachTraTien.push({
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `TT-${Date.now()}-${Math.random()}`,
    ngayTra: ngayHomNay(),
    soTien: Math.round(soTien),
    hinhThuc: $("hinhThucTra").value,
    noiDung: $("noiDungTra").value.trim(),
  });

  $("soTienTra").value = "";
  $("noiDungTra").value = "";
  $("ngayTra").value = ngayHomNay();

  veLaiDanhSachThanhToan();
  hienThongBao("Đã thêm lần trả tiền. Nhấn LƯU HÓA ĐƠN để lưu.");
}

function docTatCaLanTra() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_THANHTOAN, "readonly");
    const req = tx.objectStore(STORE_THANHTOAN).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function luuCacLanTra(tx, hoaDon) {
  const store = tx.objectStore(STORE_THANHTOAN);
  const req = store.getAll();
  req.onsuccess = () => {
    (req.result || [])
      .filter((item) => item.hoaDonId === hoaDon.id)
      .forEach((item) => store.delete(item.id));

    danhSachTraTien.forEach((item) => {
      store.put({
        ...item,
        hoaDonId: hoaDon.id,
        soHoaDon: hoaDon.soHoaDon,
      });
    });
  };
  req.onerror = () => {
    try {
      tx.abort();
    } catch (_) {}
  };
}

// =====================================================
// TÌM CÔNG NỢ NGƯỜI BÁN THEO NGÀY VÀ TÊN NGƯỜI BÁN
// =====================================================

async function timCongNoNguoiBan() {
  const tuNgay = $("tuNgay")?.value;
  const denNgay = $("denNgay")?.value;
  const tenNguoiBan = chuanHoa($("nguoiBan")?.value);

  if (!tuNgay || !denNgay) {
    hienThongBao("Vui lòng chọn ngày bắt đầu và ngày kết thúc.", true);
    return;
  }

  if (tuNgay > denNgay) {
    hienThongBao("Ngày bắt đầu không được lớn hơn ngày kết thúc.", true);
    return;
  }

  try {
    // Đọc toàn bộ hóa đơn mua đã lưu
    const tatCaHoaDon = await docDuLieuDaLuu();

    // Lọc hóa đơn theo ngày và người bán
    const hoaDonLoc = tatCaHoaDon.filter((hoaDon) => {
      const ngay = String(hoaDon.ngayLap || "");

      const dungNgay = ngay >= tuNgay && ngay <= denNgay;

      const dungNguoiBan =
        !tenNguoiBan || chuanHoa(hoaDon.nguoiBan) === tenNguoiBan;

      return dungNgay && dungNguoiBan;
    });

    // Lấy mã các hóa đơn phù hợp
    const tapHoaDonId = new Set(hoaDonLoc.map((hoaDon) => hoaDon.id));

    // Đọc toàn bộ lịch sử trả tiền
    const tatCaLanTra = await docTatCaLanTra();

    // Chỉ lấy khoản trả thuộc các hóa đơn đã lọc
    const cacLanTra = tatCaLanTra.filter((item) =>
      tapHoaDonId.has(item.hoaDonId),
    );

    // =================================================
    // HIỂN THỊ CHI TIẾT HÀNG MUA
    // =================================================

    const tbodyMua = $("chiTietHoaDon");
    tbodyMua.replaceChildren();

    let tongTienMua = 0;

    hoaDonLoc.forEach((hoaDon) => {
      (hoaDon.chiTiet || []).forEach((item) => {
        const soLuong = Number(item.soLuong) || 0;
        const donGia = Number(item.donGia) || 0;
        const thanhTien = soLuong * donGia;

        tongTienMua += thanhTien;

        const tr = document.createElement("tr");

        [
          item.maHang || "",
          item.tenHang || "",
          item.donViTinh || "",
          dinhDangSo(soLuong, 3),
          dinhDangTien(donGia),
          dinhDangTien(thanhTien),
          "",
        ].forEach((value) => {
          const td = document.createElement("td");
          td.textContent = value;
          tr.appendChild(td);
        });

        tbodyMua.appendChild(tr);
      });
    });

    if (!tbodyMua.children.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");

      td.colSpan = 7;
      td.className = "empty-cell";
      td.textContent = "Không tìm thấy hàng mua phù hợp.";

      tr.appendChild(td);
      tbodyMua.appendChild(tr);
    }

    // =================================================
    // HIỂN THỊ CHI TIẾT CÁC LẦN TRẢ TIỀN
    // =================================================

    const tbodyTra = $("danhSachThanhToan");
    tbodyTra.replaceChildren();

    let tongDaTra = 0;

    cacLanTra.sort((a, b) =>
      String(a.ngayTra || "").localeCompare(String(b.ngayTra || "")),
    );

    cacLanTra.forEach((item, index) => {
      const soTien = Number(item.soTien) || 0;
      tongDaTra += soTien;

      const tr = document.createElement("tr");

      [
        index + 1,
        dinhDangNgayHienThi(item.ngayTra),
        dinhDangTien(soTien),
        item.hinhThuc || "",
        item.noiDung || "—",
        "",
      ].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });

      tbodyTra.appendChild(tr);
    });

    if (!tbodyTra.children.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");

      td.colSpan = 6;
      td.className = "empty-cell";
      td.textContent = "Không tìm thấy khoản trả tiền phù hợp.";

      tr.appendChild(td);
      tbodyTra.appendChild(tr);
    }

    // =================================================
    // CẬP NHẬT TỔNG CÔNG NỢ
    // =================================================

    // Dùng tổng tiền hóa đơn đã lưu để tính công nợ
    tongTienMua = hoaDonLoc.reduce(
      (sum, hoaDon) => sum + (Number(hoaDon.tongCong) || 0),
      0,
    );

    const conPhaiTra = tongTienMua - tongDaTra;

    $("tongTienMua").textContent = dinhDangTien(tongTienMua) + " đ";

    $("tongDaTra").textContent = dinhDangTien(tongDaTra) + " đ";

    $("conPhaiTra").textContent = dinhDangTien(conPhaiTra) + " đ";

    hienThongBao(
      `Tìm thấy ${hoaDonLoc.length} hóa đơn và ${cacLanTra.length} lần trả tiền.`,
    );
  } catch (error) {
    console.error("Lỗi tìm công nợ người bán:", error);
    hienThongBao("Không thể tìm công nợ. Vui lòng thử lại.", true);
  }
}

// Gắn sự kiện nút tìm công nợ
$("btnCongno")?.addEventListener("click", timCongNoNguoiBan);

async function khoiTao() {
  try {
    await moDatabase();

    const [nguon, dvt] = await Promise.all([
      taiJSON("../Bao-Gia/Nguon.json"),

      taiJSON("../Bao-Gia/DVT.json"),
    ]);

    danhMucHang = Array.isArray(nguon) ? nguon : [];

    danhSachDVT = Array.isArray(dvt) ? dvt : [];

    if (!danhMucHang.length) {
      throw new Error("Nguon.json không có dữ liệu dạng danh sách.");
    }

    if (!danhSachDVT.length) {
      throw new Error("DVT.json không có dữ liệu dạng danh sách.");
    }

    $("ngayLap").value = ngayHomNay();
    $("ngayTra").value = ngayHomNay();
    await taoSoHoaDonMoi();

    hienThiDanhMuc();

    veLaiChiTietHoaDon();
    await capNhatGoiYNguoiBan();

    hienThongBao(
      `Đã tải ${danhMucHang.length} mặt hàng và ${danhSachDVT.length} dòng đơn vị tính.`,
    );
  } catch (error) {
    console.error(error);

    $("listbox").innerHTML =
      '<p class="empty">Không tải được dữ liệu. Hãy kiểm tra tên hai file JSON và chạy bằng Live Server.</p>';

    hienThongBao(error.message, true);
  }
}

function hienThiDanhMuc(tuKhoa = "") {
  const listbox = $("listbox");

  listbox.replaceChildren();

  const tuKhoaChuan = chuanHoa(tuKhoa);

  // Danh mục chỉ hiển thị và tìm kiếm theo tên hàng.

  // MaSP vẫn được giữ trong item để tra cứu DVT và ghi vào hóa đơn.

  const ketQua = danhMucHang.filter((item) =>
    chuanHoa(item.TenHang).includes(tuKhoaChuan),
  );

  if (!ketQua.length) {
    const empty = document.createElement("p");

    empty.className = "empty";

    empty.textContent = "Không tìm thấy hàng hóa phù hợp.";

    listbox.appendChild(empty);

    return;
  }

  ketQua.forEach((item) => {
    const dong = document.createElement("div");

    dong.className = "catalog-item";

    dong.tabIndex = 0;

    const ten = document.createElement("span");

    ten.textContent = item.TenHang || "(Chưa có tên hàng)";

    // Không đưa mã hàng ra danh mục; mã vẫn nằm trong item.MaSP.

    dong.appendChild(ten);

    dong.addEventListener("click", () => themHangVaoHoaDon(item));

    dong.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();

        themHangVaoHoaDon(item);
      }
    });

    listbox.appendChild(dong);
  });
}

async function themHangVaoHoaDon(item) {
  const maSP = String(item.MaSP ?? "").trim();

  const cacDVT = layDanhSachDonVi(maSP);

  if (!maSP) {
    hienThongBao("Mặt hàng này chưa có MaSP trong Nguon.json.", true);

    return;
  }

  if (!cacDVT.length) {
    hienThongBao(`Không tìm thấy mã ${maSP} trong DVT.json.`, true);

    return;
  }
  // thay
  const luaChonDVT = cacDVT.map(chuyenDVTThanhLuaChon);

  for (const dvt of luaChonDVT) {
    dvt.donGia = await layGiaMuaGanNhat(maSP, dvt.donViTinh);
  }

  const dvtMacDinh = luaChonDVT[0];

  // da
  // Nếu hàng cùng mã và cùng ĐVT mặc định đã có thì tăng số lượng.

  const dongDaCo = chiTietHoaDon.find(
    (row) =>
      chuanHoa(row.maHang) === chuanHoa(maSP) &&
      chuanHoa(row.donViTinh) === chuanHoa(dvtMacDinh.donViTinh),
  );

  if (dongDaCo) {
    dongDaCo.soLuong += 1;
  } else {
    chiTietHoaDon.push({
      maHang: maSP,

      tenHang: String(item.TenHang ?? ""),

      cacDVT: luaChonDVT,

      donViTinh: dvtMacDinh.donViTinh,

      heSoQuyDoi: dvtMacDinh.heSoQuyDoi,

      donGia: dvtMacDinh.donGia,

      soLuong: 1,
    });
  }

  veLaiChiTietHoaDon();

  hienThongBao(`Đã thêm ${item.TenHang} vào hóa đơn.`);
}

function capNhatTongCong() {
  const tong = chiTietHoaDon.reduce((sum, row) => {
    return sum + (Number(row.soLuong) || 0) * (Number(row.donGia) || 0);
  }, 0);

  $("tongCong").textContent = dinhDangTien(tong);

  return tong;
}

function taoO(text, className = "") {
  const td = document.createElement("td");

  if (className) td.className = className;

  td.textContent = text;

  return td;
}
// sua

function taoInputSo(className, value, onChange, label, laTien = false) {
  const input = document.createElement("input");

  input.type = "text";
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.className = className;

  input.value = laTien ? dinhDangTien(value) : dinhDangSo(value, 3);
  input.setAttribute("aria-label", label);
  input.addEventListener("input", () => {
    if (laTien) {
      // Chỉ giữ lại chữ số
      const raw = input.value.replace(/\D/g, "");
      const number = Number(raw) || 0;

      // Định dạng ngay khi đang gõ
      const formatted = dinhDangTien(number);

      input.value = formatted;

      // Đưa con trỏ về cuối
      input.setSelectionRange(formatted.length, formatted.length);

      onChange(number);
    } else {
      let number = docSoNhap(input.value);
      number = Math.max(0, number);
      onChange(number);
    }
  });

  input.addEventListener("blur", () => {
    const number = Math.max(0, docSoNhap(input.value));
    const finalValue = laTien ? Math.round(number) : number;

    onChange(finalValue);

    input.value = laTien ? dinhDangTien(finalValue) : dinhDangSo(finalValue, 3);
  });

  return input;
}

// Hàm Thay 3
function veLaiChiTietHoaDon() {
  const tbody = $("chiTietHoaDon");

  tbody.replaceChildren();

  if (!chiTietHoaDon.length) {
    const tr = document.createElement("tr");

    const td = document.createElement("td");

    td.colSpan = 7;

    td.className = "empty-cell";

    td.textContent = "Chưa có hàng trong hóa đơn";

    tr.appendChild(td);

    tbody.appendChild(tr);

    capNhatTongCong();

    return;
  }

  chiTietHoaDon.forEach((item, index) => {
    const tr = document.createElement("tr");

    tr.appendChild(taoO(item.maHang));

    tr.appendChild(taoO(item.tenHang, "name-cell"));

    const tdDVT = document.createElement("td");

    if (item.cacDVT && item.cacDVT.length > 1) {
      const select = document.createElement("select");

      select.className = "unit-select";

      select.setAttribute("aria-label", `Đơn vị tính ${item.tenHang}`);

      item.cacDVT.forEach((dvt, dvtIndex) => {
        const option = document.createElement("option");

        option.value = String(dvtIndex);

        option.textContent = dvt.donViTinh;

        option.selected = chuanHoa(dvt.donViTinh) === chuanHoa(item.donViTinh);

        select.appendChild(option);
      });

      select.addEventListener("change", async () => {
        const selected = item.cacDVT[Number(select.value)];

        if (!selected) return;

        item.donViTinh = selected.donViTinh;

        item.heSoQuyDoi = selected.heSoQuyDoi;

        // Lấy giá mua gần nhất theo đơn vị tính vừa chọn
        item.donGia = await layGiaMuaGanNhat(item.maHang, item.donViTinh);

        veLaiChiTietHoaDon();
      });

      tdDVT.appendChild(select);
    } else {
      tdDVT.textContent = item.donViTinh || "—";
    }

    tr.appendChild(tdDVT);

    const tdSoLuong = document.createElement("td");

    tdSoLuong.appendChild(
      taoInputSo(
        "qty",

        item.soLuong,

        (value) => {
          item.soLuong = Math.max(0, value);

          tdThanhTien.textContent = dinhDangTien(item.soLuong * item.donGia);

          capNhatTongCong();
        },

        "Số lượng",

        false,
      ),
    );

    tr.appendChild(tdSoLuong);

    const tdDonGia = document.createElement("td");

    tdDonGia.appendChild(
      taoInputSo(
        "price",

        item.donGia,

        (value) => {
          item.donGia = Math.max(0, Math.round(value));

          tdThanhTien.textContent = dinhDangTien(item.soLuong * item.donGia);

          capNhatTongCong();
        },

        "Đơn giá",

        true,
      ),
    );

    tr.appendChild(tdDonGia);

    const tdThanhTien = taoO(dinhDangTien(item.soLuong * item.donGia));

    tr.appendChild(tdThanhTien);

    const tdXoa = document.createElement("td");

    const btnXoa = document.createElement("button");

    btnXoa.type = "button";

    btnXoa.className = "delete-btn";

    btnXoa.textContent = "Xóa";

    btnXoa.setAttribute("aria-label", `Xóa ${item.tenHang}`);

    btnXoa.addEventListener("click", () => {
      chiTietHoaDon.splice(index, 1);

      veLaiChiTietHoaDon();

      hienThongBao("Đã xóa mặt hàng khỏi hóa đơn.");
    });

    tdXoa.appendChild(btnXoa);

    tr.appendChild(tdXoa);

    tbody.appendChild(tr);
  });

  capNhatTongCong();
}
// hết hàm thay 3
function taoDuLieuHoaDon() {
  return {
    id:
      hoaDonDangMoId ||
      (crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`),

    soHoaDon: $("soHoaDon").value,

    ngayLap: $("ngayLap").value,

    nguoiBan: $("nguoiBan").value.trim(),

    dienThoai: $("dienThoai").value.trim(),

    chiTiet: chiTietHoaDon.map((row) => ({
      ...row,

      cacDVT: (row.cacDVT || []).map((dvt) => ({ ...dvt })),
    })),

    tongCong: capNhatTongCong(),

    ngayLuu: new Date().toISOString(),
  };
}

async function luuHoaDon() {
  if (!chiTietHoaDon.length) {
    hienThongBao("Hóa đơn chưa có hàng hóa, không thể lưu.", true);
    return;
  }

  try {
    const hoaDon = taoDuLieuHoaDon();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORE_NAME, STORE_THANHTOAN],
        "readwrite",
      );
      transaction.objectStore(STORE_NAME).put(hoaDon);
      luuCacLanTra(transaction, hoaDon);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error || new Error("Giao dịch lưu bị hủy."));
    });

    // Đã lưu xong; mã kế tiếp sẽ là một hóa đơn mới.
    hoaDonDangMoId = null;
    // Làm trống bảng hàng hóa và bảng trả tiền.
    chiTietHoaDon = [];
    danhSachTraTien = [];

    veLaiChiTietHoaDon();
    veLaiDanhSachThanhToan();

    // Xóa nội dung các ô nhập tiền trả.
    $("soTienTra").value = "";
    $("noiDungTra").value = "";

    await capNhatGoiYNguoiBan();
    hienThongBao(`Đã lưu hóa đơn ${hoaDon.soHoaDon}.`);

    await taoSoHoaDonMoi();

    if (!$("khuVucDaLuu").hidden) {
      await hienThiDanhSachHoaDonDaLuu();
    }
  } catch (error) {
    console.error("Không lưu được hóa đơn:", error);
    hienThongBao("Không lưu được hóa đơn. Vui lòng thử lại.", true);
  }
}

async function hienThiDanhSachHoaDonDaLuu() {
  const container = $("danhSachDaLuu");

  container.replaceChildren();

  const danhSach = await docDuLieuDaLuu();

  if (!danhSach.length) {
    const empty = document.createElement("p");

    empty.className = "empty";

    empty.textContent = "Chưa có hóa đơn nào được lưu.";

    container.appendChild(empty);

    return;
  }

  danhSach.forEach((hoaDon) => {
    const row = document.createElement("div");

    row.className = "saved-item";

    const so = document.createElement("span");

    so.textContent = hoaDon.soHoaDon || "";

    const nguoiBan = document.createElement("span");

    nguoiBan.textContent = hoaDon.nguoiBan || "(Chưa có tên người bán)";

    const ngay = document.createElement("span");

    ngay.textContent = hoaDon.ngayLuu
      ? new Date(hoaDon.ngayLuu).toLocaleString("vi-VN")
      : "";

    const actions = document.createElement("div");

    actions.className = "saved-actions";

    const btnTai = document.createElement("button");

    btnTai.type = "button";

    btnTai.textContent = "Tải";

    btnTai.addEventListener("click", () => taiHoaDonDaLuu(hoaDon.id));

    const btnXoa = document.createElement("button");

    btnXoa.type = "button";

    btnXoa.textContent = "Xóa";

    btnXoa.addEventListener("click", () => xoaHoaDonDaLuu(hoaDon.id));

    actions.append(btnTai, btnXoa);

    row.append(so, nguoiBan, ngay, actions);

    container.appendChild(row);
  });
}

async function taiHoaDonDaLuu(id) {
  try {
    const danhSach = await docDuLieuDaLuu();
    const hoaDon = danhSach.find((item) => item.id === id);

    if (!hoaDon) {
      hienThongBao("Không tìm thấy hóa đơn cần tải.", true);
      return;
    }

    hoaDonDangMoId = hoaDon.id;
    $("soHoaDon").value = hoaDon.soHoaDon || "";
    $("ngayLap").value = hoaDon.ngayLap || "";
    $("nguoiBan").value = hoaDon.nguoiBan || "";
    $("dienThoai").value = hoaDon.dienThoai || "";

    chiTietHoaDon = (hoaDon.chiTiet || []).map((row) => {
      const luaChonMoi = layDanhSachDonVi(row.maHang).map(
        chuyenDVTThanhLuaChon,
      );
      return {
        ...row,
        cacDVT: luaChonMoi.length ? luaChonMoi : row.cacDVT || [],
      };
    });

    const tatCaLanTra = await docTatCaLanTra();
    danhSachTraTien = tatCaLanTra
      .filter((item) => item.hoaDonId === hoaDon.id)
      .sort((a, b) =>
        String(a.ngayTra || "").localeCompare(String(b.ngayTra || "")),
      )
      .map(({ id, ngayTra, soTien, hinhThuc, noiDung }) => ({
        id,
        ngayTra,
        soTien,
        hinhThuc,
        noiDung,
      }));

    veLaiChiTietHoaDon();
    veLaiDanhSachThanhToan();
    hienThongBao(`Đã tải hóa đơn ${hoaDon.soHoaDon} và lịch sử trả tiền.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error("Không tải được hóa đơn:", error);
    hienThongBao("Không tải được hóa đơn.", true);
  }
}

async function xoaHoaDonDaLuu(id) {
  if (!window.confirm("Bạn có chắc chắn muốn xóa hóa đơn đã lưu này không?")) {
    return;
  }

  try {
    await xoaDuLieuDaLuu(id);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_THANHTOAN, "readwrite");
      const store = tx.objectStore(STORE_THANHTOAN);
      const req = store.getAll();
      req.onsuccess = () =>
        (req.result || [])
          .filter((item) => item.hoaDonId === id)
          .forEach((item) => store.delete(item.id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error || new Error("Không xóa được lịch sử trả tiền."));
    });
    await capNhatGoiYNguoiBan();
    await hienThiDanhSachHoaDonDaLuu();
    hienThongBao("Đã xóa hóa đơn khỏi danh sách đã lưu.");
  } catch (error) {
    console.error("Không xóa được hóa đơn:", error);
    hienThongBao("Không xóa được hóa đơn.", true);
  }
}

$("txtTimKiem").addEventListener("input", (event) => {
  hienThiDanhMuc(event.target.value);
});

$("btnLuu").addEventListener("click", luuHoaDon);
$("btnThemTra")?.addEventListener("click", themLanTraTien);
$("timSoHoaDonDaLuu")?.addEventListener("input", () => {
  hienThiDanhSachHoaDonDaLuu().catch((error) => console.error(error));
});

$("btnHienLuu").addEventListener("click", async () => {
  const khuVuc = $("khuVucDaLuu");

  khuVuc.hidden = !khuVuc.hidden;

  $("btnHienLuu").setAttribute("aria-expanded", String(!khuVuc.hidden));

  if (!khuVuc.hidden) {
    await hienThiDanhSachHoaDonDaLuu();

    khuVuc.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

// Khi chọn/nhập đúng tên người bán đã có, gợi ý số điện thoại tương ứng.
// Cả hai ô vẫn cho phép nhập và sửa tự do.
$("nguoiBan")?.addEventListener("change", async () => {
  const tenDangChon = chuanHoa($("nguoiBan").value);
  if (!tenDangChon) return;

  try {
    const danhSach = await docDuLieuDaLuu();
    const hoaDonGanNhat = danhSach.find(
      (item) =>
        chuanHoa(item.nguoiBan) === tenDangChon &&
        String(item.dienThoai || "").trim(),
    );
    if (hoaDonGanNhat && !$("dienThoai").value.trim()) {
      $("dienThoai").value = hoaDonGanNhat.dienThoai;
    }
  } catch (error) {
    console.error("Không lấy được số điện thoại gợi ý:", error);
  }
});

$("btnIn").addEventListener("click", () => window.print());

// XUẤT HÓA ĐƠN MUA HÀNG RA PDF
$("btnXuatPDF").addEventListener("click", async function () {
  if (typeof window.html2pdf !== "function") {
    alert(
      "Chưa tải được thư viện xuất PDF. Vui lòng kiểm tra kết nối Internet.",
    );
    return;
  }

  const noiDung = document.querySelector(".app");
  const nut = $("btnXuatPDF");

  try {
    nut.disabled = true;
    nut.textContent = "ĐANG TẠO PDF...";

    document.body.classList.add("dang-xuat-pdf");

    if (document.fonts?.ready) await document.fonts.ready;

    await window
      .html2pdf()
      .set({
        filename: "Muahang.pdf",
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

khoiTao();
// ĐỊNH DẠNG HÀNG NGHÌN Ô SỐ TIỀN TRẢ
$("soTienTra").addEventListener("input", function () {
  let so = this.value.replace(/\D/g, "");
  this.value = so.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
});
// =====================================================
// TỰ ĐỘNG LẤY THÁNG HIỆN TẠI KHI MỞ TRANG
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
  const tuNgay = document.getElementById("tuNgay");
  const denNgay = document.getElementById("denNgay");

  if (!tuNgay || !denNgay) return;

  const homNay = new Date();

  const nam = homNay.getFullYear();
  const thang = homNay.getMonth();

  // Ngày đầu tháng
  const ngayDau = new Date(nam, thang, 1);

  // Ngày cuối tháng
  const ngayCuoi = new Date(nam, thang + 1, 0);

  // Định dạng YYYY-MM-DD
  const dinhDangNgay = (ngay) => {
    const y = ngay.getFullYear();
    const m = String(ngay.getMonth() + 1).padStart(2, "0");
    const d = String(ngay.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };

  tuNgay.value = dinhDangNgay(ngayDau);
  denNgay.value = dinhDangNgay(ngayCuoi);
});
