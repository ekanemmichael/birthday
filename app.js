const storageKey = "birthday-card-wishes";
const recipientKey = "birthday-card-recipient";

const defaultPhoto =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 640'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23ffd0dc'/%3E%3Cstop offset='.48' stop-color='%23f2b84b'/%3E%3Cstop offset='1' stop-color='%23b7e2dd'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='640' fill='url(%23g)'/%3E%3Ccircle cx='240' cy='220' r='92' fill='%23fffaf2' opacity='.8'/%3E%3Cpath d='M120 560c78-140 166-210 264-210s186 70 264 210' fill='%23fffaf2' opacity='.78'/%3E%3C/svg%3E";

const sampleWishes = [
  {
    name: "Aisha",
    wish: "To your brightest year yet",
    note: "You make every ordinary day feel warmer. I hope this birthday brings you the same kind of joy you give everyone else.",
    photo: defaultPhoto,
  },
  {
    name: "Daniel",
    wish: "More laughter, more magic",
    note: "Thank you for being the person who remembers the little things. You are so easy to celebrate.",
    photo: defaultPhoto,
  },
  {
    name: "Priya",
    wish: "Big hugs from all of us",
    note: "May this year surprise you kindly, feed your dreams, and give you endless reasons to smile.",
    photo: defaultPhoto,
  },
];

const elements = {
  body: document.body,
  birthdayName: document.querySelector("#birthday-name"),
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

let wishes = [];
let photoData = "";
let toastTimer = 0;
let isSharedCard = false;

function fromHash() {
  if (!window.location.hash.startsWith("#card=")) return null;

  try {
    const encoded = window.location.hash.replace("#card=", "");
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch (error) {
    return null;
  }
}

function toHashPayload() {
  return btoa(unescape(encodeURIComponent(JSON.stringify({
    recipient: elements.recipientInput.value.trim() || "Friend",
    wishes,
  }))));
}

function save() {
  localStorage.setItem(storageKey, JSON.stringify(wishes));
  localStorage.setItem(recipientKey, elements.recipientInput.value.trim());
}

function load() {
  const sharedCard = fromHash();

  if (sharedCard?.wishes) {
    isSharedCard = true;
    elements.body.classList.add("shared-card");
    wishes = sharedCard.wishes;
    elements.recipientInput.value = sharedCard.recipient || "Friend";
    return;
  }

  const savedWishes = localStorage.getItem(storageKey);
  const savedRecipient = localStorage.getItem(recipientKey);
  wishes = savedWishes ? JSON.parse(savedWishes) : sampleWishes;
  elements.recipientInput.value = savedRecipient || "Friend";
}

function renderName() {
  elements.birthdayName.textContent = elements.recipientInput.value.trim() || "Friend";
  if (isSharedCard) {
    document.querySelector("#wall-title").textContent = elements.recipientInput.value.trim() || "Friend";
  }
}

function renderWishes() {
  elements.grid.innerHTML = "";

  if (!wishes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = isSharedCard
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

elements.photoInput.addEventListener("change", async () => {
  const [file] = elements.photoInput.files;
  if (!file) return;

  photoData = await resizeImage(file);
  elements.photoPreview.style.backgroundImage = `url("${photoData}")`;
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  wishes.unshift({
    name: elements.nameInput.value.trim(),
    wish: elements.wishInput.value.trim(),
    note: elements.noteInput.value.trim(),
    photo: photoData || defaultPhoto,
  });
  elements.form.reset();
  resetPhoto();
  save();
  renderWishes();
  showToast("Wish added to the card.");
});

elements.recipientInput.addEventListener("input", () => {
  renderName();
  save();
});

elements.scrollToForm.addEventListener("click", () => {
  document.querySelector("#wish-form-section").scrollIntoView({ behavior: "smooth" });
});

elements.copyLink.addEventListener("click", async () => {
  const baseUrl = window.location.href.split("#")[0];
  const url = `${baseUrl}#card=${toHashPayload()}`;

  try {
    await navigator.clipboard.writeText(url);
    showToast("Card link copied.");
  } catch (error) {
    window.prompt("Copy this birthday card link:", url);
  }
});

elements.clearWishes.addEventListener("click", () => {
  if (!window.confirm("Clear all wishes on this browser?")) return;
  wishes = [];
  save();
  renderWishes();
  showToast("Birthday wall reset.");
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

load();
renderName();
renderWishes();
elements.body.classList.add("celebrating");
startConfetti();
