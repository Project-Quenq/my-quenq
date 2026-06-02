import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { currentUser } from "../../server/auth/session.js";
import { visibleProfile } from "../../server/access.js";
import { profileByProfileImage, profileByThemeSong } from "../../server/db/users.js";
import { getVisiblePost, postIdsForImage } from "../../server/db/posts/index.js";
import { paths } from "../../server/env.js";
import type { AppBindings, AppContext } from "../../server/context.js";

const mediaContentTypes = new Map([
  [".webp", "image/webp"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"]
]);

export function registerMediaRoutes(app: Hono<AppBindings>) {
  app.get("/media/pfp/:filename", async (c) => {
    const filename = mediaFilename(c);
    const profile = profileByProfileImage(filename);
    if (!profile) throw new HTTPException(404, { message: "Media not found." });
    assertMediaProfileVisible(c, profile.id);
    return mediaFile(c, paths.pfp, filename);
  });

  app.get("/media/theme-songs/:filename", async (c) => {
    const filename = mediaFilename(c);
    const profile = profileByThemeSong(filename);
    if (!profile) throw new HTTPException(404, { message: "Media not found." });
    assertMediaProfileVisible(c, profile.id);
    return mediaFile(c, paths.themeSongs, filename);
  });

  app.get("/media/post-images/:filename", async (c) => {
    const filename = mediaFilename(c);
    const viewer = currentUser(c);
    const visible = postIdsForImage(filename).some((id) => getVisiblePost(id, viewer));
    if (!visible) throw new HTTPException(404, { message: "Media not found." });
    return mediaFile(c, paths.postImages, filename);
  });
}

function mediaFilename(c: AppContext) {
  const filename = c.req.param("filename") ?? "";
  if (!filename || filename !== basename(filename)) throw new HTTPException(404, { message: "Media not found." });
  return filename;
}

function assertMediaProfileVisible(c: AppContext, profileId: number) {
  try {
    visibleProfile(c, profileId);
  } catch (error) {
    if (error instanceof HTTPException) throw new HTTPException(404, { message: "Media not found." });
    throw error;
  }
}

async function mediaFile(c: AppContext, root: string, filename: string) {
  const data = await readFile(join(root, filename)).catch(() => null);
  if (!data) throw new HTTPException(404, { message: "Media not found." });

  c.header("Cache-Control", "private, no-store");
  c.header("Content-Type", mediaContentTypes.get(extname(filename).toLowerCase()) ?? "application/octet-stream");
  return c.body(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
}
