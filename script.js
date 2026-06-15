import { removeBackground } from "@imgly/background-removal";

const state = {
  step: 1,
  image: null,
  imageFile: null,
  processedImage: null,
  bgRemoving: false,
  name: "",
  template: "A",
  toastTimer: null,
};

const els = {
  panels: [...document.querySelectorAll("[data-panel]")],
  steps: [...document.querySelectorAll("[data-jump-step]")],
  fileInput: document.querySelector("#photo-input"),
  dropZone: document.querySelector(".drop-zone"),
  nameInput: document.querySelector("#full-name"),
  nameCount: document.querySelector("#name-count"),
  previewCanvas: document.querySelector("#preview-canvas"),
  finalCanvas: document.querySelector("#final-canvas"),
  downloadButton: document.querySelector("#download-button"),
  nextButtons: [...document.querySelectorAll("[data-next]")],
  shareButtons: [...document.querySelectorAll("[data-share]")],
  templateCards: [...document.querySelectorAll("[data-template]")],
  thumbCanvases: [...document.querySelectorAll("[data-thumb]")],
  toast: document.querySelector(".toast"),
  bgOverlay: document.querySelector("#bg-remove-overlay"),
};

const GOLD = {
  bright: "#fff1a8",
  mid: "#dfbd55",
  dark: "#7c570f",
  line: "#e7ca66",
};

const shareCopy =
  "I just created my The 20 avatar for The Leke Alder Fellows Program for Kings, Priests, Masters & Creatives.";

function fetchImage(src, onload) {
  const img = new Image();
  img.onload = onload;
  fetch(src)
    .then((r) => r.blob())
    .then((blob) => { img.src = URL.createObjectURL(blob); })
    .catch(() => { img.src = src; });
  return img;
}

const logoImage = fetchImage("/the20-logo.png", () => renderAll());
const classicRingImage = fetchImage("/classic-ring.png", () => renderAll());
const brushstrokeImage = fetchImage("/brushstroke.png", () => renderAll());

function setStep(step) {
  const panelStep = Math.min(step, 4);
  state.step = step;
  document.body.dataset.step = String(step);

  els.panels.forEach((panel) => {
    panel.classList.toggle("is-active", Number(panel.dataset.panel) === panelStep);
  });

  els.steps.forEach((stepButton) => {
    const value = Number(stepButton.dataset.jumpStep);
    const unlocked = canOpenStep(value);
    stepButton.disabled = !unlocked;
    stepButton.classList.toggle("is-active", value === step);
    stepButton.classList.toggle("is-complete", value < step || (value === 4 && step === 4));

    const index = stepButton.querySelector(".step-index");
    if (index) {
      index.textContent = value < step ? "✓" : String(value);
    }
  });

  if (panelStep === 3) renderThumbs();
  renderAll();
}

function canOpenStep(step) {
  if (step === 1) return true;
  if (step === 2) return Boolean(state.image);
  if (step === 3) return Boolean(state.image && state.name.trim());
  if (step === 4) return Boolean(state.image && state.name.trim());
  return false;
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2600);
}

function updateName(value) {
  state.name = value.trim();
  els.nameCount.textContent = String(value.length);
  if (state.name) els.nameInput.classList.remove("is-error");
  renderAll();
}

