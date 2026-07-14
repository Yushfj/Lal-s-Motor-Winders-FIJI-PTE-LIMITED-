import "./style.css";

const header = document.getElementById("site-header");
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const menuIconOpen = document.getElementById("menu-icon-open");
const menuIconClose = document.getElementById("menu-icon-close");
const yearEl = document.getElementById("year");
const form = document.getElementById("quote-form");
const formStatus = document.getElementById("form-status");

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

function setMenuOpen(open) {
  if (!mobileMenu || !menuToggle) return;
  mobileMenu.classList.toggle("hidden", !open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menuIconOpen?.classList.toggle("hidden", open);
  menuIconClose?.classList.toggle("hidden", !open);
  header?.classList.toggle("menu-open", open);
  if (open) header?.classList.add("is-scrolled");
}

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  setMenuOpen(open);
});

document.querySelectorAll(".mobile-link").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

function updateHeader() {
  if (!header) return;
  const scrolled = window.scrollY > 24;
  header.classList.toggle("is-scrolled", scrolled || menuToggle?.getAttribute("aria-expanded") === "true");
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion) {
  const reveals = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  reveals.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index % 6, 5) * 40}ms`;
    observer.observe(el);
  });
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    if (formStatus) formStatus.textContent = "Please complete the required fields.";
    return;
  }

  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const phone = String(data.get("phone") || "").trim();
  const email = String(data.get("email") || "").trim();
  const service = String(data.get("service") || "").trim();
  const message = String(data.get("message") || "").trim();

  const subject = encodeURIComponent(`Quote request: ${service}`);
  const body = encodeURIComponent(
    `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nService: ${service}\n\nDetails:\n${message}`
  );

  if (formStatus) {
    formStatus.textContent = "Opening your email client…";
  }

  window.location.href = `mailto:lalsmws315@gmail.com?subject=${subject}&body=${body}`;
  form.reset();
});
