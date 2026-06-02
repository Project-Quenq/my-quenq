import { classNames } from "./classes.js";
import { ProfileImage } from "./avatars.js";
import { Panel } from "./panels.js";
import { profilePath } from "../paths.js";
import type { PersonCard } from "../models.js";
import type { DataAttributes, ViewChild } from "./types.js";

export type PeopleBoxPerson = PersonCard & {
  href?: string | null;
  imageSrc?: string;
};

export function Person({ person }: { person: PeopleBoxPerson }) {
  const href = person.href === undefined ? profilePath(person) : person.href;
  const alt = `${person.username}'s profile picture`;
  return (
    <div class="person-card person">
      <PersonCardIdentity href={href}>
        {person.imageSrc ? (
          <img class="person-card__image" src={person.imageSrc} alt={alt} loading="lazy" />
        ) : (
          <ProfileImage
            alt={alt}
            className="person-card__image"
            filename={person.pfp}
            loading="lazy"
          />
        )}
        <p class="person-card__name">{person.username}</p>
      </PersonCardIdentity>
    </div>
  );
}

function PersonCardIdentity(props: { href: string | null; children: ViewChild }) {
  const className = classNames("person-card__identity", props.href ? "person-card__identity--link" : "person-card__identity--disabled");
  if (props.href) return <a class={className} href={props.href}>{props.children}</a>;
  return <span class={className}>{props.children}</span>;
}

export function PersonActionCard(props: { person: PersonCard; children: ViewChild }) {
  return (
    <div class="person-list-card">
      <a class="person-list-card__identity" href={profilePath(props.person)}>
        <ProfileImage
          alt={`${props.person.username}'s profile picture`}
          filename={props.person.pfp}
          loading="lazy"
          variant="avatar-compact"
        />
        <span class="person-list-card__name">{props.person.username}</span>
      </a>
      <div class="person-list-card__actions">{props.children}</div>
    </div>
  );
}

export function PeopleBox(props: {
  title: string;
  people: PeopleBoxPerson[];
  more?: string;
  prefix?: ViewChild;
  className?: string;
  singleLine?: boolean;
  dataAttributes?: DataAttributes;
}) {
  return (
    <Panel
      bodyClassName="people-panel__body"
      className={classNames("people-panel", props.className)}
      dataAttributes={props.dataAttributes}
      headerAction={props.more && props.people.length ? <a class="people-panel__more" href={props.more}>[view more]</a> : null}
      title={props.title}
      tone="soft"
    >
      {props.prefix ? <div class="people-panel__summary">{props.prefix}</div> : null}
      {props.people.length ? (
        <div class={classNames("people-panel__list", props.singleLine ? "people-panel__list--single-line" : undefined)}>
          {props.people.map((person) => <Person person={person} />)}
        </div>
      ) : <p><i>No users found.</i></p>}
    </Panel>
  );
}