function loadPhoto(file) {
  if (!file) return;

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    showToast("Please choose a JPG, PNG, or WEBP image.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast("Please choose an image under 5MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = async () => {
      state.image = image;
      state.imageFile = file;
      state.processedImage = null;
      els.dropZone.classList.add("has-image");
      els.dropZone.querySelector("strong").innerHTML = "Photo selected<br />click to replace";
      els.dropZone.querySelector("small").textContent = file.name;

      // Show loading overlay and run background removal
      state.bgRemoving = true;
      els.bgOverlay.classList.add("is-visible");
      renderAll();

      try {
        const resultBlob = await removeBackground(file, {
          publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        });
        const url = URL.createObjectURL(resultBlob);
        const processed = new Image();
        processed.onload = () => {
          state.processedImage = processed;
          state.bgRemoving = false;
          els.bgOverlay.classList.remove("is-visible");
          setStep(2);
          renderAll();
        };
        processed.onerror = () => {
          state.bgRemoving = false;
          els.bgOverlay.classList.remove("is-visible");
          showToast("Background removal failed — using original photo.");
          setStep(2);
          renderAll();
        };
        processed.src = url;
      } catch {
        state.bgRemoving = false;
        els.bgOverlay.classList.remove("is-visible");
        showToast("Background removal failed — using original photo.");
        setStep(2);
        renderAll();
      }
    };
    image.onerror = () => showToast("That image could not be loaded.");
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function drawCover(ctx, image, x, y, width, height) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sx = 0, sy = 0, sw = image.width, sh = image.height;

  if (sourceRatio > targetRatio) {
    sw = image.height * targetRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / targetRatio;
    sy = (image.height - sh) / 2;
  }

  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function goldGradient(ctx, x1, y1, x2, y2) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0,    "#5a3a08");
  g.addColorStop(0.15, "#c9a84c");
  g.addColorStop(0.35, GOLD.bright);
  g.addColorStop(0.55, "#b08020");
  g.addColorStop(0.78, "#ffe88f");
  g.addColorStop(1,    GOLD.dark);
  return g;
}

