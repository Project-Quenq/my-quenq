import type { BrandingSettings } from "../../settings/branding.js";
import type { SiteSettings } from "../../settings/site.js";
import { limits } from "../../policy.js";
import { ActionLabel } from "../../ui/actions.js";
import { ColorSwatches } from "../../ui/colorSwatches.js";
import { CsrfInput, FormActions, FormField, FormStack } from "../../ui/forms.js";
import { SvgIcon } from "../../ui/icons.js";
import { Panel } from "../../ui/panels.js";
import { siteSettingsTargetIds } from "./siteSettingsTargets.js";

export function SiteSettingsPanel({ colorTheme, csrf, siteSettings }: { colorTheme: BrandingSettings; csrf: string; siteSettings: SiteSettings }) {
  return (
    <>
      <SiteIdentityPanel csrf={csrf} settings={siteSettings} />
      <HomePagePanel csrf={csrf} settings={siteSettings} />
      <RegistrationSettingsPanel csrf={csrf} settings={siteSettings} />
      <ContactPanel csrf={csrf} settings={siteSettings} />
      <ColorThemePanel csrf={csrf} settings={colorTheme} />
    </>
  );
}

function SiteIdentityPanel({ csrf, settings }: { csrf: string; settings: SiteSettings }) {
  return (
    <Panel id={siteSettingsTargetIds.identity} title="Site identity">
      <FormStack action="/admin/branding" actionFragment={siteSettingsTargetIds.identity}>
        <CsrfInput csrf={csrf} />
        <input type="hidden" name="mode" value="identity" />
        <FormField label="Site name">
          <input type="text" name="siteName" value={settings.identity.name} required maxLength={limits.siteName} />
        </FormField>
        <FormField label="Header line">
          <input type="text" name="siteTagline" value={settings.identity.tagline} maxLength={limits.siteTagline} />
        </FormField>
        <FormField
          label="Header icon"
          hint={<>Browse icons at <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer">lucide.dev/icons</a>.</>}
        >
          <span class="icon-field">
            <SvgIcon svg={settings.identity.headerIconSvg} />
            <input type="text" name="headerIcon" value={settings.identity.headerIconName} required maxLength={limits.shortText} />
          </span>
        </FormField>
        <FormActions>
          <button type="submit"><ActionLabel action="save">Save identity</ActionLabel></button>
        </FormActions>
      </FormStack>
    </Panel>
  );
}

function HomePagePanel({ csrf, settings }: { csrf: string; settings: SiteSettings }) {
  return (
    <Panel id={siteSettingsTargetIds.home} title="Home page">
      <FormStack action="/admin/branding" actionFragment={siteSettingsTargetIds.home}>
        <CsrfInput csrf={csrf} />
        <input type="hidden" name="mode" value="home" />
        <FormField label="Welcome text">
          <textarea name="welcomeText" rows={3} maxLength={limits.siteWelcomeText}>{settings.home.welcomeText}</textarea>
        </FormField>
        <FormField label="Announcement" hint="Leave blank to hide the announcement box.">
          <textarea class="text-editor text-editor--short" name="announcement" rows={4} maxLength={limits.siteAnnouncement}>{settings.home.announcement}</textarea>
        </FormField>
        <FormActions>
          <button type="submit"><ActionLabel action="save">Save home page</ActionLabel></button>
        </FormActions>
      </FormStack>
    </Panel>
  );
}

function RegistrationSettingsPanel({ csrf, settings }: { csrf: string; settings: SiteSettings }) {
  return (
    <Panel title="Registration rules">
      <FormStack action="/admin/branding">
        <CsrfInput csrf={csrf} />
        <input type="hidden" name="mode" value="registration" />
        <FormField 
          label="Blocked countries (ISO codes)" 
          hint="Comma separated ISO 3166-1 alpha-2 codes (e.g. IN, RU, CN). These regions will be prevented from registering based on their timezone."
        >
          <input type="text" name="blockedCountries" value={settings.registration.blockedCountries} placeholder="e.g. IN, RU" />
        </FormField>
        <FormActions>
          <button type="submit"><ActionLabel action="save">Save registration rules</ActionLabel></button>
        </FormActions>
      </FormStack>
    </Panel>
  );
}

function ContactPanel({ csrf, settings }: { csrf: string; settings: SiteSettings }) {
  return (
    <Panel id={siteSettingsTargetIds.contact} title="Contact and legal">
      <FormStack action="/admin/branding" actionFragment={siteSettingsTargetIds.contact}>
        <CsrfInput csrf={csrf} />
        <input type="hidden" name="mode" value="contact" />
        <FormField label="Contact email">
          <input type="email" name="contactEmail" value={settings.contact.email} maxLength={limits.emailMax} />
        </FormField>
        <FormField label="Company or operator name">
          <input type="text" name="companyName" value={settings.contact.companyName} maxLength={limits.shortText} />
        </FormField>
        <FormField label="Mailing address">
          <textarea name="mailingAddress" rows={4} maxLength={limits.contactAddress}>{settings.contact.mailingAddress}</textarea>
        </FormField>
        <FormActions>
          <button type="submit"><ActionLabel action="save">Save contact</ActionLabel></button>
        </FormActions>
      </FormStack>
    </Panel>
  );
}

function ColorThemePanel({ csrf, settings }: { csrf: string; settings: BrandingSettings }) {
  return (
    <Panel id={siteSettingsTargetIds.color} title="Color theme">
      <FormStack action="/admin/branding" actionFragment={siteSettingsTargetIds.color}>
        <CsrfInput csrf={csrf} />
        <ColorSwatches palette={settings.palette} />
        <FormActions>
          <button type="submit" name="mode" value="color"><ActionLabel action="save">Save color theme</ActionLabel></button>
          {settings.customized ? <button class="button--secondary" type="submit" name="mode" value="resetColor">Reset color theme</button> : null}
        </FormActions>
      </FormStack>
    </Panel>
  );
}