document.addEventListener("DOMContentLoaded", async () => {
  await byStream.assetsReady;
  // ===== RESOURCE CONFIGURATION =====
  const resource = {
    version: "1.1",
    title: "Now Playing",
    description: "Display cover art, track details, and progress from an editable demo. Windows media integration is TBD.",
    preview: [960, 540],
    urlRequired: ["layout"],
    presets: true,
    contrastLayers: [{ surface: ".cover-surface", layer: ".background-cover" }],
    elements: {
      overlay: { label: "Appearance", motionLabel: "track detail", selector: "#overlay .panel", gap: true },
      artwork: { label: "Artwork", motionLabel: "cover", selector: "#overlay .sleeve", fields: ["coverSize", "showArtwork"], when: (s) => s.layout !== "compact" && (s.layout === "vinyl" || s.showArtwork === "yes") },
      coverImage: { label: "Cover image", selector: "#overlay img.cover", parent: "artwork", fields: ["cover"], when: (s) => s.layout !== "compact" && s.showArtwork === "yes" },
      disc: { label: "Record", container: true, selector: "#overlay .disc", parent: "artwork", fields: ["vinylDetails", "spin"], when: ["layout", "vinyl"] },
      coverBackdrop: { label: "Cover background", selector: "#overlay .background-cover", fields: ["coverBackground"], when: ["coverBackground", "yes"] },
      details: { label: "Track details", selector: "#overlay .details", container: true },
      title: { label: "Track title", container: true, selector: "#overlay .track", fields: ["title"] },
      artist: { label: "Artist", selector: "#overlay .artist", fields: ["artist", "showArtist"], when: ["showArtist", "yes"] },
      album: { label: "Album", selector: "#overlay .album", fields: ["album", "showAlbum"], when: ["showAlbum", "yes"] },
      timeline: { label: "Playback timeline", selector: "#overlay .timeline", fields: ["showTimeline", "invert"], when: ["showTimeline", "yes"] },
      time: { label: "Time labels", selector: "#overlay .times", gap: true, fields: ["showTime"], when: ["showTime", "yes"], textOverflow: false },
      elapsed: { label: "Elapsed time", selector: "#overlay .elapsed", parent: "time", textOverflow: true },
      total: { label: "Track duration", selector: "#overlay .total", parent: "time", textOverflow: true },
      progress: { label: "Played portion", selector: "#overlay .timeline > i", parent: "timeline" },
      waitingText: { label: "Waiting message", selector: "#overlay .waiting", fields: ["waiting"], when: ["waiting", "yes"] }
    },
    fields: {
      source: {
        type: "select",
        label: "Media source",
        default: "demo",
        section: "Content & behavior",
        options: { demo: "Local demo", helper: "Windows media via OBS helper (TBD)" },
        description: "The demo uses the fields below. The Windows media connection is TBD."
      },
      layout: {
        type: "select",
        label: "Player style",
        default: "classic",
        section: "Content & behavior",
        options: { classic: "Classic", compact: "Compact", simple: "Simple", card: "Card", vinyl: "Vinyl" }
      },
      demoControls: {
        type: "switch",
        label: "Show demo controls on the overlay",
        default: "no",
        section: "Demo track",
        when: ["source", "demo"],
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" },
        description: "Track and playback controls are always available in the demo preview."
      },
      title: { type: "text", label: "Title", default: "Girl Like Me", section: "Demo track", when: ["source", "demo"], maxlength: 512 },
      artist: { type: "text", label: "Artist", default: "PinkPantheress", section: "Demo track", when: ["source", "demo"], maxlength: 512 },
      album: { type: "text", label: "Album", default: "Fancy That", section: "Demo track", when: ["source", "demo"], maxlength: 512 },
      cover: {
        type: "text",
        label: "Cover image",
        default: "https://upload.wikimedia.org/wikipedia/en/5/5b/PinkPantheress_-_Fancy_That.png",
        section: "Demo track",
        when: ["source", "demo"],
        image: true,
        maxlength: 65536,
        description: "Leave blank to use the illustrated demo cover."
      },
      duration: { type: "number", label: "Duration (seconds)", default: 146, section: "Demo track", when: ["source", "demo"], min: 0, max: 604800, step: "any" },
      position: { type: "number", label: "Position (seconds)", default: 23, section: "Demo track", when: ["source", "demo"], min: 0, max: 604800, step: "any" },
      playback: {
        type: "select",
        label: "Playback",
        default: "playing",
        section: "Demo track",
        when: ["source", "demo"],
        options: { playing: "Playing", paused: "Paused", stopped: "Stopped" }
      },
      paused: { type: "select", label: "When paused", default: "show", section: "Content & behavior", options: { show: "Keep track", hide: "Hide track" } },
      waiting: {
        type: "switch",
        label: "Show waiting label when idle",
        default: "no",
        section: "Content & behavior",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      coverBackground: {
        type: "switch",
        label: "Blurred cover background",
        default: "yes",
        section: "Appearance",
        description: "Tint the current cover with the player accent behind the track details or across the Card.",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      autoAccent: {
        type: "switch",
        label: "Use dominant artwork color",
        default: "yes",
        section: "Appearance",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      accentColor: { type: "color", label: "Accent color", default: "#660000", section: "Appearance", when: ["autoAccent", "no"], retainInactive: true },
      coverSize: {
        type: "number",
        label: "Cover size (px)",
        when: (s) => s.layout !== "compact" && (s.layout === "vinyl" || s.showArtwork === "yes"),
        description: "0 fits the cover to the track details height, or uses a 256 px record when details are hidden. Card multiplies manual sizes by 3.5 and Vinyl by 2.",
        default: 0,
        section: "Appearance",
        min: 0,
        max: 1000,
        step: "any"
      },
      vinylDetails: { type: "switch", label: "Show metadata beside record", default: "yes", section: "Visible components", when: ["layout", "vinyl"], checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      spacing: { type: "number", label: "Spacing (px)", default: 8, section: "Appearance", min: 0, max: 100, step: "any" },
      radius: { type: "number", label: "Corner radius (px)", default: 16, section: "Appearance", min: 0, max: 150, step: "any" },
      invert: {
        type: "switch",
        label: "Invert progress fill",
        default: "no",
        section: "Appearance",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" },
        when: ["layout", "compact"]
      },
      spin: {
        type: "switch",
        label: "Rotate record while playing",
        default: "yes",
        section: "Appearance",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" },
        when: ["layout", "vinyl"]
      },
      showArtwork: {
        type: "switch",
        label: "Show artwork",
        default: "yes",
        section: "Visible components",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      showArtist: {
        type: "switch",
        label: "Show artist",
        default: "yes",
        section: "Visible components",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      showAlbum: {
        type: "switch",
        label: "Show album",
        default: "yes",
        section: "Visible components",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      showTimeline: {
        type: "switch",
        label: "Show timeline",
        default: "yes",
        section: "Visible components",
        checkedValue: "yes",
        uncheckedValue: "no",
        options: { yes: "On", no: "Off" }
      },
      showTime: { type: "switch", label: "Show time", default: "yes", section: "Visible components", checkedValue: "yes", uncheckedValue: "no", options: { yes: "On", no: "Off" } },
      horizontal: {
        type: "select",
        label: "Horizontal placement",
        default: "flex-start",
        section: "Size & placement",
        options: { "flex-start": "Left", center: "Center", "flex-end": "Right" },
        styleSelector: "#overlay",
        styleProperty: "justify-content"
      },
      vertical: {
        type: "select",
        label: "Vertical placement",
        default: "center",
        section: "Size & placement",
        options: { "flex-start": "Top", center: "Center", "flex-end": "Bottom" },
        styleSelector: "#overlay",
        styleProperty: "align-items"
      },
      align: {
        type: "select",
        label: "Text alignment",
        default: "auto",
        section: "Size & placement",
        options: { auto: "Layout default", left: "Left", center: "Center", right: "Right" },
        styleSelector: "#overlay .panel",
        styleProperty: "text-align",
        styleValue: (s) => (s.align === "auto" ? (s.layout === "card" ? "center" : "left") : s.align)
      },
      opacity: {
        type: "number",
        label: "Opacity (%)",
        default: 100,
        section: "Size & placement",
        min: 0,
        max: 100,
        styleSelector: "#overlay",
        styleProperty: "opacity",
        styleUnit: "%"
      },
      width: {
        type: "number",
        label: "Width (px)",
        default: 0,
        section: "Size & placement",
        min: 0,
        max: 3840,
        step: "any",
        styleSelector: "#overlay .panel",
        styleProperty: "width",
        styleValue: (settings) => (settings.width ? `${settings.width}px` : "")
      },
      textColor: { type: "color", default: "#EEEEEE", label: "Text color", section: "Appearance", styleSelector: "#overlay", styleProperty: "color" },
      fontFamily: { type: "font", default: "Archivo", label: "Base font", section: "Appearance", maxlength: 100, styleSelector: "#overlay", styleProperty: "font-family" },
      ...byStream.placementFields("#overlay .panel"),
      ...byStream.textFields({
        title: ["Track title", "#overlay .track"],
        artist: ["Artist", "#overlay .artist"],
        album: ["Album", "#overlay .album"],
        time: ["Time labels", "#overlay .times"],
        waitingText: ["Waiting message", "#overlay .waiting"]
      }),
      ...byStream.surfaceFields({ panel: ["Player", "#overlay .panel", ["border", "padding", "shadow"]] }),
      ...byStream.filterFields("panelFilter", "Panel", "#overlay .panel"),
      ...byStream.filterFields("backdropFilter", "Panel backdrop", "#overlay .panel", true)
    },
    fieldDefaults: {
      "artwork.entrance": "fadeInLeft",
      "coverBackdrop.entrance": "fadeInRight",
      "title.entrance": "fadeInDown",
      "artist.entrance": "fadeInDown",
      "album.entrance": "fadeInDown",
      "timeline.entrance": "fadeInUp",
      "time.entrance": "fadeInUp"
    }
  };
  resource.fields.albumStyle.default = "italic";

  // ===== OVERLAY INITIALIZATION =====
  resource.fields.titleFontSize.default = 19;
  resource.fields.titleOverflow.layoutOverflow = "ticker";
  resource.fields.titleOverflow.options.layout = "Layout default (ticker scroll)";
  resource.fields.artistFontSize.default = 14;
  resource.fields.albumFontSize.default = 14;
  resource.fields.timeFontSize.default = 12;
  function configureResource() {
    const frame = document.getElementById("overlay-preview");
    const source = document.querySelector('form [name="source"]');
    const controls = document.getElementById("overlay-markup").content.querySelector(".demo-controls").cloneNode(true);
    controls.className = "btn-group btn-group-sm";
    for (const button of controls.querySelectorAll("button")) {
      button.className = "btn btn-outline-secondary";
      button.addEventListener("click", () => {
        const command = button.dataset.step ? { step: Number(button.dataset.step) } : { playback: button.dataset.playback };
        frame.contentWindow.postMessage({ type: "stream-demo-track", ...command }, location.protocol === "file:" ? "*" : location.origin);
      });
    }
    const update = () => {
      controls.hidden = source.value !== "demo";
    };
    source.addEventListener("change", update);
    frame.addEventListener("load", update);
    update();
    document.getElementById("preview-url").before(controls);
    controls.parentElement.classList.add("flex-wrap", "gap-1");
  }
  const settings = await byStream.initResource(resource, { configureResource });
  if (!byStreamOverlay) return;
  const root = document.querySelector("#overlay");
  const panel = root.querySelector(".panel");
  const sleeve = panel.querySelector(".sleeve");
  const cover = sleeve.querySelector("img");
  const details = panel.querySelector(".details");
  const backgroundSurface = settings.layout === "card" ? panel : details;
  const backgroundCover = settings.coverBackground === "yes" ? new Image() : null;
  if (backgroundCover) {
    backgroundCover.className = "background-cover";
    backgroundCover.alt = "";
  }
  const waiting = root.querySelector(".waiting");
  const timeline = panel.querySelector(".timeline");
  const times = panel.querySelector(".times");
  const metadata = [".track", ".artist", ".album"].map((selector) => panel.querySelector(selector));
  const changeTrack = byStream.changeItems(panel, settings, "overlay", () => [...metadata, timeline, times]);
  let requestedText, displayedText;
  const events = new AbortController();
  let track = null,
    received = 0,
    tick,
    artwork,
    sampler;
  panel.dataset.layout = settings.layout;
  panel.dataset.widthMode = settings.width ? "fixed" : settings.widthMode;
  details.hidden = settings.layout === "vinyl" && settings.vinylDetails !== "yes";
  if (!details.hidden && panel.dataset.widthMode === "content" && settings["details.widthMode"] === "auto") {
    const sizing = document.createElement("div");
    sizing.className = "details-size";
    details.before(sizing);
    sizing.append(details);
  }
  panel.dataset.invert = settings.invert;
  panel.style.setProperty("--cover", (settings.coverSize || (details.hidden ? 128 : 0)) + "px");
  if (!settings.coverSize && !details.hidden && settings.layout !== "compact" && (settings.showArtwork === "yes" || settings.layout === "vinyl")) {
    panel.dataset.autoCover = "";
    let frame;
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame);
      const height = entry.borderBoxSize[0].blockSize;
      if (height > 0 && !details.hasAttribute("data-stream-resizing")) frame = requestAnimationFrame(() => panel.style.setProperty("--cover", height + "px"));
    });
    observer.observe(details, { box: "border-box" });
    events.signal.addEventListener(
      "abort",
      () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
      },
      { once: true }
    );
  }
  panel.style.setProperty("--gap", settings.spacing + "px");
  panel.style.setProperty("--radius", settings.radius + "px");

  // ===== ARTWORK =====
  // An original landscape drawn locally keeps the demo cover available in downloaded overlays.
  function sampleCover(skyColors = ["#176f77", "#88d5b0"], hills = ["#419b99", "#257c80", "#246b79", "#174b61", "#112f48"]) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 192;
    const ctx = canvas.getContext("2d");
    const sky = ctx.createLinearGradient(0, 0, 160, 192);
    sky.addColorStop(0, skyColors[0]);
    sky.addColorStop(1, skyColors[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 192, 192);
    ctx.fillStyle = "#ffdc8c";
    ctx.beginPath();
    ctx.arc(126, 75, 36, 0, 2 * Math.PI);
    ctx.fill();
    for (let layer = 0; layer < 5; layer++) {
      ctx.fillStyle = hills[layer];
      ctx.beginPath();
      ctx.moveTo(0, 192);
      for (let x = 0; x <= 192; x++) ctx.lineTo(x, 99 + layer * 15 + Math.sin(x / 45 + layer) * 18 + Math.cos(x / 28) * 9);
      ctx.lineTo(192, 192);
      ctx.fill();
    }
    return canvas.toDataURL();
  }

  // Rank occupied RGB buckets by alpha-weighted population, favoring visible midtones.
  function dominant(image) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, 32, 32);
    const pixels = ctx.getImageData(0, 0, 32, 32).data;
    const buckets = new Map();
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3] / 255;
      if (alpha < 0.1) continue;
      const r = pixels[i],
        g = pixels[i + 1],
        b = pixels[i + 2];
      const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
      const bucket = buckets.get(key) || { score: 0, weight: 0, r: 0, g: 0, b: 0 };
      const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      const light = (r + g + b) / 765;
      bucket.score += alpha * (0.5 + chroma) * (1 - Math.abs(light - 0.5));
      bucket.weight += alpha;
      bucket.r += r * alpha;
      bucket.g += g * alpha;
      bucket.b += b * alpha;
      buckets.set(key, bucket);
    }
    const best = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
    return best && "rgb(" + ["r", "g", "b"].map((key) => Math.round(best[key] / best.weight)).join(" ") + ")";
  }

  cover.hidden = true;
  const changeCover = byStream.changeItems(cover, settings, "artwork", undefined, undefined, sleeve);
  const changeBackdrop = backgroundCover && byStream.changeItems(backgroundCover, settings, "coverBackdrop");

  function showArtwork(url, resolved = url) {
    changeCover(() => {
      if (url && artwork !== url) return;
      if (url) cover.src = url;
      else cover.removeAttribute("src");
    }, !!url);
    changeBackdrop?.(() => {
      if (url && artwork !== url) return;
      if (url) {
        backgroundCover.src = resolved;
        backgroundSurface.prepend(backgroundCover);
      } else {
        backgroundCover.remove();
        backgroundCover.removeAttribute("src");
      }
      backgroundSurface.classList.toggle("cover-surface", !!url);
    }, !!url);
  }

  function setArtwork(url, fallback) {
    if (artwork === url) return;
    artwork = url;
    if (sampler) {
      sampler.onload = sampler.onerror = null;
      sampler.removeAttribute("src");
      sampler = null;
    }
    panel.style.setProperty("--accent", settings.accentColor);
    if (!url) {
      showArtwork("");
      return;
    }
    // Load independently so the current cover can finish leaving with its image intact.
    const next = new Image();
    next.onload = () => {
      if (artwork === url) showArtwork(url, next.currentSrc);
    };
    next.onerror = () => {
      if (artwork !== url) return;
      if (fallback) setArtwork(fallback());
      else showArtwork("");
    };
    next.src = url;
    if (settings.autoAccent !== "yes") return;
    const image = new Image();
    sampler = image;
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (sampler !== image) return;
      try {
        const color = dominant(image);
        if (color) {
          panel.style.setProperty("--accent", color);
          resource.refreshContrast?.();
        }
      } catch {
        /* The display can still use artwork whose pixels are unavailable. */
      }
    };
    image.src = url;
  }

  // ===== PLAYBACK DISPLAY =====
  function format(seconds) {
    return Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
  }
  function elapsedPosition(state, since) {
    return Math.min(state.duration, state.position + (state.playback === "playing" ? (performance.now() - since) / 1000 : 0));
  }
  function paint() {
    const elapsed = elapsedPosition(track, received);
    panel.style.setProperty("--progress", (track.duration ? (elapsed / track.duration) * 100 : 0) + "%");
    const position = format(elapsed),
      duration = format(track.duration);
    if (times.firstElementChild.textContent !== position) times.firstElementChild.textContent = position;
    if (times.lastElementChild.textContent !== duration) times.lastElementChild.textContent = duration;
    if (track.duration && elapsed >= track.duration) panel.dataset.spinning = "false";
    if (track.playback === "playing" && elapsed < track.duration) tick = setTimeout(paint, 250);
  }
  let latest, receivedAt;
  function display(state) {
    latest = state;
    receivedAt = performance.now();
    const visible = !!state?.available && state.playback !== "stopped" && (state.playback !== "paused" || settings.paused !== "hide");
    if (!visible) {
      panel.dataset.spinning = "false";
      clearTimeout(tick);
      if (requestedText || !panel.hidden) {
        changeTrack(() => {
          if (!latest?.available || latest.playback === "stopped") setArtwork("");
        }, false);
      }
      requestedText = null;
      byStream.setElementVisible(waiting, settings.waiting === "yes");
      return;
    }
    byStream.setElementVisible(waiting, false);
    const text = [state.title, settings.showArtist === "yes" ? state.artist : "", settings.showAlbum === "yes" ? state.album : ""];
    if (!requestedText || text.some((value, i) => value !== requestedText[i])) {
      requestedText = text;
      changeTrack(() => {
        displayedText = text;
        metadata.forEach((node, i) => {
          if (node.textContent !== text[i]) node.textContent = text[i];
        });
        metadata[0].hidden = !text[0];
        updatePlayback(latest);
      });
    } else if (displayedText === requestedText) updatePlayback(state);
  }

  function updatePlayback(state) {
    track = state;
    received = receivedAt;
    panel.dataset.spinning = String(state.playback === "playing" && settings.spin === "yes");
    clearTimeout(tick);
    setArtwork(state.cover, state.fallbackCover);
    sleeve.hidden = settings.layout === "compact" || (settings.layout !== "vinyl" && settings.showArtwork !== "yes");
    panel.dataset.artwork = settings.showArtwork;
    panel.dataset.timeline = String(settings.showTimeline === "yes" && state.duration > 0);
    byStream.setElementVisible(timeline, panel.dataset.timeline === "true");
    byStream.setElementVisible(times, settings.showTime === "yes" && !!state.duration);
    paint();
  }

  if (settings.source === "demo") {
    const first = {
      title: settings.title,
      artist: settings.artist,
      album: settings.album,
      duration: settings.duration,
      position: settings.position,
      cover: settings.cover || sampleCover(),
      fallbackCover: settings.cover === resource.fields.cover.default ? sampleCover : undefined
    };
    display({ ...first, available: true, playback: settings.playback });
    const preview = window.parent !== window;
    if (preview || settings.demoControls === "yes") {
      const tracks = [
        first,
        {
          title: "Bury me (feat. Kelela)",
          artist: "PinkPantheress",
          album: "Heaven knows",
          duration: 125,
          position: 0,
          cover: "https://upload.wikimedia.org/wikipedia/en/2/20/PinkPantheress_-_Heaven_Knows.png",
          fallbackCover: () => sampleCover(["#382048", "#ef9d81"], ["#ba7292", "#995376", "#743e65", "#512e50", "#302039"])
        },
        {
          title: "Break it off (Bonus)",
          artist: "PinkPantheress",
          album: "to hell with it",
          duration: 97,
          position: 0,
          cover: "https://upload.wikimedia.org/wikipedia/en/6/6c/PinkPantheress_-_To_Hell_with_It.png",
          fallbackCover: () => sampleCover(["#213e84", "#dfcb84"], ["#8c9f59", "#738948", "#526d48", "#385340", "#223b37"])
        }
      ];
      let index = 0;
      function simulate(command) {
        const step = Number(command.step);
        if (step === 1 || step === -1) {
          index = (index + step + tracks.length) % tracks.length;
          display({ ...tracks[index], available: true, playback: latest.playback });
        } else if (command.playback === "stop") {
          display({ ...latest, playback: "stopped", position: 0 });
        } else if (command.playback === "toggle") {
          const playback = latest.playback === "playing" ? "paused" : "playing";
          const position = latest.playback === "stopped" ? 0 : elapsedPosition(latest, receivedAt);
          display({ ...latest, playback, position });
        }
      }
      if (preview)
        window.addEventListener(
          "message",
          (event) => {
            const message = event.data;
            const sameOrigin = event.origin === location.origin || (location.protocol === "file:" && event.origin === "null");
            if (event.source === window.parent && sameOrigin && message?.type === "stream-demo-track") simulate(message);
          },
          { signal: events.signal }
        );
      if (settings.demoControls === "yes") {
        const controls = root.querySelector(".demo-controls");
        controls.hidden = false;
        for (const button of controls.querySelectorAll("button")) button.addEventListener("click", () => simulate(button.dataset), { signal: events.signal });
      }
    }
  } else {
    display(null);
    byStream.subscribeNative("media", display, events.signal);
  }
  window.addEventListener(
    "pagehide",
    (event) => {
      clearTimeout(tick);
      if (!event.persisted) {
        setArtwork("");
        events.abort();
      }
    },
    { signal: events.signal }
  );
  window.addEventListener(
    "pageshow",
    (event) => {
      if (event.persisted && track && !panel.hidden) paint();
    },
    { signal: events.signal }
  );
});