function fillGoldText(ctx, text, x, y, fontSize, weight, maxWidth) {
  let size = fontSize;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  do {
    ctx.font = `${weight} ${size}px Montserrat, Arial Black, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= 24) break;
    size -= 2;
  } while (size > 24);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.8)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = goldGradient(ctx, x - maxWidth / 2, y - size, x + maxWidth / 2, y + size);
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Halftone dot field on sides — matches template
function drawHalftone(ctx, S, side) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const cols = 22;
  const rows = 72;
  const originX = side === "left" ? S * 0.09 : S * 0.91;
  const dir = side === "left" ? 1 : -1;
  const startY = S * 0.20;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = r / rows;
      const y = startY + r * (S * 0.0096);
      const wave = Math.sin(r * 0.17) * S * 0.038;
      const curve = Math.pow(t, 1.7) * S * 0.16;
      const x = originX + dir * (c * S * 0.008 + wave + curve);
      const fade = 1 - c / cols;
      const vFade = Math.sin(t * Math.PI);
      const radius = Math.max(0.3, S * 0.0021 * fade * vFade);
      const alpha = 0.5 * fade * vFade;
      ctx.fillStyle = `rgba(220,166,18,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Arc runs ~300° clockwise, gap at top-left (~10 o'clock)
// start = 230° = Math.PI*1.278,  sweep = 300° = Math.PI*1.667
const ARC_START = Math.PI * 1.28;
const ARC_END   = ARC_START + Math.PI * 1.67;

function drawRingA(ctx, S) {
  // Template A: thick smooth gold arc with strong glow
  const cx = S * 0.5;
  const cy = S * 0.43;
  const r  = S * 0.44;
  const grad = goldGradient(ctx, cx - r, cy - r, cx + r, cy + r);

  ctx.save();
  ctx.lineCap = "round";

  // Outer soft glow pass
  ctx.strokeStyle = "rgba(200,155,20,0.25)";
  ctx.lineWidth   = S * 0.072;
  ctx.shadowColor = "rgba(231,202,60,0)";
  ctx.shadowBlur  = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, r, ARC_START, ARC_END);
  ctx.stroke();

  // Main thick arc
  ctx.strokeStyle = grad;
  ctx.lineWidth   = S * 0.034;
  ctx.shadowColor = "rgba(255,228,80,0.7)";
  ctx.shadowBlur  = S * 0.028;
  ctx.beginPath();
  ctx.arc(cx, cy, r, ARC_START, ARC_END);
  ctx.stroke();

  // Bright inner highlight (centre of the stroke)
  ctx.shadowBlur  = S * 0.01;
  ctx.shadowColor = "rgba(255,248,180,0.9)";
  ctx.strokeStyle = "rgba(255,248,180,0.55)";
  ctx.lineWidth   = S * 0.01;
  ctx.beginPath();
  ctx.arc(cx, cy, r, ARC_START + 0.05, ARC_END - 0.05);
  ctx.stroke();

  ctx.restore();
}

function drawRingB(ctx, S) {
  // Template B: same thick arc + extra painted sweeps at bottom
  const cx = S * 0.5;
  const cy = S * 0.43;
  const r  = S * 0.44;
  const grad = goldGradient(ctx, cx - r, cy - r, cx + r, cy + r);

  ctx.save();
  ctx.lineCap = "round";

  // Outer soft glow
  ctx.strokeStyle = "rgba(200,155,20,0.22)";
  ctx.lineWidth   = S * 0.072;
  ctx.shadowBlur  = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, r, ARC_START, ARC_END);
  ctx.stroke();

  // Main thick arc
  ctx.strokeStyle = grad;
  ctx.lineWidth   = S * 0.034;
  ctx.shadowColor = "rgba(255,228,80,0.7)";
  ctx.shadowBlur  = S * 0.028;
  ctx.beginPath();
  ctx.arc(cx, cy, r, ARC_START, ARC_END);
  ctx.stroke();

  // Bright inner highlight
  ctx.shadowBlur  = S * 0.01;
  ctx.shadowColor = "rgba(255,248,180,0.9)";
  ctx.strokeStyle = "rgba(255,248,180,0.55)";
  ctx.lineWidth   = S * 0.01;
  ctx.beginPath();
  ctx.arc(cx, cy, r, ARC_START + 0.05, ARC_END - 0.05);
  ctx.stroke();

  // Extra heavy paint sweeps at bottom — distinctive brushstroke feel
  ctx.shadowBlur  = S * 0.018;
  ctx.shadowColor = "rgba(231,202,102,0.6)";

  ctx.globalAlpha = 1;
  ctx.strokeStyle = grad;
  ctx.lineWidth   = S * 0.026;
  ctx.beginPath();
  ctx.arc(cx, cy, r + S * 0.01, Math.PI * 1.28, Math.PI * 1.62);
  ctx.stroke();

  ctx.globalAlpha = 0.75;
  ctx.lineWidth   = S * 0.018;
  ctx.beginPath();
  ctx.arc(cx, cy, r + S * 0.024, Math.PI * 1.58, Math.PI * 1.85);
  ctx.stroke();

  ctx.globalAlpha = 0.45;
  ctx.lineWidth   = S * 0.011;
  ctx.beginPath();
  ctx.arc(cx, cy, r + S * 0.036, Math.PI * 1.80, Math.PI * 2.04);
  ctx.stroke();

  ctx.restore();
}

function drawLogo(ctx, cx, cy, r) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 12;
  // Clip to circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (logoImage.complete && logoImage.naturalWidth > 0) {
    ctx.drawImage(logoImage, cx - r, cy - r, r * 2, r * 2);
  } else {
    // Fallback drawn logo
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = GOLD.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = goldGradient(ctx, cx - r, cy - r, cx + r, cy + r);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${r * 0.36}px Montserrat, sans-serif`;
    ctx.fillText("THE", cx, cy - r * 0.18);
    ctx.font = `900 ${r * 0.72}px Montserrat, sans-serif`;
    ctx.fillText("20", cx, cy + r * 0.28);
  }
  ctx.restore();
}

function drawPlaceholderPortrait(ctx, S) {
  ctx.save();
  const g = ctx.createRadialGradient(S * 0.5, S * 0.35, S * 0.05, S * 0.5, S * 0.42, S * 0.42);
  g.addColorStop(0, "rgba(255,255,255,.15)");
  g.addColorStop(0.5, "rgba(40,40,37,.65)");
  g.addColorStop(1, "rgba(0,0,0,.85)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  ctx.fillStyle = "rgba(231,202,102,.14)";
  ctx.beginPath();
  ctx.arc(S * 0.5, S * 0.3, S * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(S * 0.5, S * 0.55, S * 0.2, S * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderAvatar(canvas, templateOverride) {
  const ctx = canvas.getContext("2d");
  const S = canvas.width; // square canvas
  const name = state.name.trim().toUpperCase() || "YOUR NAME";
  const tpl = templateOverride || state.template;

  const useRingImage  = tpl === "A" && classicRingImage.complete && classicRingImage.naturalWidth > 0;
  const useBrushImage = tpl === "B" && brushstrokeImage.complete && brushstrokeImage.naturalWidth > 0;

  ctx.clearRect(0, 0, S, S);

  // ── 1. Black background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, S, S);

  if (useRingImage) {
    // ═══════════════════════════════════════════════
    // CLASSIC TEMPLATE — matches desired-result.png
    // ═══════════════════════════════════════════════

    // Layer 1: full-canvas background
    ctx.drawImage(classicRingImage, 0, 0, S, S);

    // Layer 2: person photo (bg-removed preferred, else original) on right side
    const photoSrc = state.processedImage || state.image;
    const photoX = S * 0.35;
    const photoW = S * 0.65;
    const photoH = S;

    if (photoSrc) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(photoX, 0, photoW, photoH);
      ctx.clip();

      // Scale to cover the full height; center horizontally within region
      const srcAspect = photoSrc.width / photoSrc.height;
      const tgtAspect = photoW / photoH;
      let sx = 0, sy = 0, sw = photoSrc.width, sh = photoSrc.height;
      if (srcAspect > tgtAspect) {
        // source is wider — crop sides, show full height
        sw = photoSrc.height * tgtAspect;
        sx = (photoSrc.width - sw) / 2;
      } else {
        // source is taller — crop bottom, show from top (keeps head visible)
        sh = photoSrc.width / tgtAspect;
        sy = 0;
      }
      ctx.drawImage(photoSrc, sx, sy, sw, sh, photoX, 0, photoW, photoH);
      ctx.restore();
    } else {
      drawPlaceholderPortrait(ctx, S);
    }

    // Layer 3: text block — left-aligned
    const TX = S * 0.07;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // "MEMBER OF"
    ctx.font = `800 ${S * 0.028}px Manrope, Avenir Next, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("MEMBER OF", TX, S * 0.375);

    // Gold divider under "MEMBER OF"
    ctx.save();
    ctx.strokeStyle = goldGradient(ctx, TX, S * 0.425, TX + S * 0.38, S * 0.425);
    ctx.lineWidth = S * 0.0018;
    ctx.beginPath();
    ctx.moveTo(TX, S * 0.425);
    ctx.lineTo(TX + S * 0.38, S * 0.425);
    ctx.stroke();
    ctx.restore();

    // "THE 20" — large gold headline
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.font = `900 ${S * 0.11}px Montserrat, Arial Black, sans-serif`;
    ctx.fillStyle = goldGradient(ctx, TX, S * 0.455, TX + S * 0.44, S * 0.575);
    ctx.fillText("THE 20", TX, S * 0.515);
    ctx.restore();

    // Name
    ctx.font = `900 ${S * 0.050}px Manrope, Avenir Next, sans-serif`;
    ctx.fillStyle = GOLD.line;
    ctx.fillText(name, TX, S * 0.625);

    // Gold divider under name
    ctx.save();
    ctx.strokeStyle = goldGradient(ctx, TX, S * 0.665, TX + S * 0.36, S * 0.665);
    ctx.lineWidth = S * 0.0018;
    ctx.beginPath();
    ctx.moveTo(TX, S * 0.665);
    ctx.lineTo(TX + S * 0.36, S * 0.665);
    ctx.stroke();
    ctx.restore();

    // Tagline
    ctx.fillStyle = "#e8e4dc";
    ctx.font = `500 ${S * 0.025}px Manrope, Avenir Next, sans-serif`;
    ctx.fillText("The Leke Alder Fellows Program", TX, S * 0.725);
    ctx.font = `500 ${S * 0.023}px Manrope, Avenir Next, sans-serif`;
    ctx.fillText("for Kings, Priests, Masters & Creatives.", TX, S * 0.768);

  } else {
    // ═══════════════════════════════════════════════
    // BRUSHSTROKE / FALLBACK TEMPLATES
    // ═══════════════════════════════════════════════

    const RING_CX     = S * 0.50;
    const RING_CY     = S * 0.47;
    const RING_INNER_R = S * 0.39;

    // Subtle radial glow
    const glow = ctx.createRadialGradient(S * 0.52, S * 0.34, S * 0.07, S * 0.52, S * 0.38, S * 0.55);
    glow.addColorStop(0, "rgba(255,255,255,.07)");
    glow.addColorStop(0.4, "rgba(20,20,18,.5)");
    glow.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, S, S);

    // Halftone dot fields
    drawHalftone(ctx, S, "left");
    drawHalftone(ctx, S, "right");

    // Gold ring fallback (no image)
    if (tpl === "B" && !useBrushImage) drawRingB(ctx, S);
    else if (!useBrushImage) drawRingA(ctx, S);

    // Portrait photo
    if (useBrushImage) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(RING_CX, RING_CY, RING_INNER_R, 0, Math.PI * 2);
      ctx.clip();
      if (state.image) {
        drawCover(ctx, state.image, RING_CX - RING_INNER_R, RING_CY - RING_INNER_R, RING_INNER_R * 2, RING_INNER_R * 2);
      } else {
        drawPlaceholderPortrait(ctx, S);
      }
      ctx.restore();
    } else {
      if (state.image) drawCover(ctx, state.image, 0, 0, S, S);
      else drawPlaceholderPortrait(ctx, S);
    }

    // Vignette (non-brushstroke only)
    if (!useBrushImage) {
      const leftV = ctx.createLinearGradient(0, 0, S * 0.22, 0);
      leftV.addColorStop(0, "rgba(0,0,0,0.92)");
      leftV.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = leftV;
      ctx.fillRect(0, 0, S * 0.22, S);

      const rightV = ctx.createLinearGradient(S, 0, S * 0.78, 0);
      rightV.addColorStop(0, "rgba(0,0,0,0.92)");
      rightV.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rightV;
      ctx.fillRect(S * 0.78, 0, S * 0.22, S);

      const topV = ctx.createLinearGradient(0, 0, 0, S * 0.15);
      topV.addColorStop(0, "rgba(0,0,0,0.55)");
      topV.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topV;
      ctx.fillRect(0, 0, S, S * 0.15);
    }

    // Bottom fade + solid text area
    const bottomFade = ctx.createLinearGradient(0, S * 0.55, 0, S * 0.64);
    bottomFade.addColorStop(0, "rgba(0,0,0,0)");
    bottomFade.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = bottomFade;
    ctx.fillRect(0, S * 0.55, S, S * 0.09);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, S * 0.64, S, S * 0.36);

    // Brushstroke overlay
    if (useBrushImage) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(brushstrokeImage, 0, 0, S, S);
      ctx.restore();
    }

    // Logo badge
    const logoR = S * 0.09;
    drawLogo(ctx, S * 0.16, S * 0.16, logoR);

    // Text — centered
    const textOffset = useBrushImage ? S * 0.04 : 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    fillGoldText(ctx, name, S * 0.5, S * 0.666 + textOffset, S * 0.040, 900, S * 0.82);

    ctx.save();
    ctx.strokeStyle = goldGradient(ctx, S * 0.3, S * 0.696 + textOffset, S * 0.7, S * 0.696 + textOffset);
    ctx.lineWidth = S * 0.0015;
    ctx.beginPath();
    ctx.moveTo(S * 0.305, S * 0.696 + textOffset);
    ctx.lineTo(S * 0.695, S * 0.696 + textOffset);
    ctx.stroke();
    ctx.restore();

    ctx.font = `800 ${S * 0.024}px Manrope, Avenir Next, sans-serif`;
    ctx.fillStyle = GOLD.bright;
    ctx.fillText("MEMBER OF", S * 0.5, S * 0.730 + textOffset);

    fillGoldText(ctx, "THE 20", S * 0.5, S * 0.786 + textOffset, S * 0.072, 900, S * 0.6);

    ctx.fillStyle = "#e8e4dc";
    ctx.font = `600 ${S * 0.024}px Manrope, Avenir Next, sans-serif`;
    ctx.fillText("The Leke Alder Fellows Program", S * 0.5, S * 0.840 + textOffset);
    ctx.font = `600 ${S * 0.022}px Manrope, Avenir Next, sans-serif`;
    ctx.fillText("for Kings, Priests, Masters & Creatives.", S * 0.5, S * 0.865 + textOffset);
  }
}

