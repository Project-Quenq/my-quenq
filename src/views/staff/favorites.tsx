import type { FavoriteEdge } from "../../models.js";
import { CsrfInput } from "../../ui/forms.js";
import { MetaSubjectLink } from "../../ui/meta.js";
import { Panel } from "../../ui/panels.js";
import { profilePath } from "../../paths.js";

export function FavoritesPanel(props: { csrf: string; favorites: FavoriteEdge[] }) {
  return (
    <Panel title="Favorites">
      {props.favorites.length ? props.favorites.map((favorite) => (
        <div class="inline-actions">
          <MetaSubjectLink href={profilePath(favorite.userHandle)}>{favorite.username}</MetaSubjectLink> saved <MetaSubjectLink href={profilePath(favorite.favoriteHandle)}>{favorite.favoriteName}</MetaSubjectLink>{" "}
          <form method="post" action="/admin/favorites/delete" class="inline-form">
            <CsrfInput csrf={props.csrf} />
            <input type="hidden" name="userId" value={favorite.userId} />
            <input type="hidden" name="favoriteId" value={favorite.favoriteId} />
            <button class="button--danger" type="submit">Remove</button>
          </form>
        </div>
      )) : <p><i>No favorites.</i></p>}
    </Panel>
  );
}
