// ======================================================
// MAIN3.JS - QUẢN LÝ BÁO GIÁ TRONG INDEXEDDB
// SĐH tự tăng; trùng SĐH ghi đè; khác SĐH tạo mới.
// Tải / xóa từng báo giá; xóa toàn bộ; hiển thị ngày báo giá.
// ======================================================

const TEN_DATABASE_BAO_GIA = "BAI_SO3_DB";
const TEN_STORE_BAO_GIA = "duLieu";
const GIOI_HAN_BAO_GIA_BYTE = 10 * 1024 * 1024;

// 1. MỞ DATABASE
function moDatabaseBaoGia() {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(TEN_DATABASE_BAO_GIA, 1);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(TEN_STORE_BAO_GIA)) {
        db.createObjectStore(TEN_STORE_BAO_GIA);
      }
    };

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

// 2. ĐỌC TẤT CẢ BÁO GIÁ
async function docTatCaBaoGia() {
  const db = await moDatabaseBaoGia();

  return new Promise(function (resolve, reject) {
    const transaction = db.transaction(TEN_STORE_BAO_GIA, "readonly");
    const request = transaction.objectStore(TEN_STORE_BAO_GIA).openCursor();
    const ketQua = [];

    request.onsuccess = function (event) {
      const cursor = event.target.result;

      if (cursor) {
        const data = cursor.value;
        if (data && data.soDonHang) {
          ketQua.push({ khoa: cursor.key, ...data });
        }
        cursor.continue();
      } else {
        db.close();

        ketQua.sort(function (a, b) {
          const soA = Number(
            String(a.soDonHang || "").match(/^SDH-(\d+)$/i)?.[1] || 0,
          );
          const soB = Number(
            String(b.soDonHang || "").match(/^SDH-(\d+)$/i)?.[1] || 0,
          );
          if (soA !== soB) return soB - soA;
          return new Date(b.ngayLuu || 0) - new Date(a.ngayLuu || 0);
        });

        resolve(ketQua);
      }
    };

    request.onerror = function (event) {
      db.close();
      reject(event.target.error);
    };

    transaction.onerror = function (event) {
      db.close();
      reject(event.target.error);
    };
  });
}

// 3. TẠO SĐH TIẾP THEO
async function taoSoDonHangTiepTheo() {
  const danhSach = await docTatCaBaoGia();
  let soLonNhat = 0;

  danhSach.forEach(function (item) {
    const match = String(item.soDonHang || "").match(/^SDH-(\d+)$/i);
    if (match) soLonNhat = Math.max(soLonNhat, Number(match[1]));
  });

  return "SDH-" + String(soLonNhat + 1).padStart(4, "0");
}

// 4. LƯU / GHI ĐÈ THEO SĐH (dùng khóa ổn định theo SĐH)
async function luuVaoIndexedDB(duLieuLuu) {
  const dungLuong = new TextEncoder().encode(JSON.stringify(duLieuLuu)).length;
  if (dungLuong > GIOI_HAN_BAO_GIA_BYTE) {
    throw new Error("Dữ liệu báo giá vượt quá giới hạn 10 MB.");
  }

  const db = await moDatabaseBaoGia();

  return new Promise(function (resolve, reject) {
    const transaction = db.transaction(TEN_STORE_BAO_GIA, "readwrite");
    transaction.objectStore(TEN_STORE_BAO_GIA).put(duLieuLuu, duLieuLuu.id);

    transaction.oncomplete = function () {
      db.close();
      resolve();
    };
    transaction.onerror = function (event) {
      db.close();
      reject(event.target.error);
    };
    transaction.onabort = function (event) {
      db.close();
      reject(event.target.error || new Error("Giao dịch lưu bị hủy."));
    };
  });
}

// 5. ĐỊNH DẠNG NGÀY LƯU
function dinhDangNgayLuu(ngay) {
  if (!ngay) return "Không rõ ngày";
  const date = new Date(ngay);
  if (Number.isNaN(date.getTime())) return "Không rõ ngày";

  return (
    date.toLocaleDateString("vi-VN") +
    " " +
    date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  );
}

