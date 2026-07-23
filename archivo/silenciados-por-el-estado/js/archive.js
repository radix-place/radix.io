(() => {
  "use strict";

  const openTargetProfile = () => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (target && target.tagName.toLowerCase() === "details") {
      target.open = true;
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start" });
      });
    }
  };

  const search = document.getElementById("archive-search");
  const cards = [...document.querySelectorAll(".case-card")];
  const axes = [...document.querySelectorAll(".case-axis")];
  const empty = document.getElementById("archive-empty");

  if (search && cards.length) {
    const normalize = (value) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    search.addEventListener("input", () => {
      const query = normalize(search.value);
      let visible = 0;

      cards.forEach((card) => {
        const haystack = normalize(card.dataset.search || card.textContent);
        const match = !query || haystack.includes(query);
        card.hidden = !match;
        if (match) visible += 1;
      });

      axes.forEach((axis) => {
        const hasVisibleCard = [...axis.querySelectorAll(".case-card")].some(
          (card) => !card.hidden
        );
        axis.hidden = !hasVisibleCard;
      });

      if (empty) empty.hidden = visible !== 0;
    });
  }

  document.querySelectorAll(".biography-profile").forEach((profile) => {
    profile.addEventListener("toggle", () => {
      const label = profile.querySelector(".profile-open-label");
      if (label) label.textContent = profile.open ? "Cerrar perfil" : "Abrir perfil";
    });
  });

  window.addEventListener("hashchange", openTargetProfile);
  openTargetProfile();
})();