// ==========================================
// LẤY CÁC ĐỐI TƯỢNG HTML
// ==========================================

const txtTimKiem = document.getElementById("txtTimKiem");
const listbox = document.getElementById("listbox");
const bangHoaDon = document.querySelector("#bangHoaDon tbody");

const btnXoa = document.getElementById("btnXoa");
const btnXoaHet = document.getElementById("btnXoaHet");
const btnLuu = document.getElementById("btnLuu");
const btnXuatPDF = document.getElementById("btnXuatPDF");


// ==========================================
// BIẾN DỮ LIỆU
// ==========================================

let duLieuNguon = [];
let duLieuDVT = [];

let dongDangChon = null;


// ==========================================
// HÀM ĐỊNH DẠNG SỐ
// ==========================================

// Làm tròn + phân cách hàng nghìn
function dinhDangSo(so) {

    so = Number(so) || 0;

    so = Math.round(so);

    return so.toLocaleString("vi-VN");
}


// ==========================================
// HÀM LẤY SỐ TỪ CHUỖI
// ==========================================

function laySo(chuoi) {

    if (chuoi === null || chuoi === undefined) {
        return 0;
    }

    return Number(
        String(chuoi).replace(/[^\d-]/g, "")
    ) || 0;
}


// ==========================================
// ĐỌC Nguon.json + DVT.json
// ==========================================

Promise.all([

    fetch("Nguon.json")
        .then(function(response) {

            if (!response.ok) {
                throw new Error("Không đọc được Nguon.json");
            }

            return response.json();

        }),

    fetch("DVT.json")
        .then(function(response) {

            if (!response.ok) {
                throw new Error("Không đọc được DVT.json");
            }

            return response.json();

        })

])

.then(function(duLieu) {

    // Dữ liệu hàng
    duLieuNguon = duLieu[0];

    // Dữ liệu đơn vị tính + giá
    duLieuDVT = duLieu[1];

    // Hiển thị Listbox
    hienThiListbox();

    
})

.catch(function(loi) {

    console.error(loi);

    listbox.innerHTML =
        "Không đọc được dữ liệu JSON";

});


// ==========================================
// HIỂN THỊ LISTBOX
// ==========================================

function hienThiListbox() {

    listbox.innerHTML = "";


    duLieuNguon.forEach(function(hang) {

        const dong =
            document.createElement("div");


        dong.className = "hang";


        // Hiển thị tên hàng
        dong.textContent =
            hang.TenHang;


        // Lưu mã sản phẩm
        dong.dataset.maSP =
            hang.MaSP;


        // ==================================
        // CLICK LISTBOX
        // ==================================

        dong.addEventListener("click", function() {

            const maSP =
                this.dataset.maSP;


            themHangVaoHoaDon(maSP);

        });


        listbox.appendChild(dong);

    });

}


// ==========================================
// TÌM KIẾM HÀNG
// ==========================================

txtTimKiem.addEventListener("input", function() {

    const tuKhoa =
        this.value
            .toLowerCase()
            .trim();


    const cacHang =
        document.querySelectorAll(".hang");


    cacHang.forEach(function(hang) {

        const tenHang =
            hang.textContent.toLowerCase();


        if (tenHang.includes(tuKhoa)) {

            hang.style.display = "";

        } else {

            hang.style.display = "none";

        }

    });

});


// ==========================================
// THÊM HÀNG VÀO BẢNG
// ==========================================

