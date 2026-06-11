const state = {
  step: 1,
  image: null,
  imageFile: null,
  name: "Alex Johnson",
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

function setStep(step) {
  const panelStep = Math.min(step, 3);
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
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

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
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, "#6f4c0d");
  gradient.addColorStop(0.18, GOLD.mid);
  gradient.addColorStop(0.36, GOLD.bright);
  gradient.addColorStop(0.58, "#b98720");
  gradient.addColorStop(0.78, "#ffe88f");
  gradient.addColorStop(1, GOLD.dark);
  return gradient;
}

function fillGoldText(ctx, text, x, y, fontSize, weight, maxWidth) {
  let size = fontSize;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  do {
    ctx.font = `${weight} ${size}px Montserrat, Arial Black, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= 26) break;
    size -= 2;
  } while (size > 26);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.7)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = goldGradient(ctx, x - maxWidth / 2, y - size, x + maxWidth / 2, y + size);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawHalftone(ctx, side = "left") {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const originX = side === "left" ? 98 : 982;
  const direction = side === "left" ? 1 : -1;
  const startY = side === "left" ? 210 : 170;
  const rows = 68;
  const cols = 24;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const y = startY + row * 10.4;
      const wave = Math.sin(row * 0.16) * 42;
      const curve = Math.pow(row / rows, 1.8) * 170;
      const x = originX + direction * (col * 8.8 + wave + curve);
      const fade = 1 - col / cols;
      const verticalFade = Math.sin((row / rows) * Math.PI);
      const radius = Math.max(0.3, 2.25 * fade * verticalFade);
      const alpha = 0.48 * fade * verticalFade;
      ctx.fillStyle = `rgba(220, 166, 18, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawLogo(ctx, cx, cy, r) {
  ctx.save();
  ctx.shadowColor = "rgba(255, 234, 137, 0.4)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = GOLD.bright;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#020202";
  ctx.beginPath();
  ctx.arc(cx, cy, r - 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(231, 202, 102, .92)";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 12, 0, Math.PI * 2);
  ctx.stroke();

  const gradient = goldGradient(ctx, cx - r, cy - r, cx + r, cy + r);
  ctx.fillStyle = gradient;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, .75)";
  ctx.shadowBlur = 8;
  ctx.font = `900 ${r * 0.38}px Montserrat, Arial Black, sans-serif`;
  ctx.fillText("THE", cx, cy - r * 0.16);
  ctx.font = `900 ${r * 0.74}px Montserrat, Arial Black, sans-serif`;
  ctx.fillText("20", cx, cy + r * 0.28);
  ctx.restore();
}

function drawRing(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = goldGradient(ctx, cx - r, cy - r, cx + r, cy + r);
  ctx.lineCap = "round";
  ctx.lineWidth = 6;
  ctx.shadowColor = "rgba(255, 228, 123, 0.32)";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 2.08);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.88;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 12, Math.PI * 1.02, Math.PI * 1.42);
  ctx.stroke();

  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 24, Math.PI * 1.4, Math.PI * 1.72);
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 34, Math.PI * 1.5, Math.PI * 1.95);
  ctx.stroke();
  ctx.restore();
}

