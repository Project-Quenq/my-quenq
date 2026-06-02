import type { Child } from "hono/jsx";

export type DataAttributes = Record<`data-${string}`, string | number | boolean | undefined>;
export type ViewChild = Child;
