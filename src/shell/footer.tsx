import type { SiteContactSettings } from "../settings/site.js";
import type { DataAttributes } from "../ui/types.js";

export function Footer({ contact, dataAttributes }: { contact: SiteContactSettings; dataAttributes?: DataAttributes }) {
  const copyrightYears = copyrightYearLabel();

  return (
    <footer class="site-footer" {...dataAttributes}>
      <ul class="site-footer__links link-list">
        <li><a href="/about">About</a></li>
        <li><a href="/rules">Rules</a></li>
        <li><a href="/terms">Terms</a></li>
        <li><a href="/privacy">Privacy</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
      <p class="copyright">
        &copy;{copyrightYears} {contact.companyName}.
      </p>
    </footer>
  );
}

function copyrightYearLabel() {
  const creationYear = 2024;
  const currentYear = new Date().getFullYear();
  return currentYear > creationYear ? `${creationYear}-${currentYear}` : `${creationYear}`;
}