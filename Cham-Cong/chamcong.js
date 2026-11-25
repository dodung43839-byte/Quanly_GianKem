(() => {
  "use strict";

  const DB_NAME = "DONGDUONG_CHAMCONG_DB";
  const DB_VERSION = 3;
  const STORE_CHAMCONG = "chamCong";
  const STORE_TAMUNG = "tamUng"; // giữ kho cũ để không làm mất dữ liệu cũ
  const STORE_NHANVIEN = "nhanVien";
  const STORE_LANUNG = "lanUng";
  const STORE_CHAMKHOAN = "chamKhoan";
  const STORE_GIAKHOAN = "giaKhoan";

  const $ = (id) => document.getElementById(id);
  const money = (n) =>
    new Intl.NumberFormat("vi-VN").format(Number(n) || 0) + " đ";
  // Chuyển chuỗi có dấu chấm phân cách hàng nghìn về số để tính toán/lưu DB.
  const parseAmount = (value) => {
    const digits = String(value ?? "").replace(/[^0-9]/g, "");
    return digits === "" ? NaN : Number(digits);
  };
  // Hiển thị số có dấu chấm phân cách hàng nghìn.
  const formatAmountInput = (input) => {
    const digits = String(input.value ?? "").replace(/[^0-9]/g, "");
    input.value = digits
      ? new Intl.NumberFormat("vi-VN").format(Number(digits))
      : "";
  };
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const monthOf = (date) => String(date || "").slice(0, 7);
  let db = null;
  let editingId = null;
  let activeName = "";

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_CHAMCONG)) {
          const s = d.createObjectStore(STORE_CHAMCONG, { keyPath: "id" });
          s.createIndex("date", "date");
          s.createIndex("name", "name");
        }
        if (!d.objectStoreNames.contains(STORE_TAMUNG))
          d.createObjectStore(STORE_TAMUNG, { keyPath: "date" });
        if (!d.objectStoreNames.contains(STORE_NHANVIEN))
          d.createObjectStore(STORE_NHANVIEN, { keyPath: "name" });
        if (!d.objectStoreNames.contains(STORE_LANUNG)) {
          const s = d.createObjectStore(STORE_LANUNG, { keyPath: "id" });
          s.createIndex("date", "date");
          s.createIndex("name", "name");
          s.createIndex("month", "month");
        }
        if (!d.objectStoreNames.contains(STORE_CHAMKHOAN)) {
          const s = d.createObjectStore(STORE_CHAMKHOAN, { keyPath: "id" });
          s.createIndex("date", "date");
          s.createIndex("name", "name");
          s.createIndex("month", "month");
        }
        if (!d.objectStoreNames.contains(STORE_GIAKHOAN))
          d.createObjectStore(STORE_GIAKHOAN, { keyPath: "key" });
      };
      req.onsuccess = () => {
        db = req.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () =>
        alert("Hãy đóng các tab chấm công khác rồi tải lại trang.");
    });
  }

  function getAll(store) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly"),
        req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  function getOne(store, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly"),
        req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  function putOne(store, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  function deleteOne(store, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  function selectedMonth() {
    return $("thangXem").value || monthOf(today());
  }
  function selectedName() {
    return activeName || $("tenNhanVien").value.trim();
  }
  function showMessage(msg, error = false) {
    $("thongBao").textContent = msg;
    $("thongBao").style.color = error ? "#a00000" : "#075b24";
    setTimeout(() => ($("thongBao").textContent = ""), 3500);
  }
  function esc(v) {
    return String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  async function updateDatalist() {
    const list = await getAll(STORE_NHANVIEN);
    const options = list
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
      .map((x) => `<option value="${esc(x.name)}"></option>`)
      .join("");
    $("danhSachTen").innerHTML = options;
    if ($("danhSachTenKhoan")) $("danhSachTenKhoan").innerHTML = options;
  }
  function giaCongTheoCa(profile) {
    if (!profile) return "";
    const value = profile.wage ?? profile.wageDay ?? profile.wageNight ?? 0;
    return new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
  }

  async function loadProfile() {
    const n = $("tenNhanVien").value.trim();
    activeName = n;
    if (!n) {
      $("bangChiTietWrap").hidden = true;
      $("bangLichSuWrap").hidden = true;
      $("bangTongKetNhat").hidden = true;
      $("giaCongNhat").value = "0";
      return;
    }
    $("bangChiTietWrap").hidden = false;
    $("bangLichSuWrap").hidden = false;
    $("bangTongKetNhat").hidden = false;
    const p = await getOne(STORE_NHANVIEN, n);
    if (p) {
      $("loaiTho").value = p.type || "Thợ Chính";
      $("giaCongNhat").value = giaCongTheoCa(p) || "0";
    } else {
      $("giaCongNhat").value = "0";
    }
    await render();
  }

  async function render() {
    const month = selectedMonth(),
      name = selectedName();
    if (!name) {
      $("bangChiTietWrap").hidden = true;
      $("bangLichSuWrap").hidden = true;
      $("bangTongKetNhat").hidden = true;
      return;
    }
    $("bangChiTietWrap").hidden = false;
    $("bangLichSuWrap").hidden = false;
    $("bangTongKetNhat").hidden = false;
    const [allWork, allAdvances] = await Promise.all([
      getAll(STORE_CHAMCONG),
      getAll(STORE_LANUNG),
    ]);
    const work = allWork
      .filter(
        (r) =>
          monthOf(r.date) === month &&
          (!name ||
            r.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi")),
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.createdAt || 0) - (b.createdAt || 0),
      );
    const advances = allAdvances
      .filter(
        (r) =>
          r.month === month &&
          (!name ||
            r.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi")),
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.createdAt || 0) - (b.createdAt || 0),
      );

    const thang = Number(month.split("-")[1]);

    $("ngayDangXem").textContent = `Tháng ${thang}`;
    $("thangUngDangXem").textContent = `Tháng ${thang}`;

    $("bangChamCong").innerHTML = work.length
      ? work
          .map(
            (r, i) => `
      <tr>
        <td>${i + 1}</td><td>${r.date.split("-").reverse().join("/")}</td><td>${esc(r.name)}</td>
        <td>${esc(r.type)}</td><td>${esc(r.shift)}</td><td><input class="table-price-input" data-work-wage="${esc(r.id)}" type="text" inputmode="numeric" value="${new Intl.NumberFormat("vi-VN").format(Number(r.wage)||0)}"></td>
        <td>${Number(r.hours).toLocaleString("vi-VN")}</td><td class="money">${money(r.amount)}</td>
        <td class="no-print"><button class="delete-row" data-work-delete="${esc(r.id)}">Xóa</button></td>
      </tr>`,
          )
          .join("")
      : '<tr><td colspan="9" class="empty">Không có chấm công của nhân viên này trong tháng đã chọn.</td></tr>';

    $("bangUngTien").innerHTML = advances.length
      ? advances
          .map(
            (r, i) => `
<tr>
  <td>${i + 1}</td>
  <td>${r.date.split("-").reverse().join("/")}</td>
  <td>${esc(r.name)}</td>
  <td class="money">${money(r.amount)}</td>
  <td>${esc(r.hinhThuc || "Chưa xác định")}</td>
  <td>${esc(r.note || "")}</td>
  <td class="no-print">
    <button class="delete-row" data-advance-delete="${esc(r.id)}">Xóa</button>
  </td>
</tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="empty">Chưa có lần ứng tiền nào của nhân viên này trong tháng.</td></tr>';

    const totalWork = work.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalAdvance = advances.reduce(
      (s, r) => s + Number(r.amount || 0),
      0,
    );
    $("tongTienCong").textContent = money(totalWork);
    if ($("tongTamUng")) $("tongTamUng").textContent = money(totalAdvance);
    $("conLai").textContent = money(totalWork - totalAdvance);
  }

  async function saveWork() {
    const date = $("ngayChamCong").value || today(),
      name = $("tenNhanVien").value.trim();
    if (!name) return showMessage("Bạn chưa nhập tên nhân viên.", true);
    const oldProfileForWage = await getOne(STORE_NHANVIEN, name);
    const enteredWage = parseAmount($("giaCongNhat").value);
    const rememberedWage = oldProfileForWage
      ? (($("caLam").value === "Ca Đêm")
          ? (oldProfileForWage.wageNight ?? oldProfileForWage.wage ?? 0)
          : (oldProfileForWage.wageDay ?? oldProfileForWage.wage ?? 0))
      : 0;
    const wage = Number.isFinite(enteredWage) ? enteredWage : Number(rememberedWage) || 0;
    const hours = Number($("soGioLam").value);
    if (!Number.isFinite(hours) || hours <= 0)
      return showMessage("Số giờ làm phải lớn hơn 0.", true);
    const record = {
      id:
        editingId ||
        Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date,
      name,
      type: $("loaiTho").value,
      shift: $("caLam").value,
      wage,
      hours,
      amount: wage * hours,
      createdAt: Date.now(),
    };
    try {
      await putOne(STORE_CHAMCONG, record);
      // sửa
      const oldProfile = (await getOne(STORE_NHANVIEN, name)) || { name };

      const profile = {
        ...oldProfile,
        name,
        type: record.type,

        wageDay:
          record.shift === "Ca Ngày"
            ? wage
            : (oldProfile.wageDay ?? oldProfile.wage ?? null),

        wageNight:
          record.shift === "Ca Đêm" ? wage : (oldProfile.wageNight ?? null),
      };

      profile.wage = wage;
      $("giaCongNhat").value = new Intl.NumberFormat("vi-VN").format(wage);

      await putOne(STORE_NHANVIEN, profile);

      activeName = name;
      $("thangXem").value = monthOf(date);
      editingId = null;
      $("btnLuu").textContent = "GHI CHẤM CÔNG & GHI THU TIỀN";
      await updateDatalist();
      await render();
      showMessage(
        `Đã lưu công của ${name}. Bảng chỉ hiển thị nhân viên này trong tháng ${monthOf(date)}.`,
      );

    } catch (e) {
      console.error(e);
      showMessage("Không lưu được chấm công.", true);
    }
  }

  async function saveAdvance() {
    const name = $("tenNhanVien").value.trim() || activeName;
    const amount = parseAmount($("tamUng").value);
    const date = $("ngayChamCong").value || today();
    const hinhThuc = $("hinhThucUng").value;

    if (!name)
      return showMessage(
        "Hãy nhập tên nhân viên trước khi ghi ứng tiền.",
        true,
      );
    if ($("tamUng").value === "" || !Number.isFinite(amount) || amount <= 0)
      return showMessage("Nhập số tiền ứng lớn hơn 0.", true);
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date,
      month: monthOf(date),
      name,
      amount,
      hinhThuc,
      note: $("ghiChuUng").value.trim(),
      createdAt: Date.now(),
    };
    try {
      await putOne(STORE_LANUNG, record);
      activeName = name;
      $("thangXem").value = record.month;
      $("tamUng").value = "";
      $("ghiChuUng").value = "";
      await render();
      showMessage(`Đã ghi nhận lần ứng ${money(amount)} cho ${name}.`);
    } catch (e) {
      console.error(e);
      showMessage("Không ghi được lần ứng tiền.", true);
    }
  }

  async function loadByNameMonth() {
    const name = $("tenNhanVien").value.trim(),
      month = selectedMonth();
    if (!name)
      return showMessage("Nhập tên nhân viên trước khi tải dữ liệu.", true);
    activeName = name;
    $("bangChiTietWrap").hidden = false;
    $("bangLichSuWrap").hidden = false;
    const profile = await getOne(STORE_NHANVIEN, name);
    if (profile) {
      $("loaiTho").value = profile.type || "Thợ Chính";
    }
    await render();
    const allWork = await getAll(STORE_CHAMCONG),
      allAdv = await getAll(STORE_LANUNG);
    const wc = allWork.filter(
      (r) =>
        r.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi") &&
        monthOf(r.date) === month,
    ).length;
    const ac = allAdv.filter(
      (r) =>
        r.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi") &&
        r.month === month,
    ).length;
    showMessage(
      `Đã tải ${name} tháng ${month}: ${wc} dòng chấm công, ${ac} lần ứng tiền.`,
    );
  }

  function resetForm() {
    editingId = null;
    activeName = "";
    $("bangChiTietWrap").hidden = true;
    $("bangLichSuWrap").hidden = true;
    $("bangTongKetNhat").hidden = true;
    $("tenNhanVien").value = "";
    $("loaiTho").value = "Thợ Chính";
    $("caLam").value = "Ca Ngày";
    $("soGioLam").value = "8";
    $("tamUng").value = "";
    $("ghiChuUng").value = "";
    $("btnLuu").textContent = "GHI CHẤM CÔNG & GHI THU TIỀN";
  }
  async function xuatPDF() {
    const element = document.querySelector(".app");

    if (typeof html2pdf === "undefined") {
      alert(
        "Không tải được thư viện xuất PDF. Vui lòng kiểm tra kết nối mạng.",
      );
      return;
    }

    const tenNV = $("tenNhanVien").value.trim() || "Tat-ca-nhan-vien";
    const thang = $("thangXem").value || "";

    const options = {
      margin: [8, 8, 8, 8],

      filename: `Cham-cong-${tenNV}-${thang}.pdf`,

      image: {
        type: "jpeg",
        quality: 0.98,
      },

      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0,
        backgroundColor: "#ffffff",
      },

      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "landscape",
      },

      pagebreak: {
        mode: ["css", "legacy"],
      },
    };

    document.body.classList.add("pdf-exporting");

    try {
      await html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error(error);
      alert("Xuất PDF không thành công.");
    } finally {
      document.body.classList.remove("pdf-exporting");
    }
  }


  let danhSachKhoan = [];
  function khoanMonth() { return $("khoanThang").value || monthOf(today()); }
  function khoanName() { return $("khoanNhanVien").value.trim(); }
  function showKhoanMessage(msg, error = false) {
    $("khoanThongBao").textContent = msg;
    $("khoanThongBao").style.color = error ? "#a00000" : "#075b24";
  }
  async function loadDanhMucKhoan() {
    try {
      const response = await fetch("../Bao-Gia/Nguon.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Không tìm thấy ../Bao-Gia/Nguon.json");
      const data = await response.json();
      danhSachKhoan = data.filter(x => ["Thanh_Pham", "SP_Công"].includes(String(x.Nhom || "").trim()));
      renderDanhSachKhoan();
    } catch (e) {
      console.error(e);
      $("khoanDanhSachSP").innerHTML = '<p class="empty">Không tải được danh mục. Kiểm tra thư mục Bao-Gia có file Nguon.json và Bao-Gia nằm cùng cấp với Cham-Cong.</p>';
      $("khoanSoLuongSP").textContent = "Lỗi tải danh mục";
    }
  }
  function renderDanhSachKhoan() {
    const q = $("khoanTimSP").value.trim().toLocaleLowerCase("vi");
    const rows = danhSachKhoan.filter(x => !q || `${x.MaSP} ${x.TenHang} ${x.DonViTinh}`.toLocaleLowerCase("vi").includes(q));
    $("khoanSoLuongSP").textContent = `${rows.length} sản phẩm hiển thị / ${danhSachKhoan.length} sản phẩm`;
    $("khoanDanhSachSP").innerHTML = rows.length ? rows.map(x => `
      <label class="product-option"><input type="checkbox" class="chon-khoan-sp" value="${esc(x.MaSP)}"><span><strong>${esc(x.TenHang)}</strong><small>${esc(x.MaSP)} · ${esc(x.DonViTinh)} · ${esc(x.Nhom)}</small></span></label>`).join("") : '<p class="empty">Không tìm thấy sản phẩm phù hợp.</p>';
  }
  async function showKhoanForName() {
    const name = khoanName();
    const visible = !!name;
    $("khoanBangChiTietWrap").hidden = !visible;
    $("khoanBangLichSuWrap").hidden = !visible;
    $("khoanBangTongKet").hidden = !visible;
    if (visible) await renderKhoan();
  }
  async function addKhoanRows() {
    const name = khoanName();
    const date = $("khoanNgay").value || today();
    const selected = [...document.querySelectorAll(".chon-khoan-sp:checked")];
    if (!name) return showKhoanMessage("Hãy nhập tên nhân viên.", true);
    if (!selected.length) return showKhoanMessage("Hãy tích chọn ít nhất một sản phẩm.", true);
    try {
      for (const checkbox of selected) {
        const product = danhSachKhoan.find(x => String(x.MaSP) === checkbox.value);
        if (!product) continue;
        // Giá được nhớ theo mã/tên sản phẩm, không phụ thuộc nhân viên.
        const priceKey = String(product.MaSP);
        const saved = await getOne(STORE_GIAKHOAN, priceKey);
        const unitPrice = saved ? Number(saved.donGia) : 0;
        const record = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), date, month: monthOf(date), name, maSP: product.MaSP, sanPham: product.TenHang, donViTinh: product.DonViTinh, soLuong: 1, donGia: unitPrice, amount: unitPrice, createdAt: Date.now() };
        await putOne(STORE_CHAMKHOAN, record);
        await putOne(STORE_GIAKHOAN, { key: String(product.MaSP), maSP: product.MaSP, sanPham: product.TenHang, donGia: unitPrice });
      }
      $("khoanThang").value = monthOf(date);
      activeName = name;
      showKhoanMessage(`Đã thêm ${selected.length} dòng chấm khoán. Bạn có thể sửa đơn giá ngay trong bảng.`);
      document.querySelectorAll(".chon-khoan-sp:checked").forEach(x => x.checked = false);
      await renderKhoan();
    } catch (e) { console.error(e); showKhoanMessage("Không lưu được dữ liệu chấm khoán.", true); }
  }
  async function renderKhoan() {
    const month = khoanMonth(), name = khoanName();
    const visible = !!name;
    $("khoanBangChiTietWrap").hidden = !visible;
    $("khoanBangLichSuWrap").hidden = !visible;
    $("khoanBangTongKet").hidden = !visible;
    if (!visible) return;
    const [all, advances] = await Promise.all([getAll(STORE_CHAMKHOAN), getAll(STORE_LANUNG)]);
    const matches = r => !name || r.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi");
    const rows = all.filter(r => r.month === month && matches(r)).sort((a,b) => a.date.localeCompare(b.date) || (a.createdAt||0)-(b.createdAt||0));
    const adv = advances.filter(r => r.month === month && matches(r)).sort((a,b) => a.date.localeCompare(b.date) || (a.createdAt||0)-(b.createdAt||0));
    $("khoanThangDangXem").textContent = `Tháng ${Number(month.split("-")[1])}`;
    $("khoanThangUngDangXem").textContent = `Tháng ${Number(month.split("-")[1])}`;
    $("bangChamKhoan").innerHTML = rows.length ? rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.date.split("-").reverse().join("/")}</td><td>${esc(r.name)}</td><td>${esc(r.sanPham)}<small class="sub-code">${esc(r.maSP)}</small></td><td>${esc(r.donViTinh)}</td><td><input class="table-qty-input" data-khoan-qty="${esc(r.id)}" type="number" min="0" step="0.01" value="${Number(r.soLuong ?? 1)}"></td><td><input class="table-price-input" data-khoan-price="${esc(r.id)}" type="text" inputmode="numeric" value="${new Intl.NumberFormat("vi-VN").format(Number(r.donGia)||0)}"></td><td class="money khoan-row-total" data-amount="${Number(r.amount ?? (Number(r.soLuong ?? 1) * Number(r.donGia || 0)))}">${money(Number(r.amount ?? (Number(r.soLuong ?? 1) * Number(r.donGia || 0))))}</td><td class="no-print"><button class="delete-row" data-khoan-delete="${esc(r.id)}">Xóa</button></td></tr>`).join("") : '<tr><td colspan="9" class="empty">Không có chấm khoán của nhân viên này trong tháng đã chọn.</td></tr>';
    $("khoanBangUngTien").innerHTML = adv.length ? adv.map((r,i)=>`<tr><td>${i+1}</td><td>${r.date.split("-").reverse().join("/")}</td><td>${esc(r.name)}</td><td class="money">${money(r.amount)}</td><td>${esc(r.hinhThuc||"Chưa xác định")}</td><td>${esc(r.note||"")}</td><td class="no-print"><button class="delete-row" data-advance-delete="${esc(r.id)}">Xóa</button></td></tr>`).join("") : '<tr><td colspan="7" class="empty">Chưa có lần ứng tiền nào của nhân viên này trong tháng.</td></tr>';
    const total = rows.reduce((sum,r)=>sum+Number(r.amount ?? (Number(r.soLuong ?? 1) * Number(r.donGia || 0))),0), totalAdv = adv.reduce((sum,r)=>sum+Number(r.amount||0),0);
    $("khoanTongTienCong").textContent = money(total); $("khoanTongTamUng").textContent = money(totalAdv); $("khoanConLai").textContent = money(total-totalAdv);
  }
  async function saveKhoanRows() {
    const name = khoanName();
    const month = khoanMonth();
    if (!name) return showKhoanMessage("Hãy nhập tên nhân viên trước khi lưu.", true);
    const inputs = [...document.querySelectorAll("#bangChamKhoan [data-khoan-qty], #bangChamKhoan [data-khoan-price]")];
    if (!inputs.length) return showKhoanMessage("Chưa có sản phẩm nào trong bảng để lưu.", true);
    try {
      const ids = [...new Set(inputs.map(input => input.dataset.khoanQty || input.dataset.khoanPrice))];
      for (const id of ids) {
        const row = await getOne(STORE_CHAMKHOAN, id);
        if (!row || row.name.toLocaleLowerCase("vi") !== name.toLocaleLowerCase("vi") || row.month !== month) continue;
        const qtyInput = document.querySelector(`[data-khoan-qty="${CSS.escape(id)}"]`);
        const priceInput = document.querySelector(`[data-khoan-price="${CSS.escape(id)}"]`);
        const qty = qtyInput ? Number(qtyInput.value) : Number(row.soLuong ?? 1);
        const price = priceInput ? parseAmount(priceInput.value) : Number(row.donGia || 0);
        if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(price) || price < 0) {
          return showKhoanMessage(`Số lượng hoặc giá công của ${row.sanPham} không hợp lệ.`, true);
        }
        row.soLuong = qty;
        row.donGia = price;
        row.amount = qty * price;
        await putOne(STORE_CHAMKHOAN, row);
        await putOne(STORE_GIAKHOAN, { key: String(row.maSP), maSP: row.maSP, sanPham: row.sanPham, donGia: price });
      }
      await renderKhoan();
      showKhoanMessage("Đã lưu số lượng và giá công khoán. Giá được nhớ theo từng sản phẩm.");
    } catch (e) {
      console.error(e);
      showKhoanMessage("Không lưu được bảng chấm khoán.", true);
    }
  }

  async function reloadKhoanRows() {
    if (!khoanName()) return showKhoanMessage("Hãy nhập tên nhân viên trước khi tải lại.", true);
    await renderKhoan();
    showKhoanMessage("Đã tải lại bảng chấm khoán từ dữ liệu đã lưu.");
  }

  async function saveKhoanAdvance() {
    const name = khoanName(), amount = parseAmount($("khoanTamUng").value), date = $("khoanNgay").value || today();
    if (!name) return showKhoanMessage("Hãy nhập tên nhân viên trước khi ghi ứng tiền.", true);
    if (!Number.isFinite(amount) || amount <= 0) return showKhoanMessage("Nhập số tiền ứng lớn hơn 0.", true);
    const record = { id: Date.now().toString(36)+Math.random().toString(36).slice(2,7), date, month: monthOf(date), name, amount, hinhThuc: $("khoanHinhThucUng").value, note: $("khoanGhiChuUng").value.trim(), createdAt: Date.now() };
    await putOne(STORE_LANUNG, record);
    $("khoanThang").value = record.month; $("khoanTamUng").value = ""; $("khoanGhiChuUng").value = "";
    await renderKhoan(); showKhoanMessage(`Đã ghi nhận lần ứng ${money(amount)} cho ${name}.`);
  }
  function resetKhoanForm() {
    $("khoanBangChiTietWrap").hidden = true;
    $("khoanBangLichSuWrap").hidden = true;
    $("khoanBangTongKet").hidden = true;
    $("khoanNhanVien").value = ""; $("khoanTimSP").value = ""; $("khoanTamUng").value = ""; $("khoanGhiChuUng").value = "";
    renderDanhSachKhoan();
    document.querySelectorAll(".chon-khoan-sp:checked").forEach(x=>x.checked=false);
  }
  function switchMode(mode) {
    const khoan = mode === "khoan";
    $("viewChamNhat").hidden = khoan; $("viewChamKhoan").hidden = !khoan;
    $("tabChamNhat").classList.toggle("active", !khoan); $("tabChamKhoan").classList.toggle("active", khoan);
    if (khoan) renderKhoan(); else render();
  }
  async function xuatPDFKhoan() {
    if (typeof html2pdf === "undefined") return alert("Không tải được thư viện xuất PDF.");
    document.body.classList.add("pdf-exporting");
    const view = $("viewChamKhoan");
    try { await html2pdf().set({ margin:8, filename:`Cham-khoan-${khoanName()||"Tat-ca"}-${khoanMonth()}.pdf`, image:{type:"jpeg",quality:.98}, html2canvas:{scale:2,useCORS:true,backgroundColor:"#fff"}, jsPDF:{unit:"mm",format:"a4",orientation:"landscape"} }).from(view).save(); }
    catch(e) { console.error(e); alert("Xuất PDF không thành công."); }
    finally { document.body.classList.remove("pdf-exporting"); }
  }

  async function init() {
    try {
      await openDatabase();
      $("ngayChamCong").value = today();
      $("thangXem").value = monthOf(today());
      await updateDatalist();
      $("ngayChamCong").addEventListener("change", async () => {
        $("thangXem").value = monthOf($("ngayChamCong").value);
        await render();
      });
      $("thangXem").addEventListener("change", render);
      $("tenNhanVien").addEventListener("input", () => {
        activeName = "";
        $("bangChiTietWrap").hidden = true;
        $("bangLichSuWrap").hidden = true;
        $("bangTongKetNhat").hidden = true;
      });
      $("tenNhanVien").addEventListener("change", loadProfile);
      $("caLam").addEventListener("change", async () => {
        const p = await getOne(STORE_NHANVIEN, $("tenNhanVien").value.trim());
        if (p) $("giaCongNhat").value = giaCongTheoCa(p) || "0";
      });
      $("giaCongNhat").addEventListener("input", () => formatAmountInput($("giaCongNhat")));
      $("giaCongNhat").addEventListener("blur", () => formatAmountInput($("giaCongNhat")));
      $("giaCongNhat").addEventListener("change", async () => {
        const name = $("tenNhanVien").value.trim();
        const wage = parseAmount($("giaCongNhat").value);
        if (!name || !Number.isFinite(wage) || wage < 0) return;
        const profile = (await getOne(STORE_NHANVIEN, name)) || { name };
        profile.name = name;
        profile.wage = wage;
        profile.wageDay = wage;
        profile.wageNight = wage;
        await putOne(STORE_NHANVIEN, profile);
        showMessage(`Đã nhớ giá công nhật của ${name}.`);
      });
      // Tự thêm dấu phân cách hàng nghìn khi nhập tiền ứng.
      ["tamUng"].forEach((id) => {
        const input = $(id);
        input.addEventListener("input", () => formatAmountInput(input));
        input.addEventListener("blur", () => formatAmountInput(input));
      });
      $("btnLuu").addEventListener("click", saveWork);
      $("btnLamMoi").addEventListener("click", resetForm);
      $("btnLuuTamUng").addEventListener("click", saveAdvance);
      $("btnTaiLaiTheoTen").addEventListener("click", loadByNameMonth);
      $("btnXuatPDF").addEventListener("click", xuatPDF);
      $("tabChamNhat").addEventListener("click", () => switchMode("nhat"));
      $("tabChamKhoan").addEventListener("click", () => switchMode("khoan"));
      $("khoanNgay").value = today(); $("khoanThang").value = monthOf(today());
      $("khoanNgay").addEventListener("change", () => { $("khoanThang").value = monthOf($("khoanNgay").value); renderKhoan(); });
      $("khoanThang").addEventListener("change", renderKhoan);
      $("khoanNhanVien").addEventListener("input", () => {
        $("khoanBangChiTietWrap").hidden = true;
        $("khoanBangLichSuWrap").hidden = true;
        $("khoanBangTongKet").hidden = true;
      });
      $("khoanNhanVien").addEventListener("change", showKhoanForName);
      $("khoanNhanVien").addEventListener("blur", showKhoanForName);
      $("khoanTimSP").addEventListener("input", renderDanhSachKhoan);
      ["khoanTamUng"].forEach(id => { const input=$(id); input.addEventListener("input",()=>formatAmountInput(input)); input.addEventListener("blur",()=>formatAmountInput(input)); });
      $("btnThemKhoan").addEventListener("click", addKhoanRows);
      $("btnLuuKhoan").addEventListener("click", saveKhoanRows);
      $("btnTaiLaiKhoan").addEventListener("click", reloadKhoanRows);
      $("btnBoChonKhoan").addEventListener("click",()=>document.querySelectorAll(".chon-khoan-sp:checked").forEach(x=>x.checked=false));
      $("btnLuuKhoanTamUng").addEventListener("click", saveKhoanAdvance);
      $("btnLamMoiKhoan").addEventListener("click", resetKhoanForm);
      $("btnXuatPDFKhoan").addEventListener("click", xuatPDFKhoan);
      await loadDanhMucKhoan();

      // Lưu giá công trực tiếp từ bảng; giá nhật nhớ theo nhân viên/ca,
      // giá khoán nhớ theo sản phẩm.
      document.addEventListener("change", async (e) => {
        const workInput = e.target.closest("[data-work-wage]");
        const khoanInput = e.target.closest("[data-khoan-price]");
        try {
          if (workInput) {
            const id = workInput.dataset.workWage;
            const row = await getOne(STORE_CHAMCONG, id);
            const wage = parseAmount(workInput.value);
            if (!row || !Number.isFinite(wage) || wage < 0) {
              if (row) workInput.value = new Intl.NumberFormat("vi-VN").format(Number(row.wage)||0);
              return showMessage("Giá công không hợp lệ.", true);
            }
            row.wage = wage;
            row.amount = wage * Number(row.hours || 0);
            await putOne(STORE_CHAMCONG, row);
            const profile = (await getOne(STORE_NHANVIEN, row.name)) || { name: row.name };
            profile.wage = wage;
            profile.wageDay = wage;
            profile.wageNight = wage;
            await putOne(STORE_NHANVIEN, profile);
            if ($("tenNhanVien").value.trim() === row.name && $("caLam").value === row.shift) {
              $("giaCongNhat").value = new Intl.NumberFormat("vi-VN").format(wage);
            }
            await render();
            showMessage(`Đã lưu giá công của ${row.name}.`);
          }
          const khoanQtyInput = e.target.closest("[data-khoan-qty]");
          if (khoanInput || khoanQtyInput) {
            const id = khoanInput ? khoanInput.dataset.khoanPrice : khoanQtyInput.dataset.khoanQty;
            const row = await getOne(STORE_CHAMKHOAN, id);
            if (!row) return;
            const price = khoanInput ? parseAmount(khoanInput.value) : Number(row.donGia || 0);
            const qty = khoanQtyInput ? Number(khoanQtyInput.value) : Number(row.soLuong ?? 1);
            if (!Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty < 0) {
              if (khoanInput) khoanInput.value = new Intl.NumberFormat("vi-VN").format(Number(row.donGia)||0);
              if (khoanQtyInput) khoanQtyInput.value = String(Number(row.soLuong ?? 1));
              return showKhoanMessage("Số lượng hoặc giá công không hợp lệ.", true);
            }
            // Chỉ tính trước trên màn hình; nút LƯU CHẤM KHOÁN mới ghi vào IndexedDB.
            const tr = e.target.closest("tr");
            const totalCell = tr && tr.querySelector(".khoan-row-total");
            if (totalCell) {
              totalCell.textContent = money(price * qty);
              totalCell.dataset.amount = String(price * qty);
            }
            const totalPreview = [...document.querySelectorAll("#bangChamKhoan .khoan-row-total")]
              .reduce((sum, cell) => sum + Number(cell.dataset.amount ?? 0), 0);
            $("khoanTongTienCong").textContent = money(totalPreview);
            showKhoanMessage("Đã tính lại thành tiền. Bấm LƯU CHẤM KHOÁN để ghi thay đổi.");
          }
        } catch (err) { console.error(err); showMessage("Không lưu được giá công.", true); }
      });
      document.addEventListener("click", async (e) => {
        const wd = e.target.closest("[data-work-delete]");
        const ad = e.target.closest("[data-advance-delete]");
        const kd = e.target.closest("[data-khoan-delete]");
        if (wd) {
          if (confirm("Xóa dòng chấm công này?")) {
            await deleteOne(STORE_CHAMCONG, wd.dataset.workDelete);
            await render();
            showMessage("Đã xóa dòng chấm công.");
          }
        }
        if (kd) {
          if (confirm("Xóa dòng chấm khoán này?")) {
            await deleteOne(STORE_CHAMKHOAN, kd.dataset.khoanDelete);
            await renderKhoan(); showKhoanMessage("Đã xóa dòng chấm khoán.");
          }
        }
        if (ad) {
          if (confirm("Xóa lần ứng tiền này?")) {
            await deleteOne(STORE_LANUNG, ad.dataset.advanceDelete);
            await render();
            await renderKhoan();
            showMessage("Đã xóa lần ứng tiền.");
          }
        }
      });
      // Khi vừa mở web, ẩn toàn bộ bảng cho đến khi người dùng chọn tên nhân viên.
      $("bangChiTietWrap").hidden = true;
      $("bangLichSuWrap").hidden = true;
      $("bangTongKetNhat").hidden = true;
      $("khoanBangChiTietWrap").hidden = true;
      $("khoanBangLichSuWrap").hidden = true;
      $("khoanBangTongKet").hidden = true;
    } catch (e) {
      console.error(e);
      showMessage("Không khởi tạo được IndexedDB: " + (e.message || ""), true);
    }
  }
  document.addEventListener("DOMContentLoaded", init);
})();
