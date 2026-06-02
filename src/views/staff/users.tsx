import type { StaffUserRow } from "../../models.js";
import { limits } from "../../policy.js";
import { ActionLabel } from "../../ui/actions.js";
import { MetaSubjectLink } from "../../ui/meta.js";
import { Panel } from "../../ui/panels.js";
import { profilePath } from "../../paths.js";

export function UserSearch({ query }: { query?: string }) {
  return (
    <form method="get" action="/admin/users">
      <input type="text" name="q" value={query ?? ""} maxLength={limits.searchQuery} />
      <button type="submit"><ActionLabel action="search">Search users</ActionLabel></button>
    </form>
  );
}

export function UsersPanel({ users }: { users: StaffUserRow[] }) {
  return (
    <Panel title="Users">
      <table class="listing-table">
        <tbody>
          <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Views</th><th>Modify</th></tr>
          {users.map((person) => (
            <tr>
              <td>{person.id}</td>
              <td><MetaSubjectLink href={profilePath(person)}>{person.username}</MetaSubjectLink></td>
              <td>{person.email}</td>
              <td>{person.role}</td>
              <td>{person.bannedAt ? "banned" : person.verifiedAt ? "verified" : "unverified"}</td>
              <td>{person.views}</td>
              <td><a href={`/admin/users/${person.id}`}>Modify</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