function themHangVaoHoaDon(maSP) {


    // --------------------------------------
    // TÌM HÀNG TRONG Nguon.json
    // --------------------------------------

    const hangNguon =
        duLieuNguon.find(function(hang) {

            return hang.MaSP === maSP;

        });


    if (!hangNguon) {

        alert(
            "Không tìm thấy mã hàng: " + maSP
        );

        return;
    }


    // --------------------------------------
    // KIỂM TRA HÀNG ĐÃ CÓ CHƯA
    // --------------------------------------

    const cacDong =
        bangHoaDon.querySelectorAll("tr");


    let dongDaCo = null;


    cacDong.forEach(function(dong) {

        const maTrongBang =
            dong.cells[1].textContent.trim();


        if (maTrongBang === maSP) {

            dongDaCo = dong;

        }

    });


    // ======================================
    // NẾU ĐÃ CÓ
    // CHỈ TĂNG SỐ LƯỢNG +1
    // ======================================

    if (dongDaCo) {

        const inputSoLuong =
            dongDaCo.cells[5]
                .querySelector("input");


        let soLuong =
            Number(inputSoLuong.value) || 0;


        inputSoLuong.value =
            soLuong + 1;


        dongDangChon = dongDaCo;


        chonDong(dongDaCo);


        tinhThanhTienDong(dongDaCo);


        return;
    }


    // ======================================
    // HÀNG CHƯA CÓ
    // TẠO DÒNG MỚI
    // ======================================

    const tenHang =
        hangNguon.TenHang;


    // --------------------------------------
    // LẤY DANH SÁCH ĐVT
    // --------------------------------------

    const danhSachDVT =
        duLieuDVT.filter(function(dvt) {

            return dvt.MaSP === maSP;

        });


    // --------------------------------------
    // TẠO DÒNG
    // --------------------------------------

    const dong =
        document.createElement("tr");


    // ======================================
    // CỘT 1 - STT
    // ======================================

    const oSTT =
        document.createElement("td");

    dong.appendChild(oSTT);


    // ======================================
    // CỘT 2 - MÃ HÀNG
    // ======================================

    const oMaSP =
        document.createElement("td");

    oMaSP.textContent =
        maSP;

    dong.appendChild(oMaSP);


    // ======================================
    // CỘT 3 - TÊN HÀNG
    // ======================================

    const oTenHang =
        document.createElement("td");


    const inputTenHang =
        document.createElement("input");


    inputTenHang.type = "text";

    inputTenHang.value =
        tenHang;


    inputTenHang.style.width = "100%";

    inputTenHang.style.boxSizing =
        "border-box";


    oTenHang.appendChild(inputTenHang);

    dong.appendChild(oTenHang);


    // ======================================
    // CỘT 4 - ĐVT
    // ======================================

    const oDVT =
        document.createElement("td");


    const selectDVT =
        document.createElement("select");


    selectDVT.style.width = "100%";


    // --------------------------------------
    // THÊM CÁC ĐVT
    // --------------------------------------

    danhSachDVT.forEach(function(dvt) {

        const option =
            document.createElement("option");


        option.value =
            dvt.DonViTinh;


        option.textContent =
            dvt.DonViTinh;


        selectDVT.appendChild(option);

    });


    oDVT.appendChild(selectDVT);

    dong.appendChild(oDVT);


    // ======================================
    // CỘT 5 - ĐƠN GIÁ
    // ======================================

    const oDonGia =
        document.createElement("td");


    const inputDonGia =
        document.createElement("input");


    inputDonGia.type = "text";

    inputDonGia.inputMode = "numeric";


    inputDonGia.style.width = "100%";

    inputDonGia.style.boxSizing =
        "border-box";

    inputDonGia.style.textAlign =
        "right";


    // --------------------------------------
    // LẤY GIÁ GIASX
    // CỦA ĐVT ĐẦU TIÊN
    // --------------------------------------

    if (danhSachDVT.length > 0) {

        const dvtDauTien =
            danhSachDVT[0];


        inputDonGia.value =
            dinhDangSo(
                dvtDauTien.GiaSX
            );

    } else {

        inputDonGia.value = "0";

    }


    oDonGia.appendChild(inputDonGia);

    dong.appendChild(oDonGia);


    // ======================================
    // CỘT 6 - SỐ LƯỢNG
    // ======================================

    const oSoLuong =
        document.createElement("td");


    const inputSoLuong =
        document.createElement("input");


    inputSoLuong.type = "number";

    inputSoLuong.value = 1;

    inputSoLuong.min = 0;

    inputSoLuong.step = "1";


    inputSoLuong.style.width = "100%";

    inputSoLuong.style.boxSizing =
        "border-box";

    inputSoLuong.style.textAlign =
        "right";


    oSoLuong.appendChild(inputSoLuong);

    dong.appendChild(oSoLuong);


    // ======================================
    // CỘT 7 - THÀNH TIỀN
    // ======================================

    const oThanhTien =
        document.createElement("td");


    const spanThanhTien =
        document.createElement("span");


    spanThanhTien.textContent =
        "0";


    oThanhTien.appendChild(
        spanThanhTien
    );


    dong.appendChild(oThanhTien);


    // ======================================
    // ĐỔI ĐƠN GIÁ
    // ======================================

    inputDonGia.addEventListener(
        "input",
        function() {

            let gia =
                laySo(this.value);


            this.value =
                dinhDangSo(gia);


            tinhThanhTienDong(dong);

        }
    );


    // ======================================
    // ĐỔI SỐ LƯỢNG
    // ======================================

    inputSoLuong.addEventListener(
        "input",
        function() {

            tinhThanhTienDong(dong);

        }
    );


    // ======================================
    // ĐỔI ĐVT
    // ======================================

    selectDVT.addEventListener(
        "change",
        function() {

            const dvtDuocChon =
                danhSachDVT.find(function(dvt) {

                    return dvt.DonViTinh ===
                        selectDVT.value;

                });


            if (dvtDuocChon) {

                inputDonGia.value =
                    dinhDangSo(
                        dvtDuocChon.GiaSX
                    );

            }


            tinhThanhTienDong(dong);

        }
    );


    // ======================================
    // CLICK CHỌN DÒNG
    // ======================================

    dong.addEventListener(
        "click",
        function() {

            chonDong(dong);

        }
    );


    // ======================================
    // THÊM VÀO BẢNG
    // ======================================

    bangHoaDon.appendChild(dong);


    // Cập nhật STT
    capNhatSTT();


    // Chọn dòng vừa thêm
    chonDong(dong);


    // Tính tiền
    tinhThanhTienDong(dong);

}


