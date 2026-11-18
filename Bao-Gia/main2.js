
// ==========================================
// MAIN2.JS
// XÓA DÒNG - XÓA HẾT - XUẤT PDF
// ==========================================


// ==========================================
// 1. NÚT XÓA DÒNG
// ==========================================

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


// ==========================================
// 2. NÚT XÓA HẾT
// ==========================================

if (typeof btnXoaHet !== "undefined" && btnXoaHet) {

    btnXoaHet.addEventListener("click", function () {

        if (bangHoaDon.children.length === 0) return;

        const xacNhan = confirm(
            "Bạn có chắc muốn xóa toàn bộ báo giá không?"
        );

        if (!xacNhan) return;

        bangHoaDon.innerHTML = "";
        dongDangChon = null;

        capNhatSTT();
        tinhTongTien();

    });

}


// ==========================================
// 3. NÚT XUẤT PDF
// ==========================================

if (typeof btnXuatPDF !== "undefined" && btnXuatPDF) {

    btnXuatPDF.addEventListener("click", async function () {

        if (typeof html2pdf !== "function") {

            alert(
                "Chưa tải được thư viện PDF. Hãy kiểm tra kết nối Internet."
            );

            return;
        }


        // ----------------------------------
        // TÌM CÁC VÙNG NỘI DUNG
        // ----------------------------------

        const vungBaoGia = document.querySelector(".right-panel");

        const trang1 = document.getElementById("printArea");

        const trang2 = document.querySelector(".terms-page");


        if (!vungBaoGia || !trang1 || !trang2) {

            alert(
                "Không tìm thấy nội dung báo giá hoặc trang điều kiện."
            );

            return;
        }


        // ----------------------------------
        // CẬP NHẬT NGÀY BÁO GIÁ
        // ----------------------------------

        if (typeof khoiTaoNgayBaoGia === "function") {
            khoiTaoNgayBaoGia();
        }


        // ----------------------------------
        // LƯU TRẠNG THÁI GIAO DIỆN BAN ĐẦU
        // ----------------------------------

        const styleCu = {
            trang1: trang1.getAttribute("style"),
            trang2: trang2.getAttribute("style"),
            vung: vungBaoGia.getAttribute("style")
        };


        // ----------------------------------
        // XÁC ĐỊNH TOÀN BỘ PHẦN CẦN ẨN
        // ----------------------------------

        const cacPhanAn = [
            ...document.querySelectorAll(
                ".button-group-title, " +
                ".buttons, " +
                ".action-buttons, " +
                ".data-buttons, " +
                "#hopDuLieuDaLuu"
            )
        ];


        // Lưu nguyên trạng style của từng phần tử
        const trangThaiAn = cacPhanAn.map(el => ({
            style: el.getAttribute("style")
        }));


        try {

            // ----------------------------------
            // ẨN TOÀN BỘ NÚT VÀ KHU VỰC CHỨC NĂNG
            // ----------------------------------

            cacPhanAn.forEach(el => {

                el.style.setProperty(
                    "display",
                    "none",
                    "important"
                );

                el.style.setProperty(
                    "visibility",
                    "hidden",
                    "important"
                );

            });


            // ----------------------------------
            // HIỆN TRANG 2 ĐỂ ĐƯA VÀO PDF
            // ----------------------------------

            trang2.style.display = "block";
            trang2.style.position = "relative";

            trang2.style.breakBefore = "page";
            trang2.style.pageBreakBefore = "always";


            // ----------------------------------
            // ĐƯA TRANG 1 VỀ BỐ CỤC BÌNH THƯỜNG
            // ----------------------------------

            trang1.style.position = "static";
            trang1.style.left = "auto";
            trang1.style.top = "auto";
            trang1.style.width = "100%";


            // ----------------------------------
            // KHUNG BÁO GIÁ
            // ----------------------------------

            vungBaoGia.style.width = "100%";
            vungBaoGia.style.margin = "0";
            vungBaoGia.style.padding = "0";


            // ----------------------------------
            // TẠO TÊN FILE PDF
            // ----------------------------------

            const soDonHang =
                document.getElementById("soDonHang")?.value.trim()
                || "BaoGia";

            const tenFile =
                "BaoGia_" +
                soDonHang.replace(/[\\/:*?"<>|]/g, "_") +
                ".pdf";


            // ----------------------------------
            // CẤU HÌNH XUẤT PDF
            // ----------------------------------

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


            // ----------------------------------
            // XUẤT PDF
            // ----------------------------------

            await html2pdf()

                .set(tuyChonPDF)

                .from(vungBaoGia)

                .save();


        } catch (loi) {

            console.error("Lỗi xuất PDF:", loi);

            alert(
                "Không thể xuất PDF. Vui lòng thử lại."
            );


        } finally {


            // ----------------------------------
            // KHÔI PHỤC TRANG 1
            // ----------------------------------

            if (styleCu.trang1 === null) {

                trang1.removeAttribute("style");

            } else {

                trang1.setAttribute("style", styleCu.trang1);

            }


            // ----------------------------------
            // KHÔI PHỤC TRANG 2
            // ----------------------------------

            if (styleCu.trang2 === null) {

                trang2.removeAttribute("style");

            } else {

                trang2.setAttribute("style", styleCu.trang2);

            }


            // ----------------------------------
            // KHÔI PHỤC KHUNG BÁO GIÁ
            // ----------------------------------

            if (styleCu.vung === null) {

                vungBaoGia.removeAttribute("style");

            } else {

                vungBaoGia.setAttribute("style", styleCu.vung);

            }


            // ----------------------------------
            // KHÔI PHỤC TOÀN BỘ NÚT CHỨC NĂNG
            // ----------------------------------

            cacPhanAn.forEach((el, i) => {

                const styleCuCuaNut = trangThaiAn[i].style;

                if (styleCuCuaNut === null) {

                    el.removeAttribute("style");

                } else {

                    el.setAttribute("style", styleCuCuaNut);

                }

            });

        }

    });

}


// ==========================================
// 4. TÍNH LẠI TỔNG TIỀN BAN ĐẦU
// ==========================================

tinhTongTien();
