// ==========================================================
// KHỞI TẠO
// ==========================================================


// Bảng danh mục hàng
const bangDanhMuc =
    document.getElementById("bangDanhMuc");


// Bảng hóa đơn
const bangHoaDon =
    document.getElementById("bangHoaDon");


// Tbody của bảng hóa đơn
const tbodyHoaDon =
    bangHoaDon.querySelector("tbody");


// Ô tìm kiếm
const txtTimKiem =
    document.getElementById("txtTimKiem");


// Thông tin hàng đang chọn
const maHangHienTai =
    document.getElementById("maHang");

const tenHangHienTai =
    document.getElementById("tenHang");

const donViTinhHienTai =
    document.getElementById("donViTinh");

const giaBanHienTai =
    document.getElementById("giaBan");


// Tổng tiền
const tongTien =
    document.getElementById("tongTien");


// Các nút
const btnXoa =
    document.getElementById("btnXoa");

const btnXoaHet =
    document.getElementById("btnXoaHet");

const btnLuu =
    document.getElementById("btnLuu");

const btnXuatPDF =
    document.getElementById("btnXuatPDF");


// Dòng đang chọn trong bảng hóa đơn
let dongHoaDonDangChon = null;


// ==========================================================
// 1. CLICK VÀO DANH MỤC HÀNG
// ==========================================================
//
// Đây chính là phần tương đương:
//
// Private Sub ListBox1_Click()
//
// trong VBA.
// ==========================================================


const cacDongDanhMuc =
    bangDanhMuc.querySelectorAll("tbody tr");


cacDongDanhMuc.forEach(function (dong) {


    dong.addEventListener("click", function () {


        // ----------------------------------------------
        // Bỏ chọn dòng cũ
        // ----------------------------------------------

        cacDongDanhMuc.forEach(function (dongKhac) {

            dongKhac.classList.remove("selected");

        });


        // ----------------------------------------------
        // Chọn dòng vừa click
        // ----------------------------------------------

        dong.classList.add("selected");


        // ----------------------------------------------
        // Lấy dữ liệu từ dòng HTML
        // ----------------------------------------------

        const maHang =
            dong.dataset.ma;

        const tenHang =
            dong.dataset.ten;

        const donViTinh =
            dong.dataset.dvt;

        const giaBan =
            Number(dong.dataset.gia);


        // ----------------------------------------------
        // Hiển thị hàng đang chọn
        // ----------------------------------------------

        maHangHienTai.textContent =
            maHang;

        tenHangHienTai.textContent =
            tenHang;

        donViTinhHienTai.textContent =
            donViTinh;

        giaBanHienTai.textContent =
            dinhDangTien(giaBan);


        // ----------------------------------------------
        // Đổ ngay vào đơn hàng
        // ----------------------------------------------

        themVaoDonHang(
            maHang,
            tenHang,
            donViTinh,
            giaBan
        );

    });

});


// ==========================================================
// 2. THÊM HÀNG VÀO ĐƠN HÀNG
// ==========================================================