// ==========================================
// CHỌN DÒNG
// ==========================================

function chonDong(dong) {

    // Bỏ chọn tất cả
    const cacDong =
        bangHoaDon.querySelectorAll("tr");


    cacDong.forEach(function(item) {

        item.classList.remove(
            "dong-duoc-chon"
        );

    });


    // Chọn dòng hiện tại
    dong.classList.add(
        "dong-duoc-chon"
    );


    dongDangChon = dong;

}


// ==========================================
// CẬP NHẬT STT
// ==========================================

function capNhatSTT() {

    const cacDong =
        bangHoaDon.querySelectorAll("tr");


    cacDong.forEach(function(dong, index) {

        dong.cells[0].textContent =
            index + 1;

    });

}


// ==========================================
// TÍNH THÀNH TIỀN MỘT DÒNG
// ==========================================

function tinhThanhTienDong(dong) {

    const inputDonGia =
        dong.cells[4]
            .querySelector("input");


    const inputSoLuong =
        dong.cells[5]
            .querySelector("input");


    const spanThanhTien =
        dong.cells[6]
            .querySelector("span");


    const donGia =
        laySo(inputDonGia.value);


    const soLuong =
        Number(inputSoLuong.value) || 0;


    const thanhTien =
        Math.round(
            donGia * soLuong
        );


    spanThanhTien.textContent =
        dinhDangSo(thanhTien);


    // Tính tổng
    tinhTongTien();

}


// ==========================================
// TÍNH TỔNG TIỀN HÀNG
// ==========================================

function tinhTongTien() {

    let tongTien = 0;


    const cacDong =
        bangHoaDon.querySelectorAll("tr");


    cacDong.forEach(function(dong) {

        const thanhTien =
            laySo(
                dong.cells[6].textContent
            );


        tongTien += thanhTien;

    });


    document.getElementById(
        "tongTien"
    ).textContent =
        dinhDangSo(tongTien);


    tinhTongThanhToan();

}


// ==========================================
// TÍNH THUẾ + TỔNG THANH TOÁN
// ==========================================

function tinhTongThanhToan() {

    const tongTien =
        laySo(
            document.getElementById(
                "tongTien"
            ).textContent
        );


    const thue =
        Number(
            document.getElementById(
                "thueGTGT"
            ).value
        ) || 0;


    const tienThue =
        Math.round(
            tongTien * thue / 100
        );


    const tongThanhToan =
        tongTien + tienThue;


    document.getElementById(
        "tienThue"
    ).textContent =
        dinhDangSo(tienThue);


    document.getElementById(
        "tongThanhToan"
    ).textContent =
        dinhDangSo(tongThanhToan);
capNhatTienBangChu();
}


// ==========================================
// THAY ĐỔI THUẾ
// ==========================================

document.getElementById(
    "thueGTGT"
).addEventListener(
    "input",
    tinhTongThanhToan
);
// ==========================================
// TỰ ĐỘNG CHUYỂN TÊN KHÁCH HÀNG THÀNH IN HOA
// ==========================================

const tenKhachHang = document.getElementById("tenKhachHang");

tenKhachHang.addEventListener("input", function() {

    this.value = this.value.toLocaleUpperCase("vi-VN");

});
// ==========================================
// ĐỊA CHỈ - VIẾT HOA CHỮ CÁI ĐẦU MỖI TỪ
// ==========================================

const diaChi = document.getElementById("diaChi");

diaChi.addEventListener("input", function() {

    this.value = this.value.toLocaleLowerCase("vi-VN")
        .replace(/(^|\s)\S/g, function(chu) {
            return chu.toLocaleUpperCase("vi-VN");
        });

});


