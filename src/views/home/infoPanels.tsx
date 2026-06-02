import type { SiteSettings } from "../../settings/site.js";
import { sanitizeLinkedText } from "../../server/security/html.js";
import { Panel } from "../../ui/panels.js";
import { UserContent } from "../../ui/userContent.js";

export const landingCards = [
  {
    title: "Custom profiles",
    body: "Make your profile truly feel like your own. Customize your background, colors, and layout using custom HTML and CSS, and add your favorite profile song.",
    href: "/skins",
    cta: "Browse skins"
  },
  {
    title: "No feed algorithms",
    body: "See posts in the natural chronological order they are written. We do not use algorithms to manipulate your feed, push viral trends, or promote AI-generated content.",
    href: "/privacy",
    cta: "Read our privacy details"
  },
  {
    title: "Apps & games",
    body: "Launch simulators, emulators, and classic Flash games on our main site. Use this space to share your favorite games, high scores, and join community groups.",
    href: "https://quenq.com",
    cta: "Explore the archive"
  },
  {
    title: "Cozy communities",
    body: "Join dedicated groups, write blog diaries, and find people who share your interests. Block, report, or restrict unwanted interactions easily.",
    href: "/rules",
    cta: "Review community rules"
  }
];

export function InfoCard(props: { title: string; body: string; href: string; cta: string }) {
  return (
    <div class="info-card">
      <h3>{props.title}</h3>
      <p>{props.body}</p>
      <p class="link">
        &raquo; <a href={props.href}>{props.cta}</a>
      </p>
    </div>
  );
}

export function AnnouncementBox({ settings }: { settings: SiteSettings }) {
  if (!settings.home.announcement) return null;
  return (
    <Panel className="summary-panel" title={`${settings.identity.name} announcements`} tone="soft">
      <UserContent html={sanitizeLinkedText(settings.home.announcement)} />
    </Panel>
  );
}

export function SourceBox() {
  return (
    <div class="source-card">
      <p>my quenq is a nostalgic social network funded by minimal ads and user donations.</p>
      <p><a href="/donate" class="more-details">[Support Us]</a></p>
    </div>
  );
}