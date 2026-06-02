import type { TableCount } from "../../models.js";
import { Panel } from "../../ui/panels.js";

export function DatabasePanel({ counts }: { counts: TableCount[] }) {
  return (
    <Panel title="Database">
      <table class="listing-table"><tbody>{counts.map((count) => <tr><td>{count.name}</td><td>{count.count}</td></tr>)}</tbody></table>
    </Panel>
  );
}
