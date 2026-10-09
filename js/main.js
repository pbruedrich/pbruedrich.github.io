const cards = Array.from(document.querySelectorAll(".project-card"));
let activeCard = null;
let lastPointerType = "mouse";

function setExpanded(card = null) {
  cards.forEach((item) => {
    const expanded = item === card;
    item.classList.toggle("is-active", expanded);
    item.setAttribute("aria-expanded", String(expanded));
  });
  activeCard = card;
}

document.addEventListener("pointerdown", (event) => {
  lastPointerType = event.pointerType;
  if (!event.target.closest(".project-card")) setExpanded();
});

cards.forEach((card) => {
  card.setAttribute("aria-expanded", "false");
  card.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") setExpanded(card);
  });
  card.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && activeCard === card) setExpanded();
  });
  card.addEventListener("focus", () => {
    if (card.matches(":focus-visible")) setExpanded(card);
  });
  card.addEventListener("blur", () => {
    if (activeCard === card) setExpanded();
  });
  card.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    // Keyboard activation navigates normally; touch and pen use two taps.
    if (event.detail !== 0 && lastPointerType !== "mouse" && activeCard !== card) {
      event.preventDefault();
      setExpanded(card);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setExpanded();
});
