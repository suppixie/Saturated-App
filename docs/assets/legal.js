const SATURATED_LEGAL_NAME = "Patalay Mamtha";
const SATURATED_CONTACT_EMAIL = "mamtha.dsgn@gmail.com";

document.querySelectorAll("[data-controller]").forEach((element) => {
  element.textContent = SATURATED_LEGAL_NAME;
});
document.querySelectorAll("[data-contact-email]").forEach((element) => {
  element.textContent = SATURATED_CONTACT_EMAIL;
  if (element instanceof HTMLAnchorElement) {
    element.href = `mailto:${SATURATED_CONTACT_EMAIL}`;
  }
});
