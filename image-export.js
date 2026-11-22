// Optional configurator section shared by resources with printable artwork.
byConfigurator.initImageExport = function (resource, editor) {
  const tool = document.documentElement.dataset.tool;
  const panels = resource.imageExport;
  const section = $(
    /* HTML */ ` <section id="image-export" class="accordion-item mb-3 border border-secondary-subtle bg-body" aria-labelledby="export-toggle">
      <h2 class="accordion-header">
        <button
          id="export-toggle"
          type="button"
          class="accordion-button collapsed p-3 fs-6 fw-semibold text-primary bg-transparent"
          data-bs-toggle="collapse"
          data-bs-target="#export-options"
          aria-expanded="false"
          aria-controls="export-options">
          <i class="fa-solid fa-file-image me-2" aria-hidden="true"></i>Export image
        </button>
      </h2>
      <div id="export-options" class="accordion-collapse collapse">
        <div class="accordion-body d-grid gap-2">
          <label
            >Image source<select id="export-source" class="form-select">
              <option value="frame">Current preview</option>
            </select></label
          >
          <label
            >Format<select id="export-format" class="form-select">
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
            </select></label
          >
          <label
            >Resolution<select id="export-size" class="form-select">
              <option value="0">Original dimensions</option>
              <option value="360">360p · 640 × 360</option>
              <option value="480">480p · 854 × 480</option>
              <option value="720">720p · 1280 × 720</option>
              <option value="1080">1080p · 1920 × 1080</option>
              <option value="1440">1440p · 2560 × 1440</option>
              <option value="2160">4K · 3840 × 2160</option>
            </select></label
          >
          <label><input id="export-crop" type="checkbox" class="form-check-input me-2" />Crop transparent edges</label>
          <label hidden>JPEG background<input id="export-matte" type="color" value="#ffffff" class="form-control form-control-color" /></label>
          <button type="button" id="export-download" class="btn btn-primary">Download image</button>
          <output id="export-status" class="small" aria-live="polite"></output>
        </div>
      </div>
    </section>`
  ).appendTo("#overlay-form");
  const source = section.find("#export-source");
  if (panels) source.prepend(new Option("All panels", "panels", true, true));
  else if (tool === "qr") source.prepend(new Option("QR code only", "qr", true, true));
  else source.closest("label").prop("hidden", true);
  const format = section.find("#export-format");
  const matte = section.find("#export-matte");
  const button = section.find("#export-download");
  const status = section.find("#export-status");
  function sync() {
    matte.parent().prop("hidden", format.val() !== "jpeg");
    button.text(source.val() === "panels" ? "Download all panels" : "Download image");
  }
  section.on("input change", (event) => {
    event.stopPropagation();
    sync();
  });
  $("#overlay-form").on("reset", () => setTimeout(sync, 0));
  sync();

  // ============================================================
  // PREVIEW CAPTURE AND TRANSPARENT BOUNDS
  // ============================================================
  function canvasOf(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function trim(canvas) {
    const { width, height } = canvas;
    const data = canvas.getContext("2d").getImageData(0, 0, width, height).data;
    let left = width,
      right = -1,
      top = height,
      bottom = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!data[(y * width + x) * 4 + 3]) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = y;
      }
    }
    if (right < 0) throw new Error("The preview is fully transparent. Show the overlay or wait for visible content.");
    if (left === 0 && top === 0 && right === width - 1 && bottom === height - 1) return canvas;
    const result = canvasOf(right - left + 1, bottom - top + 1);
    result.getContext("2d").drawImage(canvas, -left, -top);
    return result;
  }

  // Capture computed styles now, then embed images and the fonts actually loaded by this preview.
  async function snapshot(node, width, height, outputWidth, outputHeight, assets) {
    const doc = node.ownerDocument;
    const view = doc.defaultView;
    const rules = new Map();
    const fonts = new Set();
    const pending = [];
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(svgNS, "svg");
    svg.setAttribute("width", outputWidth);
    svg.setAttribute("height", outputHeight);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    const foreign = doc.createElementNS(svgNS, "foreignObject");
    foreign.setAttribute("width", "100%");
    foreign.setAttribute("height", "100%");
    const sheet = doc.createElementNS(svgNS, "style");
    svg.append(sheet, foreign);

    function asset(url) {
      if (url.startsWith("data:") || url.startsWith("#")) return Promise.resolve(url);
      if (!assets.has(url))
        assets.set(
          url,
          (async () => {
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) throw new Error("Unable to read artwork or a font from " + new URL(url).host + ".");
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
          })()
        );
      return assets.get(url);
    }

    async function inlineURLs(css, base) {
      const matches = [...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)];
      const values = await Promise.all(
        matches.map(async (match) => {
          const value = match[1] ?? match[2] ?? match[3];
          const url = new URL(value, base);
          if (value.startsWith("#") || (url.hash && url.href.split("#")[0] === doc.URL.split("#")[0])) return value.startsWith("#") ? value : url.hash;
          return asset(url.href);
        })
      );
      let i = 0;
      return css.replace(/url\(\s*(?:"[^"]*"|'[^']*'|[^)]*?)\s*\)/gi, () => 'url("' + values[i++] + '")');
    }

    function copyStyle(el, clone, pseudo = "") {
      const style = view.getComputedStyle(el, pseudo || null);
      if (pseudo && ["none", "normal", ""].includes(style.content)) return;
      const declarations = [];
      // Paint inherited by <use> belongs to the instance, not its source path in <defs>.
      const definitionParent = el.namespaceURI === svgNS && el.closest("defs, symbol") && el.parentElement ? view.getComputedStyle(el.parentElement) : null;
      for (const prop of style) {
        if (prop.startsWith("--") || prop.startsWith("animation") || prop.startsWith("transition")) continue;
        const value = style.getPropertyValue(prop);
        if (definitionParent && /^(?:fill|stroke|color)(?:-|$)/.test(prop) && !el.hasAttribute(prop) && !el.style.getPropertyValue(prop) && value === definitionParent.getPropertyValue(prop)) continue;
        if (value) declarations.push(prop + ":" + value);
      }
      for (const family of style.fontFamily.split(","))
        fonts.add(
          family
            .trim()
            .replace(/^["']|["']$/g, "")
            .toLowerCase()
        );
      const css = declarations.join(";") + ";animation:none!important;transition:none!important";
      const key = pseudo + "\n" + css;
      if (!rules.has(key)) {
        const name = "capture-" + rules.size;
        const rule = { name, css: "." + name + pseudo + "{" + css + "}" };
        rules.set(key, rule);
        if (css.includes("url("))
          pending.push(
            inlineURLs(rule.css, doc.baseURI).then((value) => {
              rule.css = value;
            })
          );
      }
      clone.classList.add(rules.get(key).name);
    }

    function cloneNode(el) {
      if (el.nodeType === 3) return doc.createTextNode(el.data);
      if (el.nodeType !== 1 || ["SCRIPT", "STYLE", "LINK", "TEMPLATE", "IFRAME", "NOSCRIPT"].includes(el.tagName.toUpperCase())) return null;
      if (el.namespaceURI !== svgNS && view.getComputedStyle(el).display === "none") return null;
      let clone;
      if (el.localName === "img" || el.localName === "canvas" || el.localName === "video") {
        clone = doc.createElement("img");
        if (el.localName === "img") {
          const url = el.currentSrc || el.src;
          if (url) pending.push(asset(url).then((value) => clone.setAttribute("src", value)));
        } else {
          let canvas = el;
          if (el.localName === "video") {
            if (!el.videoWidth) return null;
            canvas = canvasOf(el.videoWidth, el.videoHeight);
            canvas.getContext("2d").drawImage(el, 0, 0);
          }
          clone.src = canvas.toDataURL();
        }
      } else {
        clone = el === doc.body ? doc.createElement("div") : el.cloneNode(false);
        clone.removeAttribute("style");
        for (const attr of [...clone.attributes]) if (attr.name.startsWith("on")) clone.removeAttribute(attr.name);
        if (el.namespaceURI === svgNS && el.localName === "image") {
          const href = el.href.baseVal;
          if (href)
            pending.push(
              asset(new URL(href, doc.baseURI).href).then((value) => {
                clone.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
                clone.setAttribute("href", value);
              })
            );
        }
        for (const child of el.childNodes) {
          const copy = cloneNode(child);
          if (copy) clone.append(copy);
        }
      }
      copyStyle(el, clone);
      if (el.namespaceURI !== svgNS) {
        copyStyle(el, clone, "::before");
        copyStyle(el, clone, "::after");
      }
      return clone;
    }
    const root = cloneNode(node);
    if (!root) throw new Error("Show the overlay before exporting.");
    Object.assign(root.style, { margin: "0", width: width + "px", height: height + "px", position: "relative", left: "0", top: "0" });
    foreign.append(root);

    async function fontRules() {
      const loaded = new Set([...doc.fonts].filter((face) => face.status === "loaded").map((face) => face.family.replace(/["']/g, "").toLowerCase()));
      if (![...fonts].some((family) => loaded.has(family))) return [];
      // Cross-origin stylesheets can be applied by the browser while CSSOM reads require CORS.
      if (!assets.has(doc))
        assets.set(
          doc,
          Promise.all(
            [...doc.styleSheets].map(async (s) => {
              const base = s.href || doc.baseURI;
              let cssRules;
              try {
                cssRules = s.cssRules;
              } catch {
                const res = await fetch(base, { signal: AbortSignal.timeout(10000) });
                if (!res.ok) throw new Error("Unable to read preview fonts from " + new URL(base).host + ".");
                const parsed = new CSSStyleSheet();
                parsed.replaceSync(await res.text());
                cssRules = parsed.cssRules;
              }
              return [...cssRules].filter((rule) => rule.type === CSSRule.FONT_FACE_RULE).map((rule) => ({ rule, base }));
            })
          ).then((lists) => lists.flat())
        );
      const result = [];
      for (const { rule, base } of await assets.get(doc)) {
        const family = rule.style.getPropertyValue("font-family").replace(/["']/g, "").toLowerCase();
        if (fonts.has(family) && loaded.has(family)) result.push(inlineURLs(rule.cssText, base));
      }
      return Promise.all(result);
    }
    const [fontCSS] = await Promise.all([fontRules(), Promise.all(pending)]);
    sheet.textContent = [...fontCSS, ...[...rules.values()].map((rule) => rule.css)].join("\n");
    const image = new Image();
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    await image.decode();
    return image;
  }

  async function capture(node, view, mode, options) {
    const frame = mode === "frame";
    const qr = mode === "qr";
    const width = frame ? view.innerWidth : qr ? node.width : node.offsetWidth;
    const height = frame ? view.innerHeight : qr ? node.height : node.offsetHeight;
    if (!width || !height) throw new Error("The preview has no visible dimensions.");
    const boxHeight = options.resolution || height;
    const boxWidth = options.resolution ? (options.resolution === 480 ? 854 : Math.round((boxHeight * 16) / 9)) : width;
    const scale = Math.min(boxWidth / width, boxHeight / height);
    const w = Math.max(1, Math.round(width * scale)),
      h = Math.max(1, Math.round(height * scale));
    let canvas = canvasOf(frame ? boxWidth : w, frame ? boxHeight : h);
    const ctx = canvas.getContext("2d");
    if (qr) {
      const modules = Number(node.dataset.modules);
      const side = Math.floor(w / modules) * modules;
      ctx.fillStyle = view.byStreamResource.settings.qrBackground;
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(node, Math.floor((w - side) / 2), Math.floor((h - side) / 2), side, side);
    } else {
      const images = [...node.querySelectorAll("img")].filter((img) => img.currentSrc && img.getClientRects().length);
      await Promise.all(
        images.map((img) =>
          img.decode().catch(() => {
            throw new Error("An image could not load. Check its URL or browse for a local image.");
          })
        )
      );
      const image = await snapshot(node, width, height, w, h, options.assets);
      ctx.drawImage(image, Math.floor((canvas.width - w) / 2), Math.floor((canvas.height - h) / 2), w, h);
    }
    if (options.crop) canvas = trim(canvas);
    if (options.format === "jpeg") {
      const context = canvas.getContext("2d");
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = options.matte;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/" + options.format, 0.95));
    if (!blob) throw new Error("The browser could not encode this image.");
    return { blob, width: canvas.width, height: canvas.height };
  }

  // ============================================================
  // NAMED FILES AND PANEL SETS
  // ============================================================
  function filenames(rows, extension) {
    const used = new Set();
    return rows.map((row, i) => {
      const label = row.label
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_-]+/gu, "-")
        .replace(/^-+|-+$/g, "");
      let base =
        (row.filename.trim() || label)
          .normalize("NFKC")
          .replace(/\.(?:png|jpe?g)$/i, "")
          .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
          .slice(0, 96)
          .replace(/^[ .]+|[ .]+$/g, "") || "panel-" + (i + 1);
      if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)) base = "panel-" + base;
      let name = base,
        suffix = 1;
      while (used.has(name.toLowerCase())) name = base + "-" + ++suffix;
      used.add(name.toLowerCase());
      return name + "." + extension;
    });
  }
  function save(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 30000);
  }

  let busy = false;
  async function download(rowIndex) {
    if (busy) return;
    busy = true;
    button.add("[data-export-row]").prop("disabled", true);
    const mode = rowIndex === undefined ? source.val() : "panel";
    const options = { assets: new Map(), format: format.val(), resolution: Number(section.find("#export-size").val()), crop: section.find("#export-crop").prop("checked"), matte: matte.val() };
    const extension = options.format === "jpeg" ? "jpg" : "png";
    status.text("Preparing image…");
    try {
      const view = await editor.currentPreview();
      const doc = view.document;
      await doc.fonts.ready;
      const assertCurrent = () => {
        if (view.document !== doc) throw new Error("The preview changed during export. Try again.");
      };
      if (mode === "panels" || mode === "panel") {
        const nodes = [...doc.querySelectorAll(panels.selector)];
        if (!nodes.length) throw new Error("Add a panel before exporting.");
        const names = filenames(view.byStreamResource.settings[panels.field], extension);
        if (names.length !== nodes.length || (mode === "panel" && !nodes[rowIndex])) throw new Error("The panel list changed. Try again.");
        const batch = mode === "panels";
        for (const i of batch ? nodes.keys() : [rowIndex]) {
          status.text("Preparing " + names[i] + "…");
          const result = await capture(nodes[i], view, mode, options);
          assertCurrent();
          save(result.blob, names[i]);
          if (!batch) {
            status.text(names[i] + " · " + result.width + " × " + result.height);
            return;
          }
        }
        status.text(names.length + " downloads requested. Allow multiple downloads if your browser asks.");
      } else {
        const node = mode === "qr" ? doc.querySelector(".qr-code") : doc.body;
        if (!node) throw new Error("The preview is still loading. Try again.");
        const result = await capture(node, view, mode, options);
        assertCurrent();
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const date = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join("-");
        const time = [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds()), String(now.getMilliseconds()).padStart(3, "0")].join("-");
        const name = tool + "_" + date + " " + time + "." + extension;
        save(result.blob, name);
        status.text(name + " · " + result.width + " × " + result.height);
      }
    } catch (error) {
      status.text(
        error instanceof TypeError || error.name === "SecurityError" ? "The browser could not read preview artwork or fonts. Use an embedded image or a URL that allows cross-origin access." : error.message || "Image export failed."
      );
      section.find(".accordion-collapse").collapse("show");
    } finally {
      busy = false;
      button.add("[data-export-row]").prop("disabled", false);
    }
  }
  button.on("click", () => download());
  $("#overlay-form").on("click", "[data-export-row]", function () {
    const row = $(this).closest(".entry-row");
    download(row.parent().children(":not([inert])").index(row));
  });
};
