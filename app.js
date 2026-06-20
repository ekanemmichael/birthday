const apiUrl = "/api/card";
const defaultRecipient = "Friend";

const defaultPhoto =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 640'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23ffd0dc'/%3E%3Cstop offset='.48' stop-color='%23f2b84b'/%3E%3Cstop offset='1' stop-color='%23b7e2dd'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='640' fill='url(%23g)'/%3E%3Ccircle cx='240' cy='220' r='92' fill='%23fffaf2' opacity='.8'/%3E%3Cpath d='M120 560c78-140 166-210 264-210s186 70 264 210' fill='%23fffaf2' opacity='.78'/%3E%3C/svg%3E";

const elements = {
  body: document.body,
  birthdayName: document.querySelector("#birthday-name"),
  createWallButton: document.querySelector("#create-wall-button"),
  createWallForm: document.querySelector("#create-wall-form"),
  starterTitle: document.querySelector("#starter-title"),
  newRecipientInput: document.querySelector("#new-recipient-input"),
  linkPanel: document.querySelector("#link-panel"),
  wishLinkOutput: document.querySelector("#wish-link-output"),
  viewLinkOutput: document.querySelector("#view-link-output"),
  adminLinkOutput: document.querySelector("#admin-link-output"),
  recipientInput: document.querySelector("#recipient-input"),
  celebrationMode: document.querySelector("#celebration-mode"),
  form: document.querySelector("#wish-form"),
  photoInput: document.querySelector("#photo-input"),
  photoPreview: document.querySelector("#photo-preview"),
  nameInput: document.querySelector("#name-input"),
  wishInput: document.querySelector("#wish-input"),
  noteInput: document.querySelector("#note-input"),
  grid: document.querySelector("#wishes-grid"),
  template: document.querySelector("#wish-card-template"),
  copyLink: document.querySelector("#copy-card-link"),
  clearWishes: document.querySelector("#clear-wishes"),
  scrollToForm: document.querySelector("#scroll-to-form"),
  toast: document.querySelector("#toast"),
  canvas: document.querySelector("#confetti-canvas"),
};

const params = new URLSearchParams(window.location.search);
let wallId = params.get("wall") || "";
let adminToken = params.get("admin") || "";
let isViewOnly = params.get("view") === "card";
let wishes = [];
let photoData = "";
let toastTimer = 0;
let apiAvailable = false;

function currentRecipient() {
  return elements.recipientInput.value.trim() || defaultRecipient;
}

function baseUrl() {
  return window.location.href.split(/[?#]/)[0];
}

function wallLinks(id, token) {
  const root = baseUrl();
  return {
    wish: `${root}?wall=${encodeURIComponent(id)}`,
    view: `${root}?wall=${encodeURIComponent(id)}&view=card`,
    admin: `${root}?wall=${encodeURIComponent(id)}&admin=${encodeURIComponent(token)}`,
  };
}

function showWallLinks(id = wallId, token = adminToken) {
  if (!id) return;
  const links = wallLinks(id, token);
  elements.wishLinkOutput.value = links.wish;
  elements.viewLinkOutput.value = links.view;
  elements.adminLinkOutput.value = token ? links.admin : "";
  elements.adminLinkOutput.closest(".field").hidden = !token;
  elements.linkPanel.hidden = false;
}

function setMode() {
  elements.body.classList.toggle("home-mode", !wallId);
  elements.body.classList.toggle("wall-mode", Boolean(wallId));
  elements.body.classList.toggle("admin-mode", Boolean(wallId && adminToken));
  elements.body.classList.toggle("contributor-mode", Boolean(wallId && !adminToken && !isViewOnly));
  elements.body.classList.toggle("shared-card", Boolean(wallId && isViewOnly));
  elements.starterTitle.textContent = wallId && adminToken ? "Share this wall" : "Create a birthday wall";
}

function localKey() {
  return `birthday-card:${wallId || "draft"}`;
}

function saveLocal() {
  localStorage.setItem(localKey(), JSON.stringify({
    recipient: currentRecipient(),
    wishes,
  }));
}

function loadLocal() {
  const saved = localStorage.getItem(localKey());
  if (!saved) return false;

  try {
    const card = JSON.parse(saved);
    wishes = Array.isArray(card.wishes) ? card.wishes : [];
    elements.recipientInput.value = card.recipient || defaultRecipient;
    return true;
  } catch (error) {
    return false;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  apiAvailable = true;
  return response.json();
}

async function loadRemoteWall() {
  const card = await requestJson(`${apiUrl}?wall=${encodeURIComponent(wallId)}`);
  wishes = Array.isArray(card.wishes) ? card.wishes : [];
  elements.recipientInput.value = card.recipient || defaultRecipient;
  saveLocal();
}

async function saveRemoteWall() {
  if (!apiAvailable || !wallId || !adminToken || isViewOnly) return;

  const card = await requestJson(`${apiUrl}?wall=${encodeURIComponent(wallId)}`, {
    method: "PUT",
    headers: { "x-admin-token": adminToken },
    body: JSON.stringify({
      recipient: currentRecipient(),
      wishes,
    }),
  });
  wishes = card.wishes || [];
}

async function addWish(entry) {
  if (!wallId) {
    throw new Error("No wall selected");
  }

  const card = await requestJson(`${apiUrl}?wall=${encodeURIComponent(wallId)}`, {
    method: "POST",
    body: JSON.stringify(entry),
  });
  wishes = card.wishes || [];
  elements.recipientInput.value = card.recipient || defaultRecipient;
  saveLocal();
}

async function createWall(recipient) {
  const wall = await requestJson(apiUrl, {
    method: "POST",
    body: JSON.stringify({ recipient }),
  });

  wallId = wall.id;
  adminToken = wall.adminToken;
  isViewOnly = false;
  wishes = [];
  elements.recipientInput.value = wall.recipient || recipient || defaultRecipient;
  saveLocal();
  setMode();
  showWallLinks();
  renderName();
  renderWishes();
  history.replaceState(null, "", wallLinks(wallId, adminToken).admin);
}

function renderName() {
  const recipient = currentRecipient();
  elements.birthdayName.textContent = recipient;
  if (isViewOnly) {
    document.querySelector("#wall-title").textContent = recipient;
  } else {
    document.querySelector("#wall-title").textContent = "All the love in one place";
  }
}

function renderWishes() {
  elements.grid.innerHTML = "";

  if (!wallId) return;

  if (!wishes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = isViewOnly
      ? "No wishes have been added yet."
      : "No wishes yet. Add the first note and photo to start the birthday wall.";
    elements.grid.append(empty);
    return;
  }

  wishes.forEach((entry) => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const photo = card.querySelector(".wish-card__photo");
    photo.src = entry.photo || defaultPhoto;
    photo.alt = `${entry.name}'s birthday photo`;
    card.querySelector(".wish-card__wish").textContent = entry.wish;
    card.querySelector(".wish-card__note").textContent = entry.note;
    card.querySelector(".wish-card__name").textContent = `From ${entry.name}`;
    elements.grid.append(card);
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2600);
}

function resetPhoto() {
  photoData = "";
  elements.photoInput.value = "";
  elements.photoPreview.style.backgroundImage = "";
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSide = 320;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Link copied.");
  } catch (error) {
    window.prompt("Copy this link:", text);
  }
}

elements.createWallButton.addEventListener("click", () => {
  document.querySelector("#starter-panel").scrollIntoView({ behavior: "smooth" });
});

elements.createWallForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = elements.createWallForm.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    await createWall(elements.newRecipientInput.value.trim());
    showToast("Birthday wall created.");
  } catch (error) {
    showToast("Could not create the wall. Check the Cloudflare KV binding.");
  } finally {
    button.disabled = false;
  }
});

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(`#${button.dataset.copyTarget}`);
    copyText(target.value);
  });
});

