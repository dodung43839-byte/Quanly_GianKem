
document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // 1. HÀM ĐỌC VÀ ĐỊNH DẠNG TIỀN
    // =====================================================

    function docSoTien(giaTri) {
        if (giaTri === undefined || giaTri === null || giaTri === "") {
            return 0;
        }

        const chuoiSo = String(giaTri).replace(/[^\d-]/g, "");
        const so = Number(chuoiSo);

        return Number.isFinite(so) ? so : 0;
    }

    function dinhDangTien(giaTri) {
        return docSoTien(giaTri).toLocaleString("vi-VN");
    }

    // Định dạng số tiền khi nhập: 1500000 -> 1.500.000
    function dinhDangSoTienNhap(giaTri) {
        const chuoiSo = String(giaTri).replace(/\D/g, "");

        if (!chuoiSo) return "";

        return Number(chuoiSo).toLocaleString("vi-VN");
    }


    // =====================================================
    // 2. ĐỊNH DẠNG NGÀY THÁNG
    // =====================================================

  
function dinhDangNgay(ngay) {
    if (!ngay) return dinhDangNgay(new Date());

    let ngaySo, thangSo, namSo;

    if (ngay instanceof Date) {
        ngaySo = ngay.getDate();
        thangSo = ngay.getMonth() + 1;
        namSo = ngay.getFullYear();
    } else {
        const s = String(ngay).trim();

        // Dạng dd-mm-yyyy hoặc dd/mm/yyyy
        const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

        // Dạng yyyy-mm-dd
        const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

        if (m) {
            ngaySo = Number(m[1]);
            thangSo = Number(m[2]);
            namSo = Number(m[3]);
        } else if (iso) {
            namSo = Number(iso[1]);
            thangSo = Number(iso[2]);
            ngaySo = Number(iso[3]);
        } else {
            const d = new Date(s);
            if (isNaN(d.getTime())) return s;

            ngaySo = d.getDate();
            thangSo = d.getMonth() + 1;
            namSo = d.getFullYear();
        }
    }

    return `Ngày ${String(ngaySo).padStart(2, "0")} Tháng ${String(thangSo).padStart(2, "0")} Năm ${namSo}`;
}



    // =====================================================
    // 3. ĐỌC DỮ LIỆU TỪ MAIN.JS
    // =====================================================

    let duLieu = null;

    try {
        const duLieuLuu = sessionStorage.getItem("duLieuThanhToan");

        if (duLieuLuu) {
            duLieu = JSON.parse(duLieuLuu);
        }

    } catch (loi) {
        console.error("Lỗi đọc dữ liệu tạm ứng:", loi);
        alert("Không đọc được dữ liệu báo giá. Vui lòng quay lại và thử lại.");
    }


    // =====================================================
    // 4. HÀM ĐIỀN DỮ LIỆU VÀO INPUT
    // =====================================================

    function dienDuLieu(id, giaTri) {
        const o = document.getElementById(id);

        if (
            o &&
            giaTri !== undefined &&
            giaTri !== null &&
            String(giaTri).trim() !== ""
        ) {
            o.value = giaTri;
        }
    }


    // =====================================================
    // 5. ĐIỀN THÔNG TIN BÁO GIÁ VÀO PHIẾU
    // =====================================================

    if (duLieu) {

        dienDuLieu("soDonHang", duLieu.soDonHang);

        dienDuLieu(
            "kinhGui",
            duLieu.khachHang || duLieu.kinhGui
        );

        dienDuLieu("diaChi", duLieu.diaChi);

        const tongGiaTri =
            duLieu.tongGiaTri ??
            duLieu.tongThanhToan ??
            duLieu.tongTienHang;

        if (
            tongGiaTri !== undefined &&
            tongGiaTri !== null &&
            tongGiaTri !== ""
        ) {
            dienDuLieu("tongGiaTri", dinhDangTien(tongGiaTri));
        }

        if (duLieu.ngayLap) {
            dienDuLieu("ngayLap", dinhDangNgay(duLieu.ngayLap));
        }

        console.log("Đã nhận dữ liệu tạm ứng:", duLieu);

    } else {
        console.warn("Không tìm thấy sessionStorage 'duLieuThanhToan'.");
    }


    // =====================================================
    // 6. TỰ ĐIỀN NGÀY NẾU CÒN TRỐNG
    // =====================================================

    const ngayHienTai = dinhDangNgay(new Date());

    ["ngayBaoGia", "ngayHopDong", "ngayLap"].forEach(function (id) {

        const o = document.getElementById(id);

        if (o && !o.value) {
            o.value = ngayHienTai;
        }

    });


    // =====================================================
    // 7. ĐỌC SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT
    // =====================================================

    function docBaSo(so, docDayDu) {

        const chuSo = [
            "không", "một", "hai", "ba", "bốn",
            "năm", "sáu", "bảy", "tám", "chín"
        ];

        const tram = Math.floor(so / 100);
        const chuc = Math.floor((so % 100) / 10);
        const donVi = so % 10;

        let ketQua = "";

        if (docDayDu || tram > 0) {
            ketQua += chuSo[tram] + " trăm";
        }

        if (chuc > 1) {

            ketQua += (ketQua ? " " : "") + chuSo[chuc] + " mươi";

            if (donVi === 1) {
                ketQua += " mốt";
            } else if (donVi === 5) {
                ketQua += " lăm";
            } else if (donVi > 0) {
                ketQua += " " + chuSo[donVi];
            }

        } else if (chuc === 1) {

            ketQua += (ketQua ? " " : "") + "mười";

            if (donVi === 5) {
                ketQua += " lăm";
            } else if (donVi > 0) {
                ketQua += " " + chuSo[donVi];
            }

        } else if (donVi > 0) {

            if (tram > 0 || docDayDu) {
                ketQua += " lẻ";
            }

            ketQua += (ketQua ? " " : "") + chuSo[donVi];
        }

        return ketQua.trim();
    }


    function docSoTienBangChu(giaTri) {

        let so = Math.floor(docSoTien(giaTri));

        if (so < 0) return "Số tiền không hợp lệ";
        if (so === 0) return "Không đồng";

        const tenNhom = [
            "",
            "nghìn",
            "triệu",
            "tỷ",
            "nghìn tỷ",
            "triệu tỷ"
        ];

        const nhom = [];

        while (so > 0) {
            nhom.push(so % 1000);
            so = Math.floor(so / 1000);
        }

        if (nhom.length > tenNhom.length) {
            return "Số tiền vượt giới hạn đọc";
        }

        const cacPhan = [];

        for (let i = nhom.length - 1; i >= 0; i--) {

            if (nhom[i] === 0) continue;

            const docDayDu =
                i < nhom.length - 1 && nhom[i] < 100;

            const phanDoc = docBaSo(nhom[i], docDayDu);

            cacPhan.push(
                (phanDoc + " " + tenNhom[i]).trim()
            );
        }

        let ketQua = cacPhan.join(" ")
            .replace(/\s+/g, " ")
            .trim();

        ketQua = ketQua.charAt(0).toUpperCase() + ketQua.slice(1);

        return ketQua + " đồng";
    }


    // =====================================================
    // 8. TỰ ĐỘNG ĐỊNH DẠNG TIỀN TẠM ỨNG VÀ ĐỌC THÀNH CHỮ
    // =====================================================

    const oTienTamUng = document.getElementById("tienTamUng");
    const oTienBangChu = document.getElementById("tienBangChu");


    function capNhatTienBangChu() {

        if (!oTienTamUng || !oTienBangChu) return;

        const giaTri = oTienTamUng.value.trim();

        oTienBangChu.value = giaTri
            ? docSoTienBangChu(giaTri)
            : "";
    }


    if (oTienTamUng) {

        // Khi nhập tiền sẽ tự thêm dấu chấm hàng nghìn
        oTienTamUng.addEventListener("input", function () {

            const viTriCu = this.selectionStart ?? this.value.length;
            const doDaiCu = this.value.length;

            this.value = dinhDangSoTienNhap(this.value);

            const doDaiMoi = this.value.length;

            const viTriMoi = Math.max(
                0,
                Math.min(
                    this.value.length,
                    viTriCu + (doDaiMoi - doDaiCu)
                )
            );

            this.setSelectionRange(viTriMoi, viTriMoi);

            capNhatTienBangChu();
        });

        // Khi rời khỏi ô nhập
        oTienTamUng.addEventListener("change", function () {
            this.value = dinhDangSoTienNhap(this.value);
            capNhatTienBangChu();
        });

        // Định dạng giá trị có sẵn khi mở trang
        if (oTienTamUng.value.trim()) {
            oTienTamUng.value = dinhDangSoTienNhap(oTienTamUng.value);
            capNhatTienBangChu();
        }
    }


    // =====================================================
    // 9. KIỂM TRA ẢNH LOGO VÀ CON DẤU
    // =====================================================

    document.querySelectorAll(
        ".logo-placeholder img, .con-dau-top img"
    ).forEach(function (img) {

        img.addEventListener("error", function () {
            console.error(
                "Không tải được ảnh:",
                img.getAttribute("src")
            );
        });

    });


    // =====================================================
    // 10. XUẤT PHIẾU TẠM ỨNG RA PDF A4
    // =====================================================

    const nutXuatPDF = document.getElementById("btnXuatPDF");

    if (nutXuatPDF) {

        nutXuatPDF.addEventListener("click", async function () {

            const phieu = document.getElementById("phieuTamUng");

            if (!phieu) {
                alert("Không tìm thấy nội dung phiếu tạm ứng!");
                return;
            }

            if (typeof html2pdf === "undefined") {
                alert("Chưa tải được thư viện xuất PDF. Hãy kiểm tra kết nối Internet.");
                return;
            }

            const oSoDon = document.getElementById("soDonHang");

            const soDon = oSoDon
                ? oSoDon.value.trim()
                : "";

            const tenFile =
                "Tam_Ung_" + (soDon || "Moi") + ".pdf";


            // Chờ ảnh tải xong trước khi xuất PDF
            const danhSachAnh = Array.from(
                phieu.querySelectorAll("img")
            );

            await Promise.all(
                danhSachAnh.map(function (img) {

                    if (img.complete) {
                        return Promise.resolve();
                    }

                    return new Promise(function (resolve) {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });

                })
            );


            // CẤU HÌNH XUẤT PDF A4
            const tuyChon = {

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
                    logging: false,
                    scrollX: 0,
                    scrollY: 0
                },

                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                },

                pagebreak: {
                    mode: ["css", "legacy"]
                }

            };


            // BẮT ĐẦU XUẤT PDF
            nutXuatPDF.disabled = true;

            const nhanCu = nutXuatPDF.textContent;

            nutXuatPDF.textContent = "Đang tạo PDF...";


            try {

                // Chuyển phiếu sang bố cục dành riêng cho PDF
                phieu.classList.add("dang-xuat-pdf");

                await html2pdf()
                    .set(tuyChon)
                    .from(phieu)
                    .save();

            } catch (loi) {

                console.error("Lỗi xuất PDF:", loi);

                alert("Xuất PDF không thành công. Vui lòng thử lại.");

            } finally {

                // Khôi phục bố cục ban đầu
                phieu.classList.remove("dang-xuat-pdf");

                nutXuatPDF.disabled = false;
                nutXuatPDF.textContent = nhanCu;

            }

        });

    }

    console.log("Trang tạm ứng đã khởi tạo thành công.");
});
  