function capNhatTienBangChu() {

    const tongTien = document.getElementById("tongThanhToan");
    const tienBangChu = document.getElementById("tienBangChu");

    if (!tongTien || !tienBangChu) return;

    const soTien = Number(
        tongTien.textContent.replace(/[^\d-]/g, "")
    );

    let chu = docSoThanhChu(soTien);

    chu = chu.toLocaleLowerCase("vi-VN");

    chu = chu.charAt(0).toLocaleUpperCase("vi-VN") + chu.slice(1);

    tienBangChu.value = chu;
}
/* =====================================
   TỰ ĐỘNG LẤY NGÀY LẬP BÁO GIÁ
   ===================================== */

document.addEventListener("DOMContentLoaded", function () {

    const ngayLap = document.getElementById("ngayLap");

    if (ngayLap) {

        const homNay = new Date();

        const nam = homNay.getFullYear();
        const thang = String(homNay.getMonth() + 1).padStart(2, "0");
        const ngay = String(homNay.getDate()).padStart(2, "0");

        ngayLap.value = `${nam}-${thang}-${ngay}`;
    }

});

/* =====================================================
   NHẬP TÊN KHÁCH HÀNG VÀ ĐỊA CHỈ BẰNG GIỌNG NÓI
   ===================================================== */

let boNhanDien = null;
let oNhapHienTai = null;
let noiDungDaNhan = "";
let dangNghe = false;
let yeuCauDung = false;

function batGiongNoi(id) {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Trình duyệt không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome.");
        return;
    }

    // Dừng phiên trước nếu đang tồn tại
    if (boNhanDien) {
        yeuCauDung = true;
        try {
            boNhanDien.abort();
        } catch (e) {}
        boNhanDien = null;
    }

    const oNhap = document.getElementById(id);

    if (!oNhap) {
        alert("Không tìm thấy ô nhập: " + id);
        return;
    }

    oNhapHienTai = oNhap;
    noiDungDaNhan = oNhap.value.trim();
    yeuCauDung = false;

    const nhanDien = new SpeechRecognition();

    boNhanDien = nhanDien;

    nhanDien.lang = "vi-VN";
    nhanDien.continuous = false;
    nhanDien.interimResults = false;
    nhanDien.maxAlternatives = 1;

    nhanDien.onstart = function () {
        dangNghe = true;
        console.log("Micro đang nghe...");
    };

    nhanDien.onresult = function (event) {

        if (yeuCauDung) return;

        const ketQua =
            event.results[event.results.length - 1][0].transcript.trim();

        if (!ketQua) return;

        const noiDungMoi = noiDungDaNhan
            ? noiDungDaNhan + " " + ketQua
            : ketQua;

        oNhapHienTai.value = noiDungMoi;

        oNhapHienTai.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        noiDungDaNhan = noiDungMoi;
    };

    nhanDien.onerror = function (event) {
        console.log("Lỗi nhận diện:", event.error);

        if (event.error === "not-allowed" ||
            event.error === "service-not-allowed") {
            alert("Chrome chưa được cấp quyền sử dụng micro.");
        } else if (event.error === "audio-capture") {
            alert("Không tìm thấy micro.");
        } else if (event.error === "network") {
            alert("Lỗi kết nối dịch vụ nhận diện giọng nói. Hãy kiểm tra Internet.");
        } else if (event.error === "no-speech") {
            console.log("Không nghe thấy giọng nói.");
        }
    };

    nhanDien.onend = function () {
        dangNghe = false;

        if (boNhanDien === nhanDien) {
            boNhanDien = null;
        }

        console.log("Đã kết thúc nhận diện.");
    };

    try {
        nhanDien.start();
    } catch (error) {
        dangNghe = false;
        boNhanDien = null;
        console.log("Không khởi động được micro:", error);
        alert("Không thể khởi động micro. Hãy tải lại trang và thử lại.");
    }
}


/* =====================================================
   DỪNG NHẬN DIỆN GIỌNG NÓI
   ===================================================== */

function dungGiongNoi() {

    yeuCauDung = true;
    dangNghe = false;

    if (boNhanDien) {
        const nhanDien = boNhanDien;
        boNhanDien = null;

        try {
            nhanDien.abort();
        } catch (error) {
            console.log(error);
        }
    }
}


/* =====================================================
   XÓA NỘI DUNG Ô NHẬP
   ===================================================== */

function xoaNoiDungGiongNoi(id) {

    dungGiongNoi();

    const oNhap = document.getElementById(id);

    if (!oNhap) return;

    oNhap.value = "";
    noiDungDaNhan = "";

    oNhap.dispatchEvent(
        new Event("input", { bubbles: true })
    );

    oNhap.focus();
}
