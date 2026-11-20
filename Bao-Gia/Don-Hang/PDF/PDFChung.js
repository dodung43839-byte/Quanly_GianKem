(function () {
  "use strict";
  function device() {
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      ? "ios"
      : /Android/.test(ua)
        ? "android"
        : "desktop";
  }
  async function ready(root) {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await Promise.all(
      Array.from(root.querySelectorAll("img")).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            }),
      ),
    );
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  }
  async function xuat({ element, options = {}, mode = "auto" } = {}) {
    const node =
      typeof element === "string" ? document.querySelector(element) : element;
    if (!node) throw Error("Không tìm thấy vùng xuất PDF");
    if (typeof window.html2pdf !== "function")
      throw Error("Chưa tải html2pdf.js");
    await ready(node);
    const method = mode === "auto" ? device() : mode;
    const canvas = Object.assign({}, options.html2canvas || {});
    if (method === "ios") {
      canvas.scale = Math.min(Number(canvas.scale) || 2, 1.5);
      canvas.useCORS = true;
      canvas.backgroundColor = "#ffffff";
      canvas.scrollX = 0;
      canvas.scrollY = 0;
      canvas.windowWidth = Math.max(
        document.documentElement.clientWidth,
        node.scrollWidth,
      );
      canvas.foreignObjectRendering = false;
    }
    return window
      .html2pdf()
      .set(Object.assign({}, options, { html2canvas: canvas }))
      .from(node)
      .save();
  }
  window.PDFChung = { xuat, device };
})();
