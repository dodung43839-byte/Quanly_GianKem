
function docSoThanhChu(number) {
    if (!Number.isFinite(Number(number))) return "";

    number = Math.floor(Number(number));

    if (number === 0) return "Không đồng";

    const chuSo = [
        "không", "một", "hai", "ba", "bốn",
        "năm", "sáu", "bảy", "tám", "chín"
    ];

    function docBaSo(n) {
        let tram = Math.floor(n / 100);
        let chuc = Math.floor((n % 100) / 10);
        let donVi = n % 10;

        let kq = "";

        if (tram > 0) {
            kq += chuSo[tram] + " trăm";
        }

        if (chuc > 1) {
            kq += " " + chuSo[chuc] + " mươi";

            if (donVi === 1) kq += " mốt";
            else if (donVi === 5) kq += " lăm";
            else if (donVi > 0) kq += " " + chuSo[donVi];

        } else if (chuc === 1) {
            kq += " mười";

            if (donVi === 5) kq += " lăm";
            else if (donVi > 0) kq += " " + chuSo[donVi];

        } else if (donVi > 0) {
            if (tram > 0) kq += " linh";
            kq += " " + chuSo[donVi];
        }

        return kq.trim();
    }

    const donVi = [
        "", "nghìn", "triệu", "tỷ",
        "nghìn tỷ", "triệu tỷ"
    ];

    let nhom = [];
    while (number > 0) {
        nhom.push(number % 1000);
        number = Math.floor(number / 1000);
    }

    let ketQua = [];

    for (let i = nhom.length - 1; i >= 0; i--) {
        if (nhom[i] > 0) {
            ketQua.push(
                docBaSo(nhom[i]) + 
                (donVi[i] ? " " + donVi[i] : "")
            );
        }
    }

    return ketQua.join(" ").trim() + " đồng";
}
