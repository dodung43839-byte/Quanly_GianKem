(() => {
  "use strict";

  const DB_NAME = "DONGDUONG_CHAMCONG_DB";
  const DB_VERSION = 2;
  const STORE_CHAMCONG = "chamCong";
  const STORE_TAMUNG = "tamUng"; // giữ kho cũ để không làm mất dữ liệu cũ
  const STORE_NHANVIEN = "nhanVien";
  const STORE_LANUNG = "lanUng";

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
    $("danhSachTen").innerHTML = list
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
      .map((x) => `<option value="${esc(x.name)}"></option>`)
      .join("");
  }
  function giaCongTheoCa(profile, shift) {
    if (!profile) return "";

    const value =
      shift === "Ca Đêm"
        ? (profile.wageNight ?? 0)
        : (profile.wageDay ?? profile.wage ?? 0);

    return value == null
      ? ""
      : new Intl.NumberFormat("vi-VN").format(Number(value));
  }

  async function loadProfile() {
    const n = $("tenNhanVien").value.trim();
    if (!n) return;

    const p = await getOne(STORE_NHANVIEN, n);

    if (p) {
      $("loaiTho").value = p.type || "Thợ Chính";
      $("giaCong").value = giaCongTheoCa(p, $("caLam").value);
    }
  }

  async function render() {
    const month = selectedMonth(),
      name = selectedName();
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
        <td>${esc(r.type)}</td><td>${esc(r.shift)}</td><td class="money">${money(r.wage)}</td>
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
      <tr><td>${i + 1}</td><td>${r.date.split("-").reverse().join("/")}</td><td>${esc(r.name)}</td>
      <td class="money">${money(r.amount)}</td><td>${esc(r.note || "")}</td>
      <td class="no-print"><button class="delete-row" data-advance-delete="${esc(r.id)}">Xóa</button></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="6" class="empty">Chưa có lần ứng tiền nào của nhân viên này trong tháng.</td></tr>';

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
    const wage = parseAmount($("giaCong").value),
      hours = Number($("soGioLam").value);
    if (!name) return showMessage("Bạn chưa nhập tên nhân viên.", true);
    if ($("giaCong").value === "" || !Number.isFinite(wage) || wage < 0)
      return showMessage("Giá công không hợp lệ.", true);
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

      activeName = name;
      $("thangXem").value = monthOf(date);
      editingId = null;
      $("btnLuu").textContent = "GHI CHẤM CÔNG & GHI THU TIỀN ";
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
      $("giaCong").value =
        profile.wage == null
          ? ""
          : new Intl.NumberFormat("vi-VN").format(Number(profile.wage));
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
    $("tenNhanVien").value = "";
    $("giaCong").value = "";
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
      $("tenNhanVien").addEventListener("change", loadProfile);
      //  Sua

      $("tenNhanVien").addEventListener("blur", loadProfile);
      $("caLam").addEventListener("change", loadProfile);
      // Tự thêm dấu phân cách hàng nghìn khi nhập giá công và tiền ứng.
      ["giaCong", "tamUng"].forEach((id) => {
        const input = $(id);
        input.addEventListener("input", () => formatAmountInput(input));
        input.addEventListener("blur", () => formatAmountInput(input));
      });
      $("btnLuu").addEventListener("click", saveWork);
      $("btnLamMoi").addEventListener("click", resetForm);
      $("btnLuuTamUng").addEventListener("click", saveAdvance);
      $("btnTaiLaiTheoTen").addEventListener("click", loadByNameMonth);
      $("btnXuatPDF").addEventListener("click", xuatPDF);

      document.addEventListener("click", async (e) => {
        const wd = e.target.closest("[data-work-delete]");
        const ad = e.target.closest("[data-advance-delete]");
        if (wd) {
          if (confirm("Xóa dòng chấm công này?")) {
            await deleteOne(STORE_CHAMCONG, wd.dataset.workDelete);
            await render();
            showMessage("Đã xóa dòng chấm công.");
          }
        }
        if (ad) {
          if (confirm("Xóa lần ứng tiền này?")) {
            await deleteOne(STORE_LANUNG, ad.dataset.advanceDelete);
            await render();
            showMessage("Đã xóa lần ứng tiền.");
          }
        }
      });
      // Gắn sự kiện trước, sau đó mới dựng bảng để lỗi hiển thị không làm mất chức năng nút.
      await render();
      // Khi mở trang, mặc định chưa khóa theo tên: sau khi lưu hoặc tải sẽ lọc theo nhân viên đó.
    } catch (e) {
      console.error(e);
      showMessage("Không khởi tạo được IndexedDB: " + (e.message || ""), true);
    }
  }
  document.addEventListener("DOMContentLoaded", init);
})();
