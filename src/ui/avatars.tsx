import { defaultProfileImageNames } from "../policy.js";
import { classNames } from "./classes.js";
import { Icon } from "./icons.js";
import { profileImagePath } from "../paths.js";

type ProfileImageVariant = "avatar-compact" | "profile" | "edit-preview";
type ProfileImageProps = {
  filename: string;
  alt?: string;
  className?: string;
  variant?: ProfileImageVariant;
  loading?: "lazy" | "eager";
};

const profileImageVariants: Record<ProfileImageVariant, string> = {
  "avatar-compact": "profile-image--avatar-compact",
  profile: "profile-image--profile",
  "edit-preview": "profile-image--edit-preview"
};

export function ProfileImage(props: ProfileImageProps) {
  const alt = props.alt ?? "profile picture";
  const variantClass = props.variant ? profileImageVariants[props.variant] : undefined;
  const classes = classNames(variantClass, props.className);
  if (defaultProfileImageNames.has(props.filename)) {
    return (
      <span class={classNames("profile-placeholder", classes)} role="img" aria-label={alt}>
        <Icon name="avatar" />
      </span>
    );
  }
  return <img class={classes} src={profileImagePath(props.filename)} alt={alt} loading={props.loading} />;
}

export function ProfileImageLink(props: ProfileImageProps & { href: string; label: string; linkClassName?: string }) {
  const { href, label, linkClassName, ...imageProps } = props;
  return (
    <a class={classNames("profile-image-link", linkClassName)} href={href} aria-label={label}>
      <ProfileImage {...imageProps} />
    </a>
  );
}