// 6. HIỂN THỊ DANH SÁCH (HTML cần #listDuLieuDaLuu)
async function hienThiDanhSachBaoGia() {
  const hop = document.getElementById("hopDuLieuDaLuu");
  const danhSachEl = document.getElementById("listDuLieuDaLuu");
  const thongBao = document.getElementById("thongBaoChuaCoDuLieu");
  if (!danhSachEl) return;

  try {
    const danhSach = await docTatCaBaoGia();
    danhSachEl.innerHTML = "";
    // Không tự động mở hộp danh sách
    if (thongBao) thongBao.style.display = danhSach.length ? "none" : "block";

    danhSach.forEach(function (item) {
      const dong = document.createElement("div");
      dong.className = "dong-du-lieu-da-luu";
      dong.style.display = "grid";
      dong.style.gridTemplateColumns = "20% 40% 25% 15%";
      dong.style.alignItems = "center";
      dong.style.gap = "0";
      dong.style.padding = "8px";
      dong.style.borderBottom = "1px solid #ddd";
      dong.style.boxSizing = "border-box";

      const soDon = document.createElement("span");
      soDon.textContent = item.soDonHang || "BÁO GIÁ CŨ";

      const tenKhach = document.createElement("span");
      tenKhach.textContent = item.khachHang || "(Chưa có tên khách hàng)";

      const ngay = document.createElement("span");
      ngay.textContent = dinhDangNgayLuu(item.ngayLuu);

      const nhomNut = document.createElement("div");
      nhomNut.style.display = "flex";
      nhomNut.style.gap = "5px";
      nhomNut.style.flexWrap = "wrap";

      const nutTai = document.createElement("button");
      nutTai.type = "button";
      nutTai.textContent = "TẢI";

      nutTai.addEventListener("click", function () {
        taiDuLieuDaLuu(item.khoa);
      });

      const nutXoa = document.createElement("button");
      nutXoa.type = "button";
      nutXoa.textContent = "XÓA";
      nutXoa.addEventListener("click", function () {
        xoaMotBaoGia(item.khoa, item.soDonHang || "BÁO GIÁ CŨ");
      });

      nhomNut.appendChild(nutTai);
      nhomNut.appendChild(nutXoa);
      dong.appendChild(soDon);
      dong.appendChild(tenKhach);
      dong.appendChild(ngay);
      dong.appendChild(nhomNut);
      danhSachEl.appendChild(dong);
    });
  } catch (loi) {
    console.error("Lỗi hiển thị danh sách báo giá:", loi);
  }
}

// 7. XÓA RIÊNG MỘT BÁO GIÁ THEO SĐH
async function xoaMotBaoGia(khoaBaoGia, soDonHang) {
  if (!confirm("Bạn có chắc muốn xóa báo giá " + soDonHang + " không?")) return;

  try {
    const db = await moDatabaseBaoGia();

    await new Promise(function (resolve, reject) {
      const transaction = db.transaction(TEN_STORE_BAO_GIA, "readwrite");
      transaction.objectStore(TEN_STORE_BAO_GIA).delete(khoaBaoGia);

      transaction.oncomplete = function () {
        db.close();
        resolve();
      };
      transaction.onerror = function (event) {
        db.close();
        reject(event.target.error);
      };
      transaction.onabort = function (event) {
        db.close();
        reject(event.target.error || new Error("Không thể xóa báo giá."));
      };
    });

    await hienThiDanhSachBaoGia();
    alert("Đã xóa báo giá " + soDonHang + ".");
  } catch (loi) {
    console.error(loi);
    alert("Không thể xóa báo giá: " + (loi.message || loi));
  }
}