function themVaoDonHang(
    maHang,
    tenHang,
    donViTinh,
    giaBan
) {


    // ----------------------------------------------
    // Kiểm tra hàng đã có chưa
    // ----------------------------------------------

    const cacDong =
        tbodyHoaDon.querySelectorAll("tr");


    let dongDaCo = null;


    cacDong.forEach(function (dong) {


        if (dong.dataset.ma === maHang) {

            dongDaCo = dong;

        }

    });


    // ==================================================
    // TRƯỜNG HỢP 1:
    // Hàng đã có → tăng số lượng
    // ==================================================

    if (dongDaCo !== null) {


        const inputSoLuong =
            dongDaCo.querySelector(".so-luong");


        inputSoLuong.value =
            Number(inputSoLuong.value) + 1;


        tinhThanhTien(dongDaCo);


        chonDongHoaDon(dongDaCo);


        return;

    }


    // ==================================================
    // TRƯỜNG HỢP 2:
    // Hàng chưa có → tạo dòng mới
    // ==================================================


    // Tạo <tr>
    const dongMoi =
        document.createElement("tr");


    // Lưu mã hàng vào data-ma
    dongMoi.dataset.ma =
        maHang;


    // ----------------------------------------------
    // Cột STT
    // ----------------------------------------------

    const oSTT =
        document.createElement("td");

    oSTT.textContent =
        "";


    // ----------------------------------------------
    // Cột tên hàng
    // ----------------------------------------------

    const oTenHang =
        document.createElement("td");

    oTenHang.textContent =
        tenHang;


    // ----------------------------------------------
    // Cột ĐVT
    // ----------------------------------------------

    const oDonViTinh =
        document.createElement("td");

    oDonViTinh.textContent =
        donViTinh;


    // ----------------------------------------------
    // Cột đơn giá
    // ----------------------------------------------

    const oDonGia =
        document.createElement("td");


    const inputDonGia =
        document.createElement("input");


    inputDonGia.type =
        "number";

    inputDonGia.min =
        "0";

    inputDonGia.value =
        giaBan;

    inputDonGia.className =
        "don-gia";


    oDonGia.appendChild(
        inputDonGia
    );


    // ----------------------------------------------
    // Cột số lượng
    // ----------------------------------------------

    const oSoLuong =
        document.createElement("td");


    const inputSoLuong =
        document.createElement("input");


    inputSoLuong.type =
        "number";

    inputSoLuong.min =
        "1";

    inputSoLuong.value =
        "1";

    inputSoLuong.className =
        "so-luong";


    oSoLuong.appendChild(
        inputSoLuong
    );


    // ----------------------------------------------
    // Cột thành tiền
    // ----------------------------------------------

    const oThanhTien =
        document.createElement("td");


    oThanhTien.className =
        "thanh-tien";


    // ----------------------------------------------
    // Ghép các <td> vào <tr>
    // ----------------------------------------------

    dongMoi.appendChild(oSTT);

    dongMoi.appendChild(oTenHang);

    dongMoi.appendChild(oDonViTinh);

    dongMoi.appendChild(oDonGia);

    dongMoi.appendChild(oSoLuong);

    dongMoi.appendChild(oThanhTien);


    // ----------------------------------------------
    // Đưa <tr> vào tbody
    // ----------------------------------------------

    tbodyHoaDon.appendChild(
        dongMoi
    );


    // ----------------------------------------------
    // Click dòng hóa đơn
    // ----------------------------------------------

    dongMoi.addEventListener(
        "click",
        function () {

            chonDongHoaDon(
                dongMoi
            );

        }
    );


    // ----------------------------------------------
    // Thay đổi số lượng
    // ----------------------------------------------

    inputSoLuong.addEventListener(
        "input",
        function () {

            tinhThanhTien(
                dongMoi
            );

        }
    );


    // ----------------------------------------------
    // Thay đổi đơn giá
    // ----------------------------------------------

    inputDonGia.addEventListener(
        "input",
        function () {

            tinhThanhTien(
                dongMoi
            );

        }
    );


    // ----------------------------------------------
    // Tính tiền
    // ----------------------------------------------

    tinhThanhTien(
        dongMoi
    );


    // ----------------------------------------------
    // Đánh lại STT
    // ----------------------------------------------

    danhLaiSTT();


    // ----------------------------------------------
    // Chọn dòng vừa thêm
    // ----------------------------------------------

    chonDongHoaDon(
        dongMoi
    );

}


// ==========================================================
// 3. CHỌN DÒNG HÓA ĐƠN
// ==========================================================


function chonDongHoaDon(dong) {


    const cacDong =
        tbodyHoaDon.querySelectorAll("tr");


    // Bỏ chọn tất cả

    cacDong.forEach(function (dongKhac) {

        dongKhac.classList.remove(
            "selected"
        );

    });


    // Chọn dòng hiện tại

    dong.classList.add(
        "selected"
    );


    // Lưu dòng đang chọn

    dongHoaDonDangChon =
        dong;

}


// ==========================================================
// 4. TÍNH THÀNH TIỀN
// ==========================================================


function tinhThanhTien(dong) {


    const inputSoLuong =
        dong.querySelector(
            ".so-luong"
        );


    const inputDonGia =
        dong.querySelector(
            ".don-gia"
        );


    let soLuong =
        Number(inputSoLuong.value);


    let donGia =
        Number(inputDonGia.value);


    // Không cho số lượng âm

    if (soLuong < 0) {

        soLuong = 0;

        inputSoLuong.value = 0;

    }


    // Không cho đơn giá âm

    if (donGia < 0) {

        donGia = 0;

        inputDonGia.value = 0;

    }


    const thanhTien =
        soLuong * donGia;


    dong.querySelector(
        ".thanh-tien"
    ).textContent =
        dinhDangTien(thanhTien);


    // Tính lại tổng

    tinhTongTien();

}