elements.photoInput.addEventListener("change", async () => {
  const [file] = elements.photoInput.files;
  if (!file) return;

  photoData = await resizeImage(file);
  elements.photoPreview.style.backgroundImage = `url("${photoData}")`;
});

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const entry = {
    name: elements.nameInput.value.trim(),
    wish: elements.wishInput.value.trim(),
    note: elements.noteInput.value.trim(),
    photo: photoData || defaultPhoto,
  };

  const button = elements.form.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    await addWish(entry);
    renderName();
    renderWishes();
    elements.form.reset();
    resetPhoto();
    showToast("Wish added for everyone.");
  } catch (error) {
    showToast("Could not save that wish. Try again.");
  } finally {
    button.disabled = false;
  }
});

elements.recipientInput.addEventListener("input", async () => {
  renderName();
  saveLocal();

  try {
    await saveRemoteWall();
  } catch (error) {
    showToast("Only the handler link can change the birthday name.");
  }
});

elements.scrollToForm.addEventListener("click", () => {
  document.querySelector("#wish-form-section").scrollIntoView({ behavior: "smooth" });
});

elements.copyLink.addEventListener("click", () => {
  copyText(wallLinks(wallId, adminToken).view);
});

elements.clearWishes.addEventListener("click", async () => {
  if (!window.confirm("Clear all shared wishes for this wall?")) return;

  try {
    const card = await requestJson(`${apiUrl}?wall=${encodeURIComponent(wallId)}`, {
      method: "DELETE",
      headers: { "x-admin-token": adminToken },
    });
    wishes = card.wishes || [];
    saveLocal();
    renderWishes();
    showToast("Birthday wall reset.");
  } catch (error) {
    showToast("Could not reset the shared wall.");
  }
});

elements.celebrationMode.addEventListener("change", () => {
  elements.body.classList.toggle("celebrating", elements.celebrationMode.checked);
});

function startConfetti() {
  const context = elements.canvas.getContext("2d");
  const colors = ["#d94f70", "#f2b84b", "#287d74", "#3f6fb5", "#ffffff"];
  const pieces = Array.from({ length: 90 }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: 5 + Math.random() * 7,
    speed: 0.35 + Math.random() * 0.9,
    drift: -0.4 + Math.random() * 0.8,
    color: colors[Math.floor(Math.random() * colors.length)],
    spin: Math.random() * Math.PI,
  }));

  function resize() {
    elements.canvas.width = window.innerWidth * window.devicePixelRatio;
    elements.canvas.height = window.innerHeight * window.devicePixelRatio;
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  function draw() {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pieces.forEach((piece) => {
      piece.y += piece.speed / window.innerHeight;
      piece.x += piece.drift / window.innerWidth;
      piece.spin += 0.06;

      if (piece.y > 1.06) piece.y = -0.06;
      if (piece.x > 1.06) piece.x = -0.06;
      if (piece.x < -0.06) piece.x = 1.06;

      context.save();
      context.translate(piece.x * window.innerWidth, piece.y * window.innerHeight);
      context.rotate(piece.spin);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
      context.restore();
    });
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  draw();
}

async function init() {
  setMode();

  if (wallId) {
    showWallLinks();
    try {
      await loadRemoteWall();
    } catch (error) {
      apiAvailable = false;
      if (!loadLocal()) {
        showToast("Could not load this wall.");
      }
    }
  } else {
    elements.recipientInput.value = defaultRecipient;
  }

  renderName();
  renderWishes();
  elements.body.classList.add("celebrating");
  startConfetti();
}

init();
