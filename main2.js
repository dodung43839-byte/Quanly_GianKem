// ==========================================
// MAIN2.JS
// XÓA DÒNG - XÓA HẾT - XUẤT PDF
// ==========================================

// NÚT XÓA DÒNG
if (typeof btnXoa !== "undefined" && btnXoa) {
    btnXoa.addEventListener("click", function () {
        if (!dongDangChon) {
            alert("Bạn hãy chọn một dòng cần xóa.");
            return;
        }

        dongDangChon.remove();
        dongDangChon = null;
        capNhatSTT();
        tinhTongTien();
    });
}

// NÚT XÓA HẾT
if (typeof btnXoaHet !== "undefined" && btnXoaHet) {
    btnXoaHet.addEventListener("click", function () {
        if (bangHoaDon.children.length === 0) return;

        const xacNhan = confirm("Bạn có chắc muốn xóa toàn bộ báo giá không?");
        if (!xacNhan) return;

        bangHoaDon.innerHTML = "";
        dongDangChon = null;
        capNhatSTT();
        tinhTongTien();
    });
}

// NÚT XUẤT PDF

 // ==========================================
 // NÚT XUẤT PDF TRỰC TIẾP
 // ==========================================

if (typeof btnXuatPDF !== "undefined" && btnXuatPDF) {

    btnXuatPDF.addEventListener("click", async function () {

        if (typeof html2pdf !== "function") {
            alert("Chưa tải được thư viện PDF. Hãy kiểm tra kết nối Internet.");
            return;
        }

        const vungBaoGia = document.querySelector(".right-panel");
        const trang1 = document.getElementById("printArea");
        const trang2 = document.querySelector(".terms-page");

        if (!vungBaoGia || !trang1 || !trang2) {
            alert("Không tìm thấy nội dung báo giá hoặc trang điều kiện.");
            return;
        }

        // Cập nhật ngày báo giá
        if (typeof khoiTaoNgayBaoGia === "function") {
            khoiTaoNgayBaoGia();
        }

        // Lưu trạng thái giao diện cũ
        const styleCu = {
            trang1: trang1.getAttribute("style"),
            trang2: trang2.getAttribute("style"),
            vung: vungBaoGia.getAttribute("style")
        };

        const cacPhanAn = [
            ...vungBaoGia.querySelectorAll(".buttons, #hopDuLieuDaLuu")
        ];

        const trangThaiAn = cacPhanAn.map(el => el.style.display);

        try {

            // Hiện trang 2 để đưa vào PDF
            trang2.style.display = "block";
            trang2.style.position = "relative";
            trang2.style.breakBefore = "page";
            trang2.style.pageBreakBefore = "always";

            // Đưa trang 1 về luồng bố cục bình thường
            trang1.style.position = "static";
            trang1.style.left = "auto";
            trang1.style.top = "auto";
            trang1.style.width = "100%";

            // Khung báo giá
            vungBaoGia.style.width = "100%";
            vungBaoGia.style.margin = "0";
            vungBaoGia.style.padding = "0";

            // Ẩn nút và danh sách đã lưu khỏi PDF
            cacPhanAn.forEach(el => {
                el.style.display = "none";
            });

            const soDonHang =
                document.getElementById("soDonHang")?.value.trim()
                || "BaoGia";

            const tenFile = "BaoGia_" +
                soDonHang.replace(/[\\/:*?"<>|]/g, "_") + ".pdf";

            const tuyChonPDF = {
                margin: [8, 8, 8, 8],
                filename: tenFile,

                image: {
                    type: "jpeg",
                    quality: 0.98
                },

                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    scrollY: 0
                },

                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                },

                pagebreak: {
                    mode: ["css", "legacy"],
                    before: ".terms-page"
                }
            };

            await html2pdf()
                .set(tuyChonPDF)
                .from(vungBaoGia)
                .save();

        } catch (loi) {

            console.error("Lỗi xuất PDF:", loi);
            alert("Không thể xuất PDF. Vui lòng thử lại.");

        } finally {

            // Khôi phục giao diện ban đầu
            if (styleCu.trang1 === null) {
                trang1.removeAttribute("style");
            } else {
                trang1.setAttribute("style", styleCu.trang1);
            }

            if (styleCu.trang2 === null) {
                trang2.removeAttribute("style");
            } else {
                trang2.setAttribute("style", styleCu.trang2);
            }

            if (styleCu.vung === null) {
                vungBaoGia.removeAttribute("style");
            } else {
                vungBaoGia.setAttribute("style", styleCu.vung);
            }

            cacPhanAn.forEach((el, i) => {
                el.style.display = trangThaiAn[i];
            });
        }

    });
}


// TÍNH LẠI BAN ĐẦU
tinhTongTien();