// ==========================================================
// 5. TÍNH TỔNG TIỀN
// ==========================================================


function tinhTongTien() {


    const cacDong =
        tbodyHoaDon.querySelectorAll("tr");


    let tong = 0;


    cacDong.forEach(function (dong) {


        const soLuong =
            Number(
                dong.querySelector(
                    ".so-luong"
                ).value
            );


        const donGia =
            Number(
                dong.querySelector(
                    ".don-gia"
                ).value
            );


        tong +=
            soLuong * donGia;

    });


    tongTien.textContent =
        dinhDangTien(tong);

}


// ==========================================================
// 6. ĐÁNH LẠI SỐ THỨ TỰ
// ==========================================================


function danhLaiSTT() {


    const cacDong =
        tbodyHoaDon.querySelectorAll("tr");


    cacDong.forEach(function (
        dong,
        index
    ) {


        dong.cells[0].textContent =
            index + 1;

    });

}


// ==========================================================
// 7. XÓA DÒNG
// ==========================================================


btnXoa.addEventListener(
    "click",
    function () {


        if (
            dongHoaDonDangChon === null
        ) {

            alert(
                "Bạn chưa chọn dòng cần xóa!"
            );

            return;

        }


        dongHoaDonDangChon.remove();


        dongHoaDonDangChon =
            null;


        danhLaiSTT();


        tinhTongTien();

    }
);


// ==========================================================
// 8. XÓA HẾT
// ==========================================================


btnXoaHet.addEventListener(
    "click",
    function () {


        if (
            tbodyHoaDon.children.length === 0
        ) {

            return;

        }


        const xacNhan =
            confirm(
                "Bạn có chắc muốn xóa toàn bộ đơn hàng?"
            );


        if (!xacNhan) {

            return;

        }


        tbodyHoaDon.innerHTML =
            "";


        dongHoaDonDangChon =
            null;


        tinhTongTien();

    }
);


// ==========================================================
// 9. NÚT LƯU ĐƠN HÀNG
// ==========================================================


btnLuu.addEventListener(
    "click",
    function () {


        const soDong =
            tbodyHoaDon.querySelectorAll(
                "tr"
            ).length;


        if (soDong === 0) {

            alert(
                "Đơn hàng chưa có sản phẩm!"
            );

            return;

        }


        alert(
            "Đơn hàng đã sẵn sàng để lưu!"
        );

    }
);


// ==========================================================
// 10. TÌM KIẾM HÀNG
// ==========================================================


txtTimKiem.addEventListener(
    "input",
    function () {


        const tuKhoa =
            txtTimKiem.value
                .toLowerCase()
                .trim();


        const cacDong =
            bangDanhMuc.querySelectorAll(
                "tbody tr"
            );


        cacDong.forEach(function (dong) {


            const tenHang =
                dong.dataset.ten
                    .toLowerCase();


            if (
                tenHang.includes(tuKhoa)
            ) {

                dong.style.display =
                    "";

            } else {

                dong.style.display =
                    "none";

            }

        });

    }
);


// ==========================================================
// 11. XUẤT PDF
// ==========================================================
//
// Không cần thư viện PDF ở bước này.
//
// window.print() mở chức năng in của trình duyệt.
// CSS @media print trong HTML sẽ quyết định
// phần nào được đưa vào PDF.
// ==========================================================


btnXuatPDF.addEventListener(
    "click",
    function () {


        // Kiểm tra đơn hàng

        const cacDong =
            tbodyHoaDon.querySelectorAll(
                "tr"
            );


        if (cacDong.length === 0) {

            alert(
                "Đơn hàng chưa có sản phẩm!"
            );

            return;

        }


        // Mở hộp thoại in

        window.print();

    }
);


// ==========================================================
// 12. ĐỊNH DẠNG TIỀN
// ==========================================================


function dinhDangTien(soTien) {


    return new Intl.NumberFormat(
        "vi-VN"
    ).format(soTien);

}