// 8. NÚT LƯU: SĐH TRÙNG GHI ĐÈ, SĐH MỚI TẠO MỚI
if (typeof btnLuu !== "undefined" && btnLuu) {
  btnLuu.addEventListener("click", async function () {
    if (btnLuu.disabled) return;

    const cacDong = bangHoaDon.querySelectorAll("tr");
    if (cacDong.length === 0) {
      alert("Chưa có hàng hóa trong báo giá để lưu.");
      return;
    }

    const danhSachHang = [];

    cacDong.forEach(function (dong) {
      const inputTenHang = dong.cells[2]?.querySelector("input");
      const selectDVT = dong.cells[3]?.querySelector("select");
      const inputDonGia = dong.cells[4]?.querySelector("input");
      const inputSoLuong = dong.cells[5]?.querySelector("input");

      if (!inputTenHang || !selectDVT || !inputDonGia || !inputSoLuong) return;

      danhSachHang.push({
        MaSP: dong.cells[1]?.textContent.trim() || "",
        TenHang: inputTenHang.value,
        DonViTinh: selectDVT.value,
        DonGia: laySo(inputDonGia.value),
        SoLuong: Number(inputSoLuong.value) || 0,
      });
    });

    if (!danhSachHang.length) {
      alert("Không có dòng hàng hợp lệ để lưu.");
      return;
    }

    btnLuu.disabled = true;

    try {
      const oSoDonHang = document.getElementById("soDonHang");
      let soDonHang = oSoDonHang ? oSoDonHang.value.trim().toUpperCase() : "";

      if (!soDonHang) soDonHang = await taoSoDonHangTiepTheo();

      if (!/^SDH-\d+$/i.test(soDonHang)) {
        throw new Error("Số đơn hàng phải có dạng SDH-0001.");
      }

      const duLieuLuu = {
        id: "baoGia_" + soDonHang,
        soDonHang: soDonHang,
        ngayLuu: new Date().toISOString(),
        ngayLap: document.getElementById("ngayLap")?.value || "",
        khachHang: document.getElementById("tenKhachHang")?.value || "",
        diaChi: document.getElementById("diaChi")?.value || "",
        maSoThue: document.getElementById("maSoThue")?.value || "",
        dienThoai: document.getElementById("dienThoai")?.value || "",
        thueGTGT: document.getElementById("thueGTGT")?.value || 0,
        danhSachHang: danhSachHang,
      };

      // Cùng SĐH => cùng khóa => ghi đè. SĐH khác => tạo bản ghi mới.
      await luuVaoIndexedDB(duLieuLuu);
      await hienThiDanhSachBaoGia();

      // Làm trống phần hàng hóa sau khi lưu thành công.
      bangHoaDon.innerHTML = "";
      dongDangChon = null;
      capNhatSTT();
      tinhTongTien();

      // Tăng ô SĐH lên số tiếp theo để chuẩn bị báo giá mới.
      const soTiepTheo = await taoSoDonHangTiepTheo();
      if (oSoDonHang) oSoDonHang.value = soTiepTheo;

      alert("Đã lưu " + soDonHang + ". Số đơn hàng tiếp theo: " + soTiepTheo);
    } catch (loi) {
      console.error("Lỗi lưu báo giá:", loi);
      alert("Không thể lưu báo giá.\n\n" + (loi.message || loi));
    } finally {
      btnLuu.disabled = false;
    }
  });
}

// 9. TẢI BÁO GIÁ THEO KHÓA ĐƯỢC CHỌN.
// main.js gọi hàm này không tham số sau khi tải JSON: tải báo giá mới nhất.
async function taiDuLieuDaLuu(khoaBaoGia) {
  try {
    const danhSach = await docTatCaBaoGia();
    if (!danhSach.length) return;

    let data;
    if (khoaBaoGia !== undefined && khoaBaoGia !== null) {
      data = danhSach.find(function (item) {
        return String(item.khoa) === String(khoaBaoGia);
      });
    } else {
      data = danhSach[0];
    }
    if (!data) return;

    const soDonHangEl = document.getElementById("soDonHang");
    const ngayLapEl = document.getElementById("ngayLap");
    const tenKhachHangEl = document.getElementById("tenKhachHang");
    const diaChiEl = document.getElementById("diaChi");
    const maSoThueEl = document.getElementById("maSoThue");
    const dienThoaiEl = document.getElementById("dienThoai");
    const thueGTGTEl = document.getElementById("thueGTGT");

    if (soDonHangEl) {
      soDonHangEl.value = data.soDonHang || (await taoSoDonHangTiepTheo());
    }
    if (ngayLapEl) ngayLapEl.value = data.ngayLap || "";
    if (tenKhachHangEl) tenKhachHangEl.value = data.khachHang || "";
    if (diaChiEl) diaChiEl.value = data.diaChi || "";
    if (maSoThueEl) maSoThueEl.value = data.maSoThue || "";
    if (dienThoaiEl) dienThoaiEl.value = data.dienThoai || "";
    if (thueGTGTEl) thueGTGTEl.value = data.thueGTGT || 0;

    bangHoaDon.innerHTML = "";
    dongDangChon = null;

    if (Array.isArray(data.danhSachHang)) {
      data.danhSachHang.forEach(function (hang) {
        themHangVaoHoaDon(hang.MaSP);

        const dongCuoi = bangHoaDon.lastElementChild;
        if (!dongCuoi) return;

        const inputTenHang = dongCuoi.cells[2]?.querySelector("input");
        const selectDVT = dongCuoi.cells[3]?.querySelector("select");
        const inputDonGia = dongCuoi.cells[4]?.querySelector("input");
        const inputSoLuong = dongCuoi.cells[5]?.querySelector("input");

        if (inputTenHang) inputTenHang.value = hang.TenHang || "";

        if (selectDVT) {
          const dvtLuu = hang.DonViTinh || "";
          const daCo = Array.from(selectDVT.options).some(function (o) {
            return o.value === dvtLuu;
          });

          if (dvtLuu && !daCo) {
            const option = document.createElement("option");
            option.value = dvtLuu;
            option.textContent = dvtLuu;
            selectDVT.appendChild(option);
          }
          selectDVT.value = dvtLuu;
        }

        if (inputDonGia) inputDonGia.value = dinhDangSo(hang.DonGia);
        if (inputSoLuong) inputSoLuong.value = hang.SoLuong;

        tinhThanhTienDong(dongCuoi);
      });
    }

    capNhatSTT();
    tinhTongTien();
    console.log("Đã tải báo giá:", data.soDonHang || "BÁO GIÁ CŨ");
  } catch (loi) {
    console.error("Lỗi tải báo giá:", loi);
    alert("Không thể tải báo giá.\n\n" + (loi.message || loi));
  }
}

