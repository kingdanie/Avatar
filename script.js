const state = {
  step: 1,
  image: null,
  imageFile: null,
  name: "Alex Johnson",
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
};

const GOLD = {
  bright: "#fff1a8",
  mid: "#dfbd55",
  dark: "#7c570f",
  line: "#e7ca66",
};

const shareCopy =
  "I just created my The 20 avatar for The Leke Alder Fellows Program for Kings, Priests, Masters & Creatives.";

const logoImage = new Image();
logoImage.src = "public/the20-logo.png";

const classicRingImage = new Image();
classicRingImage.src = "public/classic-ring.png";
classicRingImage.onload = () => renderAll();

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
  state.name = value.trim() || "Your Name";
  els.nameCount.textContent = String(value.length);
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
    image.onload = () => {
      state.image = image;
      state.imageFile = file;
      els.dropZone.classList.add("has-image");
      els.dropZone.querySelector("strong").innerHTML = "Photo selected<br />click to replace";
      els.dropZone.querySelector("small").textContent = file.name;
      setStep(2);
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

  // Classic ring image geometry — must match the proportions in classic-ring.png
  const RING_CX = S * 0.50;
  const RING_CY = S * 0.47;
  const RING_INNER_R = S * 0.39;
  const useRingImage = tpl === "A" && classicRingImage.complete && classicRingImage.naturalWidth > 0;

  ctx.clearRect(0, 0, S, S);

  // ── 1. Black background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, S, S);

  // ── 2. Subtle radial glow centre
  const glow = ctx.createRadialGradient(S * 0.52, S * 0.34, S * 0.07, S * 0.52, S * 0.38, S * 0.55);
  glow.addColorStop(0, "rgba(255,255,255,.07)");
  glow.addColorStop(0.4, "rgba(20,20,18,.5)");
  glow.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // ── 3. Halftone dot fields on sides
  drawHalftone(ctx, S, "left");
  drawHalftone(ctx, S, "right");

  // ── 4. Gold ring behind portrait (template B only; ring image composited later for A)
  if (tpl === "B") drawRingB(ctx, S);
  else if (!useRingImage) drawRingA(ctx, S);

  // ── 5. Portrait photo
  if (useRingImage) {
    // Clip photo strictly to ring interior so it never overflows the ring
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
    if (state.image) {
      drawCover(ctx, state.image, 0, 0, S, S);
    } else {
      drawPlaceholderPortrait(ctx, S);
    }
  }

  // ── 6. Vignette
  if (!useRingImage) {
    // Left edge
    const leftV = ctx.createLinearGradient(0, 0, S * 0.22, 0);
    leftV.addColorStop(0, "rgba(0,0,0,0.92)");
    leftV.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = leftV;
    ctx.fillRect(0, 0, S * 0.22, S);

    // Right edge
    const rightV = ctx.createLinearGradient(S, 0, S * 0.78, 0);
    rightV.addColorStop(0, "rgba(0,0,0,0.92)");
    rightV.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rightV;
    ctx.fillRect(S * 0.78, 0, S * 0.22, S);

    // Top edge subtle darkening
    const topV = ctx.createLinearGradient(0, 0, 0, S * 0.15);
    topV.addColorStop(0, "rgba(0,0,0,0.55)");
    topV.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topV;
    ctx.fillRect(0, 0, S, S * 0.15);
  }

  // Bottom fade into text area (applies to both templates)
  const bottomFade = ctx.createLinearGradient(0, S * 0.52, 0, S * 0.74);
  bottomFade.addColorStop(0, "rgba(0,0,0,0)");
  bottomFade.addColorStop(0.5, "rgba(0,0,0,0.75)");
  bottomFade.addColorStop(1, "#000");
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, S * 0.52, S, S * 0.22);

  // Solid black lower section for text
  ctx.fillStyle = "#000";
  ctx.fillRect(0, S * 0.74, S, S * 0.26);

  // ── 7. Ring drawn on top of photo
  if (tpl === "B") {
    drawRingB(ctx, S);
  } else if (useRingImage) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(classicRingImage, 0, 0, S, S);
    ctx.restore();
  } else {
    drawRingA(ctx, S);
  }

  // ── 8. Logo badge (ring image already includes it for template A)
  if (!useRingImage) {
    const logoR = S * 0.09;
    drawLogo(ctx, S * 0.16, S * 0.16, logoR);
  }

  // ── 9. Name — sits just inside the black area
  fillGoldText(ctx, name, S * 0.5, S * 0.772, S * 0.058, 900, S * 0.82);

  // Divider line
  ctx.save();
  ctx.strokeStyle = goldGradient(ctx, S * 0.3, S * 0.806, S * 0.7, S * 0.806);
  ctx.lineWidth = S * 0.002;
  ctx.beginPath();
  ctx.moveTo(S * 0.305, S * 0.808);
  ctx.lineTo(S * 0.695, S * 0.808);
  ctx.stroke();
  ctx.restore();

  // "MEMBER OF"
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${S * 0.032}px Manrope, Avenir Next, sans-serif`;
  ctx.fillStyle = GOLD.bright;
  ctx.fillText("MEMBER OF", S * 0.5, S * 0.843);

  // "THE 20"
  fillGoldText(ctx, "THE 20", S * 0.5, S * 0.901, S * 0.09, 900, S * 0.6);

  // Tagline
  ctx.fillStyle = "#e8e4dc";
  ctx.font = `600 ${S * 0.026}px Manrope, Avenir Next, sans-serif`;
  ctx.fillText("The Leke Alder Fellows Program", S * 0.5, S * 0.952);
  ctx.font = `600 ${S * 0.024}px Manrope, Avenir Next, sans-serif`;
  ctx.fillText("for Kings, Priests, Masters & Creatives.", S * 0.5, S * 0.978);
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
  const link = document.createElement("a");
  const fileName = state.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  link.download = `${fileName || "the-20"}-avatar.png`;
  link.href = els.finalCanvas.toDataURL("image/png");
  link.click();
  setStep(4);
  showToast("Avatar downloaded.");
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
    if (canOpenStep(next)) setStep(next);
    else showToast("Upload a photo and add your name first.");
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

logoImage.onload = () => renderAll();

document.fonts.ready.then(() => {
  updateName(els.nameInput.value);
  setStep(1);
});
