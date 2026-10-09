const dialog = document.querySelector(".image-dialog");
let openGallery = null;

function updateDialog() {
  if (!openGallery) return;
  const media = openGallery.currentMedia();
  const old = dialog.querySelector(".dialog-stage img, .dialog-stage video");
  if (old.tagName === "VIDEO") old.pause();
  const enlarged = document.createElement(media.tagName.toLowerCase());
  enlarged.src = media.src;
  const caption = media.alt || media.getAttribute("aria-label");
  if (media.tagName === "VIDEO") {
    media.pause();
    enlarged.controls = true;
    enlarged.muted = true;
    enlarged.playsInline = true;
    enlarged.setAttribute("aria-label", caption);
  } else enlarged.alt = caption;
  old.replaceWith(enlarged);
  dialog.querySelector("[data-dialog-caption]").textContent = caption;
}

document.querySelectorAll("[data-gallery]").forEach((gallery) => {
  const slides = Array.from(gallery.querySelectorAll(".gallery-slide"));
  const thumbnails = Array.from(gallery.querySelectorAll("[data-slide]"));
  let index = 0;
  function show(next) {
    slides.forEach((slide) => slide.querySelector("video")?.pause());
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    thumbnails.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    gallery.querySelector("[data-current]").textContent = String(index + 1).padStart(2, "0");
    if (dialog.open && openGallery === controller) updateDialog();
    else {
      const video = slides[index].querySelector("video");
      if (video) video.play().catch(() => {});
    }
  }
  const controller = {
    currentMedia: () => slides[index].querySelector("img, video"),
    previous: () => show(index - 1),
    next: () => show(index + 1)
  };
  if (gallery.hasAttribute("data-autoplay")) {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const toggle = gallery.querySelector("[data-autoplay-toggle]");
    const counter = gallery.querySelector(".gallery-counter");
    let paused = motion.matches;
    function updatePlayback() {
      const label = paused ? "Play slideshow" : "Pause slideshow";
      toggle.setAttribute("aria-label", label);
      toggle.title = label;
      toggle.textContent = paused ? "\u25b6" : "\u275a\u275a";
      counter.setAttribute("aria-live", paused ? "polite" : "off");
    }
    toggle.addEventListener("click", () => {
      paused = !paused;
      updatePlayback();
    });
    motion.addEventListener("change", () => {
      paused = motion.matches;
      updatePlayback();
    });
    updatePlayback();
    window.setInterval(() => {
      const video = slides[index].querySelector("video");
      if (video && !video.ended) return;
      if (!paused && !document.hidden && !dialog.open &&
          !gallery.matches(":hover, :focus-within")) controller.next();
    }, 5000);
  }
  function enlarge() {
    openGallery = controller;
    updateDialog();
    dialog.showModal();
  }
  gallery.querySelector("[data-prev]").addEventListener("click", controller.previous);
  gallery.querySelector("[data-next]").addEventListener("click", controller.next);
  gallery.querySelector("[data-expand]").addEventListener("click", enlarge);
  thumbnails.forEach((button, i) => button.addEventListener("click", () => show(i)));
  slides.forEach((slide) => slide.querySelector("img")?.addEventListener("click", enlarge));
  gallery.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      event.key === "ArrowLeft" ? controller.previous() : controller.next();
    }
  });
  const stage = gallery.querySelector(".gallery-stage");
  let start = null;
  stage.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    start = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  stage.addEventListener("touchend", (event) => {
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      dx > 0 ? controller.previous() : controller.next();
    }
    start = null;
  }, { passive: true });
});

dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => dialog.querySelector("video")?.pause());
dialog.querySelector("[data-dialog-prev]").addEventListener("click", () => openGallery.previous());
dialog.querySelector("[data-dialog-next]").addEventListener("click", () => openGallery.next());
dialog.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    event.key === "ArrowLeft" ? openGallery.previous() : openGallery.next();
  }
});

document.querySelectorAll("[data-paired-demo]").forEach((group) => {
  const videos = Array.from(group.querySelectorAll("video"));
  const toggle = group.querySelector("[data-demo-toggle]");
  let requested = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = false;
  let pending = false;
  function updateButton() {
    const playing = videos.some(video => !video.paused);
    const label = playing ? "Pause both demos" : "Play both demos";
    toggle.textContent = playing ? "\u275a\u275a" : "\u25b6";
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
  }
  async function updatePlayback() {
    if (!requested || !visible || document.hidden) {
      videos.forEach(video => video.pause());
      updateButton();
      return;
    }
    if (pending || videos.some(video => video.readyState < 2)) return;
    pending = true;
    try {
      videos.forEach(video => { video.muted = true; });
      await Promise.all(videos.map(video => video.play()));
      if (!requested || !visible || document.hidden) videos.forEach(video => video.pause());
    } catch {
      videos.forEach(video => video.pause());
    } finally {
      pending = false;
      updateButton();
    }
  }
  videos.forEach(video => {
    video.addEventListener("loadeddata", updatePlayback);
    video.addEventListener("volumechange", () => { if (!video.muted) video.muted = true; });
  });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) videos.forEach(video => { video.preload = "auto"; });
    updatePlayback();
  }, { threshold: 0.15 });
  observer.observe(group);
  toggle.addEventListener("click", () => {
    requested = !videos.some(video => !video.paused);
    updatePlayback();
  });
  group.querySelector("[data-demo-restart]").addEventListener("click", () => {
    videos.forEach(video => { video.currentTime = 0; });
    requested = true;
    updatePlayback();
  });
  document.addEventListener("visibilitychange", updatePlayback);
  // Keep the two camera angles aligned and restart together at the shorter clip.
  window.setInterval(() => {
    if (!requested || !visible || document.hidden || videos.some(video => video.readyState < 2)) return;
    const duration = Math.min(...videos.map(video => video.duration));
    if (videos.some(video => video.ended) || videos[0].currentTime >= duration - 0.15) {
      videos.forEach(video => { video.currentTime = 0; });
      updatePlayback();
    } else if (Math.abs(videos[0].currentTime - videos[1].currentTime) > 0.2) {
      videos[1].currentTime = videos[0].currentTime;
    }
  }, 250);
});
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
