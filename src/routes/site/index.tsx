import type { Hono } from "hono";
import type { SiteSettings } from "../../settings/site.js";
import { siteSettings } from "../../server/db/siteSettings.js";
import { siteMarketingDescription, type PageSeo } from "../../settings/seo.js";
import { plainPage } from "../../server/render.js";
import type { AppBindings } from "../../server/context.js";
import type { ViewChild } from "../../ui/types.js";

type StaticPage = {
  path: string;
  seo?: (settings: SiteSettings) => PageSeo;
  title: (settings: SiteSettings) => string;
  body: (settings: SiteSettings) => ViewChild;
};

const staticPages: readonly StaticPage[] = [
  {
    path: "/about",
    title: (settings) => `About ${settings.identity.name}`,
    body: (settings) => (
      <>
        <p><strong>Welcome to {settings.identity.name}.</strong></p>
        
        <p>Our parent site, <a href="https://quenq.com" target="_blank">Quenq.com</a>, began as a living archive of internet culture. It is a place to preserve the creativity, chaos, and nostalgia of the early web. We collected and hosted old Flash games, built simulations, and preserved web experiences of the early internet to keep them alive and accessible forever.</p>

        <p>But preservation was not enough. We realized that what made the old web truly special was the people. That is why we created <strong>{settings.identity.name}</strong>, bringing the human element back to the internet.</p>
        
        <p>We missed the days when the web was about creativity and connecting with friends, rather than algorithms, viral trends, and AI-generated slop. Here, you can claim your piece of the retro web, build a custom HTML/CSS profile, share your favorite profile music, write blogs, and connect with a community that shares your passion.</p>

        <p>Because we want to keep this space cozy, creative, and safe from spam bots, registration is currently limited to selected countries. <strong>Quenq</strong> is a passion project, funded by minimal ads and user donations, keeping us independent.</p>
        
        <p><em><strong>Under the hood:</strong> The social engine powering this community is a customized fork of <a href="https://github.com/bliish-com/bliishspace" target="_blank" rel="noopener noreferrer">Bliish.space</a>, an ultra-fast, lightweight, open-source social platform.</em></p>
      </>
    )
  },
  {
    path: "/contact",
    title: () => "Contact",
    body: (settings) => (
      <>
        <p>For support, privacy questions, copyright notices, or security concerns, use the contact information below.</p>
        {contactEmail(settings)}
        <p>
          <strong>{settings.contact.companyName}</strong>
          {mailingAddress(settings)}
        </p>
      </>
    )
  },
  {
    path: "/privacy",
    title: () => "Privacy",
    body: (settings) => (
      <>
        <p>{settings.identity.name} stores only the information necessary to run a social community. This includes your email address, username, password hash, session records, profile text, posts, blogs, messages, uploaded media, and timestamps.</p>
        <p>Uploaded profile pictures, post images, and theme songs are stored securely on our servers.</p>
        <p>You have control over your data. You can change your profile visibility in your account settings. Private profiles are visible only to the profile owner, accepted friends, and staff. Blog entries also feature their own individual privacy settings.</p>
        <p>Please note that custom profile skins can include third party images, fonts, and embedded media players (like YouTube or Spotify) chosen by the profile author. Visiting those profiles means your browser may connect to those external services, which are governed by their own privacy policies.</p>
        <p>You can export your account data or permanently delete your account at any time from your settings. Basic server logs and backups are kept temporarily strictly for security, moderation, and maintenance purposes.</p>
        {settings.contact.email ? <p>Questions: <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a></p> : null}
      </>
    )
  },
  {
    path: "/terms",
    title: () => "Terms",
    body: (settings) => (
      <>
        <p>By using {settings.identity.name}, you agree to these terms, our <a href="/privacy">Privacy Policy</a>, and our community <a href="/rules">Rules</a>.</p>
        <p>You must be at least 13 years old to create an account. You must use your own account, and you agree not to try to break, overload, or abuse the site infrastructure.</p>
        <p>You are solely responsible for what you post, upload, message, share, and add to your custom profile skins. Do not post content you do not have the legal right to use.</p>
        <p>You retain full ownership of your content. By posting it, you grant {settings.identity.name} a license to store, display, and process it as needed to run the website.</p>
        <p>Staff members may remove content, limit features, or suspend accounts at their sole discretion if a user breaks these terms, the rules, or threatens the security of the service.</p>
        {dmcaNotice(settings)}
        <p><strong>Limitation of Liability:</strong> {settings.identity.name} is an independent, hobbyist project. The service is provided strictly on an "AS IS" and "AS AVAILABLE" basis, without any warranties. To the fullest extent permitted by law, the creators, hosts, and moderators of {settings.identity.name} shall not be held liable for any data loss, downtime, indirect damages, or issues arising from user generated content.</p>
      </>
    )
  },
  {
    path: "/help",
    title: () => "Help",
    body: () => (
      <>
        <p>Use edit profile to change your name, picture, theme song, bio, interests, social links, and skin HTML. Your public profile address is set during signup.</p>
        <p>Wall posts and group posts support one image, props, comments, and comment replies. Blog entries support categories, privacy, pinning, props, comments, and comment replies.</p>
        <p>Skins are shared from the skins page and can be previewed before applying them to your profile.</p>
      </>
    )
  },
  {
    path: "/rules",
    title: () => "Rules",
    body: () => (
      <>
        <p>Be decent to other people and do not use the site to make their lives harder.</p>
        
        <p><strong>Keep public spaces in English:</strong> To help us moderate effectively and keep the community connected, please use English in the main public feeds and global groups. You are fully welcome to use other languages on your personal profile, in your own blogs, or within your own personal groups.</p>
        
        <p><strong>No AI-generated content:</strong> This network was built to escape the modern web and celebrate authentic human creativity. Please do not post AI-generated art, text "slop", or use automated bots to post.</p>
        
        <p><strong>No NSFW content:</strong> Do not post sexually explicit material, pornography, or illegal content. We want to keep this corner of the web safe and comfortable for everyone.</p>
        
        <p>Do not harass people, threaten people, spam, impersonate others, or evade moderation. Do not post malware, phishing links, or stolen private information.</p>
        
        <p>Do not use profile skins, embeds, uploads, or links to attack visitors, hide malicious content, or break the site.</p>
        
        <p>Staff may remove content, restrict features, or ban accounts when needed to keep the site safe. If you see something that breaks the rules, please report it to the moderators.</p>
      </>
    )
  }
];

export function registerSiteRoutes(app: Hono<AppBindings>) {
  for (const page of staticPages) {
    app.get(page.path, (c) => {
      const settings = siteSettings();
      return plainPage(c, page.title(settings), page.body(settings), 200, page.seo?.(settings));
    });
  }
}

function contactEmail(settings: SiteSettings) {
  return settings.contact.email
    ? <p><a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a></p>
    : <p>No contact email has been configured yet.</p>;
}

function mailingAddress(settings: SiteSettings) {
  const lines = settings.contact.mailingAddress.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length ? (
    <>
      <br />
      {lines.map((line) => (
        <>
          {line}
          <br />
        </>
      ))}
    </>
  ) : null;
}

function dmcaNotice(settings: SiteSettings) {
  return settings.contact.email ? (
    <p>DMCA notices can be sent to <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a>. Include the copyrighted work, the allegedly infringing URL or material, your contact information, a good-faith statement, a statement that the notice is accurate under penalty of perjury, and your physical or electronic signature. Repeat infringers may have content removed or accounts terminated.</p>
  ) : (
    <p>Copyright notices can be sent through the contact information on the Contact page. Repeat infringers may have content removed or accounts terminated.</p>
  );
}