function drawPlaceholderPortrait(ctx) {
  ctx.save();
  const gradient = ctx.createRadialGradient(540, 360, 50, 540, 430, 440);
  gradient.addColorStop(0, "rgba(255,255,255,.16)");
  gradient.addColorStop(0.55, "rgba(40,40,37,.7)");
  gradient.addColorStop(1, "rgba(0,0,0,.8)");
  ctx.fillStyle = gradient;
  ctx.fillRect(90, 40, 900, 800);

  ctx.fillStyle = "rgba(231, 202, 102, .16)";
  ctx.beginPath();
  ctx.arc(540, 320, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(540, 600, 230, 190, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderAvatar(canvas) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const name = state.name.trim().toUpperCase() || "YOUR NAME";

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(560, 360, 80, 560, 360, 590);
  glow.addColorStop(0, "rgba(255,255,255,.08)");
  glow.addColorStop(0.45, "rgba(25,25,22,.55)");
  glow.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  drawHalftone(ctx, "left");
  drawHalftone(ctx, "right");
  drawRing(ctx, 540, 420, 452);

  ctx.save();
  ctx.beginPath();
  ctx.arc(540, 420, 448, 0, Math.PI * 2);
  ctx.clip();
  if (state.image) {
    drawCover(ctx, state.image, 104, 18, 872, 804);
  } else {
    drawPlaceholderPortrait(ctx);
  }

  const edge = ctx.createRadialGradient(540, 390, 180, 540, 400, 480);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(0.62, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,.72)");
  ctx.fillStyle = edge;
  ctx.fillRect(58, -10, 964, 888);

  const bottomFade = ctx.createLinearGradient(0, 530, 0, 860);
  bottomFade.addColorStop(0, "rgba(0,0,0,0)");
  bottomFade.addColorStop(0.44, "rgba(0,0,0,.5)");
  bottomFade.addColorStop(0.72, "rgba(0,0,0,.95)");
  bottomFade.addColorStop(1, "#000");
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, 500, width, 370);
  ctx.restore();

  drawRing(ctx, 540, 420, 452);
  drawLogo(ctx, 160, 170, 88);

  fillGoldText(ctx, name, 540, 686, 49, 900, 775);

  ctx.save();
  ctx.strokeStyle = goldGradient(ctx, 390, 722, 690, 722);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(398, 724);
  ctx.lineTo(682, 724);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 27px Manrope, Avenir Next, sans-serif";
  ctx.fillStyle = GOLD.bright;
  ctx.fillText("MEMBER OF", 540, 780);

  fillGoldText(ctx, "THE 20", 540, 844, 76, 900, 520);

  ctx.fillStyle = "#fff";
  ctx.font = "800 25px Manrope, Avenir Next, sans-serif";
  ctx.fillText("The Leke Alder Fellows Program", 540, 907);
  ctx.font = "800 23px Manrope, Avenir Next, sans-serif";
  ctx.fillText("for Kings, Priests, Masters & Creatives.", 540, 941);
}

function renderAll() {
  renderAvatar(els.previewCanvas);
  renderAvatar(els.finalCanvas);
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
      await navigator.share({
        title: "The 20 Avatar",
        text: shareCopy,
        files: [file],
      });
      return true;
    }
    if (navigator.share) {
      await navigator.share({
        title: "The 20 Avatar",
        text: shareCopy,
        url: "https://the20.com",
      });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function handleShare(platform) {
  if (platform === "copy") {
    await copyShareText();
    return;
  }

  if (platform === "instagram") {
    const shared = await shareNative();
    if (!shared) {
      showToast("Download the image, then post it to Instagram.");
    }
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

els.fileInput.addEventListener("change", (event) => {
  loadPhoto(event.target.files[0]);
});

["dragenter", "dragover"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("is-dragging");
  });
});

els.dropZone.addEventListener("drop", (event) => {
  loadPhoto(event.dataTransfer.files[0]);
});

els.nameInput.addEventListener("input", (event) => {
  updateName(event.target.value);
});

els.nextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const next = Number(button.dataset.next);
    if (canOpenStep(next)) {
      setStep(next);
    } else {
      showToast("Upload a photo and add your name first.");
    }
  });
});

els.steps.forEach((stepButton) => {
  stepButton.addEventListener("click", () => {
    const step = Number(stepButton.dataset.jumpStep);
    if (step === 4 && canOpenStep(step)) {
      downloadAvatar();
      return;
    }

    if (canOpenStep(step)) {
      setStep(Math.min(step, 3));
    }
  });
});

els.downloadButton.addEventListener("click", downloadAvatar);

els.shareButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleShare(button.dataset.share);
  });
});

document.fonts.ready.then(() => {
  updateName(els.nameInput.value);
  setStep(1);
});
