(() => {
  "use strict";

  const DB_NAME = "QUAN_LY_KHACH_HANG_DB";
  const DB_VERSION = 1;
  const STORE_NAME = "khachHang";

  const $ = (id) => document.getElementById(id);
  const form = $("customerForm");

  const fields = {
    id: $("customerId"),
    name: $("customerName"),
    address: $("customerAddress"),
    phone: $("customerPhone"),
    group: $("customerGroup"),
    need: $("customerNeed"),
    message: $("customerMessage"),
    reminderDate: $("reminderDate"),
  };

  let db = null;
  let visibleCustomers = [];
  let selectedCustomerId = "";
  let toastTimer = null;

  function notify(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("Trình duyệt này không hỗ trợ IndexedDB."));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("group", "group", { unique: false });
          store.createIndex("name", "name", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("Không mở được cơ sở dữ liệu."));
    });
  }

  function store(mode = "readonly") {
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  function getAllCustomers() {
    return new Promise((resolve, reject) => {
      const request = store().getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function saveCustomer(customer) {
    return new Promise((resolve, reject) => {
      const request = store("readwrite").put(customer);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function deleteCustomer(id) {
    return new Promise((resolve, reject) => {
      const request = store("readwrite").delete(Number(id));
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  }


  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[char],
    );
  }

  function cleanPhone(phone) {
    return String(phone || "")
      .trim()
      .replace(/[^\d+]/g, "");
  }

  function phoneForLink(phone) {
    return cleanPhone(phone).replace(/^\+/, "");
  }

  // Xuất danh bạ theo định dạng vCard 3.0, tương thích phổ biến với iPhone và Android.
  function escapeVCard(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/\r\n|\n|\r/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  function makeVCard(customer) {
    const name = escapeVCard(customer.name || "Khách hàng");
    const phone = cleanPhone(customer.phone);
    const address = escapeVCard(customer.address || "");
    const group = escapeVCard(customer.group || "");
    const need = escapeVCard(customer.need || "");
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${name}`,
      `N:${name};;;;`,
      `TEL;TYPE=CELL:${phone}`,
    ];
    if (address) lines.push(`ADR;TYPE=WORK:;;${address};;;;`);
    if (group || need)
      lines.push(`NOTE:${[group, need].filter(Boolean).join(" - ")}`);
    lines.push("END:VCARD");
    return lines.join("\r\n");
  }

  function downloadContactsVcf(customers) {
    if (!customers.length) {
      notify("Không có khách hàng trong nhóm đang chọn để xuất.");
      return;
    }
    const vcardText = customers.map(makeVCard).join("\r\n");
    const blob = new Blob(["\uFEFF", vcardText], {
      type: "text/vcard;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filter = $("groupFilter").value;
    const safeGroup =
      filter === "ALL"
        ? "tat-ca-khach-hang"
        : filter
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    link.href = url;
    link.download = `danh-ba-${safeGroup || "khach-hang"}.vcf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify(
      `Đã tạo file danh bạ gồm ${customers.length} liên hệ. Mở file để nhập vào Danh bạ.`,
    );
  }

  function resetForm() {
    form.reset();
    fields.id.value = "";
    $("saveBtn").textContent = "Lưu khách hàng";
  }

  function getFormData() {
    return {
      name: fields.name.value.trim(),
      address: fields.address.value.trim(),
      phone: fields.phone.value.trim(),
      group: fields.group.value,
      need: fields.need.value,
      message: fields.message.value.trim(),
      reminderDate: fields.reminderDate.value,
      updatedAt: new Date().toISOString(),
    };
  }
  async function checkReminders() {
    const all = await getAllCustomers();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueCustomers = all.filter((customer) => {
      if (!customer.reminderDate) return false;

      const reminder = new Date(customer.reminderDate + "T00:00:00");
      const daysPassed = Math.floor((today - reminder) / (24 * 60 * 60 * 1000));

      return daysPassed >= 0 && daysPassed <= 1;
    });

    const reminderList = $("reminderList");
    reminderList.replaceChildren();

    if (dueCustomers.length === 0) {
      reminderList.textContent = "Chưa có khách hàng đến hẹn.";
      return;
    }

    dueCustomers.forEach((customer) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "reminder-item";
      item.dataset.reminderCustomerId = String(customer.id);

      const name = document.createElement("strong");
      name.textContent = customer.name || "Chưa có tên";

      const phone = document.createElement("span");
      phone.textContent = "SĐT: " + (customer.phone || "Chưa có");

      const date = document.createElement("span");
      date.textContent = "Ngày hẹn: " + customer.reminderDate;

      item.append(name, phone, date);
      reminderList.appendChild(item);
    });
  }

  async function refreshList() {
    const selectedBefore = selectedCustomerId;
    const filter = $("groupFilter").value;
    const all = await getAllCustomers();
    visibleCustomers = all
      .filter((customer) => filter === "ALL" || customer.group === filter)
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));

    const list = $("customerList");
    list.replaceChildren();

    if (!visibleCustomers.length) {
      selectedCustomerId = "";
      const empty = document.createElement("div");
      empty.className = "list-empty";
      empty.textContent =
        filter === "ALL" ? "Chưa có khách hàng" : "Nhóm này chưa có khách hàng";
      list.appendChild(empty);
      showDetails(null);
    } else {
      const stillExists = visibleCustomers.some(
        (customer) => String(customer.id) === selectedBefore,
      );
      selectedCustomerId = stillExists
        ? selectedBefore
        : String(visibleCustomers[0].id);

      visibleCustomers.forEach((customer) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className =
          "customer-list-item" +
          (String(customer.id) === selectedCustomerId ? " selected" : "");
        item.dataset.customerId = String(customer.id);
        item.setAttribute("role", "option");
        item.setAttribute(
          "aria-selected",
          String(String(customer.id) === selectedCustomerId),
        );

        const name = document.createElement("span");
        name.className = "customer-list-name";
        name.textContent = customer.name || "Chưa có tên";

        const phone = document.createElement("span");
        phone.className = "customer-list-phone";
        phone.textContent = customer.phone || "Chưa có số điện thoại";

        item.append(name, phone);
        list.appendChild(item);
      });
      showSelectedCustomer();
    }

    $("customerCount").textContent = `${visibleCustomers.length} khách hàng`;
  }

  async function copyText(value) {
    const text = String(value ?? "");
    if (!text) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // Thử phương án tương thích với một số trình duyệt cũ bên dưới.
    }

    try {
      const temporary = document.createElement("textarea");
      temporary.value = text;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.appendChild(temporary);
      temporary.select();
      const copied = document.execCommand("copy");
      temporary.remove();
      return copied;
    } catch (error) {
      return false;
    }
  }

  function showDetails(customer) {
    const box = $("customerDetails");
    if (!customer) {
      box.className = "customer-details empty";
      box.textContent = "Chưa chọn khách hàng.";
      return;
    }

    const phone = escapeHtml(customer.phone);
    const tel = encodeURIComponent(cleanPhone(customer.phone));
    const zaloPhone = encodeURIComponent(phoneForLink(customer.phone));
    box.className = "customer-details";
    box.innerHTML = `
      <div class="detail-name">${escapeHtml(customer.name)}</div>
      <div class="detail-line"><strong>Địa chỉ:</strong> ${escapeHtml(customer.address || "Chưa nhập")}</div>
      <div class="detail-line"><strong>Điện thoại:</strong> ${phone}</div>
      <div class="detail-line"><strong>Nhóm:</strong> ${escapeHtml(customer.group)}</div>
      <div class="detail-line"><strong>Nhu cầu:</strong> ${escapeHtml(customer.need)}</div>
      <div class="detail-line"><strong>Nội dung trao đổi:</strong><br>${escapeHtml(customer.message || "Chưa có").replace(/\n/g, "<br>")}</div>
      <div class="detail-actions">
        <button class="copy-btn" type="button" data-copy-phone>📋 Sao chép SĐT</button>
        <button class="zalo-btn" type="button" data-open-zalo>💬 Mở Zalo</button>
        <button class="copy-message-btn" type="button" data-copy-message>📝 Sao chép tin nhắn</button>
        <button class="btn danger-outline" type="button" data-delete-selected>🗑️ Xóa khách đang chọn</button>
        <div class="detail-file-call-row" style="display:flex !important; flex-direction:row !important; flex-wrap:nowrap !important; gap:8px; width:100%; grid-column:1 / -1; align-items:stretch; box-sizing:border-box;">
          <button class="zalo-btn" type="button" data-send-customer-images style="display:block; flex:1 1 0; width:50%; min-width:0; box-sizing:border-box;">🖼️ Chọn gửi ảnh Sản Phẩm</button>
          <a class="call-btn" href="tel:${tel}" style="display:block; flex:1 1 0; width:50%; min-width:0; box-sizing:border-box; text-align:center;">📞 Gọi điện</a>
        </div>
        <button class="zalo-btn" type="button" data-share-selected-images hidden style="display:none; width:100%; box-sizing:border-box;">📤 Gửi ảnh đã chọn qua Zalo</button>
      </div>`;

    box
      .querySelector("[data-copy-phone]")
      .addEventListener("click", async () => {
        const copied = await copyText(customer.phone);
        notify(
          copied
            ? "Đã sao chép số điện thoại."
            : "Không sao chép được số điện thoại.",
        );
      });

    box.querySelector("[data-open-zalo]").addEventListener("click", () => {
      const phoneNumber = phoneForLink(customer.phone);
      if (!phoneNumber)
        return notify("Khách hàng chưa có số điện thoại hợp lệ.");
      window.open(
        `https://zalo.me/${encodeURIComponent(phoneNumber)}`,
        "_blank",
        "noopener,noreferrer",
      );
      notify("Đã yêu cầu mở Zalo theo số điện thoại khách hàng.");
    });

    box
      .querySelector("[data-copy-message]")
      .addEventListener("click", async () => {
        const message = String(customer.message || "").trim();
        if (!message)
          return notify(
            "Khách hàng chưa có nội dung tin nhắn. Hãy nhập và lưu ở biểu mẫu phía trên.",
          );
        const copied = await copyText(message);
        notify(
          copied
            ? "Đã sao chép tin nhắn. Bạn có thể dán vào Zalo."
            : "Không sao chép được. Hãy kiểm tra quyền clipboard của trình duyệt.",
        );
      });
  }

  function showSelectedCustomer() {
    const id = selectedCustomerId;
    const customer = visibleCustomers.find((item) => String(item.id) === id);
    showDetails(customer || null);
  }

  function loadIntoForm() {
    const id = selectedCustomerId;
    const customer = visibleCustomers.find((item) => String(item.id) === id);
    if (!customer) {
      notify("Bạn hãy chọn một khách hàng trước.");
      return;
    }
    fields.id.value = customer.id;
    fields.name.value = customer.name || "";
    fields.address.value = customer.address || "";
    fields.phone.value = customer.phone || "";
    fields.group.value = customer.group || "Khác";
    fields.need.value = customer.need || "Chưa xác định";
    fields.message.value = customer.message || "";
    fields.reminderDate.value = customer.reminderDate || "";
    $("saveBtn").textContent = "Cập nhật khách hàng";
    window.scrollTo({ top: 0, behavior: "smooth" });
    fields.name.focus();
  }


  // Chọn ảnh trước, sau đó người dùng bấm nút Gửi ảnh.
  // navigator.share() được gọi trực tiếp trong thao tác bấm nút để đáp ứng yêu cầu user gesture.
  const imagePicker = $("chonAnhZalo");
  let pendingImageCustomerId = "";
  let selectedImageFiles = [];

  if (imagePicker) {
    imagePicker.addEventListener("change", () => {
      const images = Array.from(imagePicker.files || []).filter(
        (file) => file && file.type && file.type.startsWith("image/")
      );

      if (!images.length) {
        selectedImageFiles = [];
        pendingImageCustomerId = "";
        notify("Chưa chọn ảnh. Bạn có thể bỏ qua, chương trình vẫn hoạt động bình thường.");
        return;
      }

      const customer = visibleCustomers.find(
        (item) => String(item.id) === selectedCustomerId
      );
      if (!customer) {
        selectedImageFiles = [];
        pendingImageCustomerId = "";
        notify("Không xác định được khách hàng đang chọn. Đã bỏ qua.");
        imagePicker.value = "";
        return;
      }

      selectedImageFiles = images;
      pendingImageCustomerId = String(customer.id);

      const sendButton = $("customerDetails").querySelector("[data-share-selected-images]");
      if (sendButton) {
        sendButton.hidden = false;
        sendButton.style.display = "block";
        sendButton.textContent = `📤 Gửi ${images.length} ảnh qua Zalo`;
      }
      notify(`Đã chọn ${images.length} ảnh cho ${customer.name || "khách hàng"}. Bấm nút Gửi ảnh qua Zalo.`);
      // Cho phép chọn lại đúng những ảnh đó ở lần tiếp theo.
      imagePicker.value = "";
    });
  }

  $("customerDetails").addEventListener("click", (event) => {
    const button = event.target.closest("[data-send-customer-images]");
    if (!button) return;

    const customer = visibleCustomers.find(
      (item) => String(item.id) === selectedCustomerId
    );
    if (!customer) {
      notify("Bạn hãy chọn khách hàng trước.");
      return;
    }
    if (!imagePicker) {
      notify("Không tìm thấy bộ chọn ảnh. Bỏ qua, chương trình vẫn hoạt động bình thường.");
      return;
    }

    // Bỏ trạng thái cũ khi đổi khách hàng để tránh gửi nhầm ảnh.
    selectedImageFiles = [];
    pendingImageCustomerId = String(customer.id);
    const sendButton = $("customerDetails").querySelector("[data-share-selected-images]");
    if (sendButton) {
      sendButton.hidden = true;
      sendButton.style.display = "none";
    }

    try {
      imagePicker.value = "";
      imagePicker.click();
    } catch (error) {
      console.warn("Không mở được bộ sưu tập ảnh:", error);
      pendingImageCustomerId = "";
      notify("Không mở được bộ sưu tập ảnh. Bỏ qua, chương trình vẫn hoạt động bình thường.");
    }
  });

  $("customerDetails").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-share-selected-images]");
    if (!button) return;

    const customer = visibleCustomers.find(
      (item) => String(item.id) === selectedCustomerId
    );
    if (!customer || String(customer.id) !== pendingImageCustomerId) {
      notify("Khách hàng đã thay đổi. Hãy chọn ảnh lại cho đúng khách hàng.");
      selectedImageFiles = [];
      pendingImageCustomerId = "";
      button.hidden = true;
      button.style.display = "none";
      return;
    }

    if (!selectedImageFiles.length) {
      notify("Bạn chưa chọn ảnh.");
      return;
    }

    if (
      typeof navigator.share !== "function" ||
      typeof navigator.canShare !== "function" ||
      !navigator.canShare({ files: selectedImageFiles })
    ) {
      notify("Trình duyệt hoặc điện thoại không hỗ trợ chia sẻ ảnh. Bạn có thể bỏ qua; chương trình vẫn hoạt động bình thường.");
      return;
    }

    const imagesToShare = selectedImageFiles.slice();
    const customerLabel = `${customer.name || "Khách hàng"}${customer.phone ? " - " + customer.phone : ""}`;

    try {
      // Lệnh chia sẻ chạy trực tiếp trong lần chạm nút này.
      await navigator.share({
        files: imagesToShare,
        title: `Ảnh gửi ${customer.name || "khách hàng"}`,
        text: `Ảnh gửi khách hàng: ${customerLabel}`
      });
      notify("Đã mở bảng chia sẻ. Hãy chọn Zalo, kiểm tra đúng khách hàng rồi xác nhận gửi.");
      selectedImageFiles = [];
      pendingImageCustomerId = "";
      button.hidden = true;
      button.style.display = "none";
    } catch (error) {
      if (error && error.name === "AbortError") {
        notify("Bạn đã đóng bảng chia sẻ. Ảnh vẫn được giữ lại để thử gửi lại.");
      } else {
        console.warn("Chia sẻ ảnh không thành công:", error);
        notify("Không chia sẻ được ảnh. Ảnh vẫn được giữ lại để thử lại; chương trình vẫn hoạt động bình thường.");
      }
    }
  });

  $("customerDetails").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-selected]");
    if (!button) return;

    const id = selectedCustomerId;
    const customer = visibleCustomers.find((item) => String(item.id) === id);
    if (!customer) return notify("Bạn hãy chọn khách hàng cần xóa.");
    if (!confirm(`Bạn có chắc muốn xóa khách hàng "${customer.name}"?`)) return;

    try {
      await deleteCustomer(id);
      resetForm();
      await refreshList();
      notify("Đã xóa khách hàng.");
    } catch (error) {
      console.error(error);
      notify("Không xóa được dữ liệu.");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = getFormData();
    if (!data.name || !data.phone) {
      notify("Vui lòng nhập tên và số điện thoại.");
      return;
    }
    const normalizedPhone = cleanPhone(data.phone);
    if (normalizedPhone.replace(/\D/g, "").length < 8) {
      notify("Số điện thoại có vẻ chưa đúng. Vui lòng kiểm tra lại.");
      fields.phone.focus();
      return;
    }
    if (fields.id.value) data.id = Number(fields.id.value);
    try {
      await saveCustomer(data);
      resetForm();
      await refreshList();
      notify(data.id ? "Đã cập nhật khách hàng." : "Đã lưu khách hàng.");
    } catch (error) {
      console.error(error);
      notify("Không lưu được dữ liệu. Vui lòng thử lại.");
    }
  });

  $("newBtn").addEventListener("click", resetForm);
  $("loadBtn").addEventListener("click", async () => {
    await refreshList();
    notify("Đã tải danh sách theo nhóm.");
  });
  $("exportContactsBtn").addEventListener("click", async () => {
    try {
      const all = await getAllCustomers();
      const filter = $("groupFilter").value;
      const filtered = all.filter(
        (customer) => filter === "ALL" || customer.group === filter,
      );
      downloadContactsVcf(filtered);
    } catch (error) {
      console.error(error);
      notify("Không thể tạo file danh bạ. Vui lòng thử lại.");
    }
  });
  $("groupFilter").addEventListener("change", refreshList);
  $("customerList").addEventListener("click", (event) => {
    const item = event.target.closest("[data-customer-id]");
    if (!item) return;
    selectedCustomerId = item.dataset.customerId;
    $("customerList")
      .querySelectorAll(".customer-list-item")
      .forEach((row) => {
        const selected = row.dataset.customerId === selectedCustomerId;
        row.classList.toggle("selected", selected);
        row.setAttribute("aria-selected", String(selected));
      });
    showSelectedCustomer();
  });

  $("reminderList").addEventListener("click", async (event) => {
    const item = event.target.closest("[data-reminder-customer-id]");
    if (!item) return;

    const customerId = item.dataset.reminderCustomerId;
    const all = await getAllCustomers();
    const customer = all.find((c) => String(c.id) === customerId);

    if (!customer) return;

    $("groupFilter").value = customer.group;
    selectedCustomerId = customerId;

    await refreshList();

    $("customerDetails").scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

  $("editBtn").addEventListener("click", loadIntoForm);



  (async function init() {
    try {
      db = await openDatabase();
      await refreshList();
      await checkReminders();
    } catch (error) {
      console.error(error);
      notify(error.message || "Không khởi tạo được cơ sở dữ liệu.");
    }
  })();
})();
