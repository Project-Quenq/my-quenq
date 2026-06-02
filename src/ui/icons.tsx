import AddIcon from "lucide-static/dist/esm/icons/user-plus.mjs";
import AuditIcon from "lucide-static/dist/esm/icons/scroll-text.mjs";
import BellIcon from "lucide-static/dist/esm/icons/bell.mjs";
import BlogIcon from "lucide-static/dist/esm/icons/book-open-text.mjs";
import CheckIcon from "lucide-static/dist/esm/icons/check.mjs";
import CommentIcon from "lucide-static/dist/esm/icons/message-circle.mjs";
import DatabaseIcon from "lucide-static/dist/esm/icons/database.mjs";
import DeleteIcon from "lucide-static/dist/esm/icons/trash-2.mjs";
import EditIcon from "lucide-static/dist/esm/icons/pencil.mjs";
import EmailIcon from "lucide-static/dist/esm/icons/mail.mjs";
import FavoriteIcon from "lucide-static/dist/esm/icons/star.mjs";
import ForwardIcon from "lucide-static/dist/esm/icons/send.mjs";
import GaugeIcon from "lucide-static/dist/esm/icons/gauge.mjs";
import GroupIcon from "lucide-static/dist/esm/icons/users.mjs";
import LinkIcon from "lucide-static/dist/esm/icons/link.mjs";
import LockIcon from "lucide-static/dist/esm/icons/lock.mjs";
import LockOpenIcon from "lucide-static/dist/esm/icons/lock-open.mjs";
import MessageIcon from "lucide-static/dist/esm/icons/message-square.mjs";
import MoonIcon from "lucide-static/dist/esm/icons/moon.mjs";
import PropIcon from "lucide-static/dist/esm/icons/hand-heart.mjs";
import RefreshIcon from "lucide-static/dist/esm/icons/refresh-cw.mjs";
import ReplyIcon from "lucide-static/dist/esm/icons/reply.mjs";
import ReportIcon from "lucide-static/dist/esm/icons/triangle-alert.mjs";
import SaveIcon from "lucide-static/dist/esm/icons/save.mjs";
import SearchIcon from "lucide-static/dist/esm/icons/search.mjs";
import SettingsIcon from "lucide-static/dist/esm/icons/settings.mjs";
import SunIcon from "lucide-static/dist/esm/icons/sun.mjs";
import UploadIcon from "lucide-static/dist/esm/icons/upload.mjs";
import UserIcon from "lucide-static/dist/esm/icons/user.mjs";
import UserMinusIcon from "lucide-static/dist/esm/icons/user-minus.mjs";
import { brandIconSvg } from "../brand.js";
import { trustedHtml } from "./html.js";

export type IconName = "add" | "audit" | "avatar" | "blog" | "brand" | "check" | "comment" | "database" | "delete" | "edit" | "email" | "favorite" | "forward" | "group" | "link" | "lock" | "message" | "moon" | "notifications" | "prop" | "rate-limit" | "refresh" | "reply" | "report" | "save" | "search" | "send" | "settings" | "sun" | "unlock" | "upload" | "user" | "user-minus";

const DefaultAvatarIcon = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
  '<circle cx="12" cy="9.1" r="3.1" fill="currentColor" stroke="none" />',
  '<path d="M6.3 19.9c.9-3.9 3-5.9 5.7-5.9s4.8 2 5.7 5.9c-1.6 1.1-3.5 1.7-5.7 1.7s-4.1-.6-5.7-1.7Z" fill="currentColor" stroke="none" />',
  '<circle cx="12" cy="12" r="10" />',
  "</svg>"
].join("");

const icons: Record<IconName, string> = {
  add: AddIcon,
  audit: AuditIcon,
  avatar: DefaultAvatarIcon,
  blog: BlogIcon,
  brand: brandIconSvg,
  check: CheckIcon,
  comment: CommentIcon,
  database: DatabaseIcon,
  delete: DeleteIcon,
  edit: EditIcon,
  email: EmailIcon,
  favorite: FavoriteIcon,
  forward: ForwardIcon,
  group: GroupIcon,
  link: LinkIcon,
  lock: LockIcon,
  message: MessageIcon,
  moon: MoonIcon,
  notifications: BellIcon,
  prop: PropIcon,
  "rate-limit": GaugeIcon,
  refresh: RefreshIcon,
  reply: ReplyIcon,
  report: ReportIcon,
  save: SaveIcon,
  search: SearchIcon,
  send: ForwardIcon,
  settings: SettingsIcon,
  sun: SunIcon,
  unlock: LockOpenIcon,
  upload: UploadIcon,
  user: UserIcon,
  "user-minus": UserMinusIcon
};

export function SvgIcon({ svg, label }: { svg: string; label?: string }) {
  // Icon SVG strings are static imports or local constants, not user content.
  return (
    <span
      class="icon"
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      role={label ? "img" : undefined}
      dangerouslySetInnerHTML={trustedHtml(svg)}
    />
  );
}

export function Icon({ name, label }: { name: IconName; label?: string }) {
  return <SvgIcon svg={icons[name]} label={label} />;
}