// 10. XÓA TOÀN BỘ INDEXEDDB (nút HTML id="btnXoaDuLieuDB")
const btnXoaDuLieuDB = document.getElementById("btnXoaDuLieuDB");

if (btnXoaDuLieuDB) {
  btnXoaDuLieuDB.addEventListener("click", async function () {
    if (!confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ báo giá đã lưu không?"))
      return;

    try {
      const db = await moDatabaseBaoGia();

      await new Promise(function (resolve, reject) {
        const transaction = db.transaction(TEN_STORE_BAO_GIA, "readwrite");
        transaction.objectStore(TEN_STORE_BAO_GIA).clear();

        transaction.oncomplete = function () {
          db.close();
          resolve();
        };
        transaction.onerror = function (event) {
          db.close();
          reject(event.target.error);
        };
        transaction.onabort = function (event) {
          db.close();
          reject(event.target.error || new Error("Không thể xóa dữ liệu."));
        };
      });

      await hienThiDanhSachBaoGia();

      const soDonHangEl = document.getElementById("soDonHang");
      if (soDonHangEl) soDonHangEl.value = "SDH-0001";

      alert("Đã xóa toàn bộ dữ liệu báo giá.");
    } catch (loi) {
      console.error(loi);
      alert("Không thể xóa dữ liệu: " + (loi.message || loi));
    }
  });
}

// 11. GIỮ NGUYÊN PHẦN HIỂN THỊ NGÀY CŨ: HÔM NAY VÀ HẠN SAU 10 NGÀY
function khoiTaoNgayBaoGia() {
  const ngayTuText = document.getElementById("ngayTuText");
  const ngayDenText = document.getElementById("ngayDenText");
  if (!ngayTuText || !ngayDenText) return;

  function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const ngayHienTai = new Date();
  const ngayHetHan = new Date(ngayHienTai);
  ngayHetHan.setDate(ngayHetHan.getDate() + 10);

  ngayTuText.textContent = formatDate(ngayHienTai);
  ngayDenText.textContent = formatDate(ngayHetHan);
}

//12.KHỞI TẠO KHI MỞ WEBSITE
// ==========================================
async function khoiTaoMain3() {
  // 1. Hiển thị ngày lập và ngày hết hạn
  khoiTaoNgayBaoGia();

  // 2. Hiển thị danh sách báo giá đã lưu
  await hienThiDanhSachBaoGia();

  // 3. Xóa bảng hóa đơn khi mở website
  bangHoaDon.innerHTML = "";

  dongDangChon = null;

  capNhatSTT();
  tinhTongTien();

  // 4. TỰ ĐỘNG LẤY SỐ ĐƠN HÀNG TIẾP THEO
  const oSoDonHang = document.getElementById("soDonHang");

  if (oSoDonHang) {
    oSoDonHang.value = await taoSoDonHangTiepTheo();
  }
}
// ==========================================
// NÚT ẨN / HIỆN DANH SÁCH BÁO GIÁ ĐÃ LƯU
// ==========================================

const btnTaiDuLieu = document.getElementById("btnTaiDuLieu");
const hopDuLieu = document.getElementById("hopDuLieuDaLuu");

if (btnTaiDuLieu && hopDuLieu) {
  // Khi mở website: ẩn danh sách
  hopDuLieu.style.display = "none";

  btnTaiDuLieu.addEventListener("click", async function () {
    if (hopDuLieu.style.display === "none") {
      // Cập nhật danh sách báo giá đã lưu
      await hienThiDanhSachBaoGia();

      // Hiện hộp danh sách
      hopDuLieu.style.display = "block";
    } else {
      // Ẩn hộp danh sách
      hopDuLieu.style.display = "none";
    }
  });
}
// ==========================================
// TỰ ĐỘNG KHỞI TẠO KHI MỞ WEBSITE
// ==========================================
document.addEventListener("DOMContentLoaded", async function () {
  try {
    await khoiTaoMain3();
  } catch (loi) {
    console.error("Lỗi khởi tạo website:", loi);
  }
});