function renderAll() {
  renderAvatar(els.previewCanvas);
  renderAvatar(els.finalCanvas);
}

function renderThumbs() {
  els.thumbCanvases.forEach((canvas) => {
    renderAvatar(canvas, canvas.dataset.thumb);
  });
}

function downloadAvatar() {
  if (!state.image) {
    showToast("Upload your photo first.");
    setStep(1);
    return;
  }

  renderAvatar(els.finalCanvas);
  const fileName = state.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  try {
    const link = document.createElement("a");
    link.download = `${fileName || "the-20"}-avatar.png`;
    link.href = els.finalCanvas.toDataURL("image/png");
    link.click();
    setStep(4);
    showToast("Avatar downloaded.");
  } catch {
    showToast("Download failed — open the app via a web server, not a local file.");
  }
}

async function copyShareText() {
  try {
    await navigator.clipboard.writeText(`${shareCopy} https://the20.com`);
    showToast("Share text copied.");
  } catch {
    showToast("Copy failed. You can still download the avatar.");
  }
}

async function shareNative() {
  try {
    const blob = await new Promise((resolve) => els.finalCanvas.toBlob(resolve, "image/png"));
    const file = new File([blob], "the-20-avatar.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: "The 20 Avatar", text: shareCopy, files: [file] });
      return true;
    }
    if (navigator.share) {
      await navigator.share({ title: "The 20 Avatar", text: shareCopy, url: "https://the20.com" });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function handleShare(platform) {
  if (platform === "copy") { await copyShareText(); return; }

  if (platform === "instagram") {
    const shared = await shareNative();
    if (!shared) showToast("Download the image, then post it to Instagram.");
    return;
  }

  const encodedText = encodeURIComponent(shareCopy);
  const encodedUrl = encodeURIComponent("https://the20.com");
  const urls = {
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
  window.open(urls[platform], "_blank", "noopener,noreferrer,width=760,height=640");
}

// ── Event listeners ──────────────────────────────────────────────

els.fileInput.addEventListener("change", (e) => loadPhoto(e.target.files[0]));

["dragenter", "dragover"].forEach((ev) => {
  els.dropZone.addEventListener(ev, (e) => { e.preventDefault(); els.dropZone.classList.add("is-dragging"); });
});
["dragleave", "drop"].forEach((ev) => {
  els.dropZone.addEventListener(ev, (e) => { e.preventDefault(); els.dropZone.classList.remove("is-dragging"); });
});
els.dropZone.addEventListener("drop", (e) => loadPhoto(e.dataTransfer.files[0]));

els.nameInput.addEventListener("input", (e) => updateName(e.target.value));

els.nextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const next = Number(button.dataset.next);
    if (canOpenStep(next)) {
      setStep(next);
    } else if (!state.image) {
      showToast("Upload a photo first.");
    } else {
      els.nameInput.classList.add("is-error");
      els.nameInput.focus();
      showToast("Enter your name to continue.");
    }
  });
});

els.steps.forEach((stepButton) => {
  stepButton.addEventListener("click", () => {
    const step = Number(stepButton.dataset.jumpStep);
    if (step === 4 && canOpenStep(step)) { downloadAvatar(); return; }
    if (canOpenStep(step)) setStep(Math.min(step, 4));
  });
});

els.templateCards.forEach((card) => {
  card.addEventListener("click", () => {
    state.template = card.dataset.template;
    els.templateCards.forEach((c) => c.classList.toggle("is-selected", c === card));
    renderAll();
  });
});

els.downloadButton.addEventListener("click", downloadAvatar);

els.shareButtons.forEach((button) => {
  button.addEventListener("click", () => handleShare(button.dataset.share));
});

// onload handlers are set in fetchImage above

// ── Theme toggle ─────────────────────────────────────────
const themeToggle = document.querySelector("#theme-toggle");
const themeLabel = themeToggle.querySelector(".theme-label");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeLabel.textContent = theme === "light" ? "Dark" : "Light";
  localStorage.setItem("theme", theme);
}

applyTheme(localStorage.getItem("theme") || "dark");

themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
});

document.fonts.ready.then(() => {
  updateName(els.nameInput.value);
  setStep(1);
});
