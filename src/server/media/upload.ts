import { open, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { HTTPException } from "hono/http-exception";
import { defaultMedia, defaultProfileImageNames, limits } from "../../policy.js";
import { mediaUploadPolicies, type MediaUploadTarget } from "./policy.js";
import { processUserMedia } from "./processing.js";
import { validateIncomingMedia } from "./validation.js";

export async function saveProfileImage(file: File) {
  return saveUpload(file, "profileImage");
}

export async function savePostImage(file: File) {
  return saveUpload(file, "postImage");
}

export async function saveProfileThemeSong(file: File) {
  return saveUpload(file, "profileThemeSong");
}

export async function deleteProfileImage(filename: string) {
  if (defaultProfileImageNames.has(filename)) return;
  await deleteUpload(mediaUploadPolicies.profileImage.dir, filename, defaultMedia.pfp);
}

export async function deletePostImage(filename: string | null | undefined) {
  await deleteUpload(mediaUploadPolicies.postImage.dir, filename ?? "", "");
}

export async function deletePostImages(filenames: Iterable<string | null | undefined>) {
  await Promise.all([...filenames].map(deletePostImage));
}

export async function deleteProfileThemeSong(filename: string) {
  await deleteUpload(mediaUploadPolicies.profileThemeSong.dir, filename, defaultMedia.themeSong);
}

async function saveUpload(file: File, target: MediaUploadTarget) {
  if (!file || file.size === 0) return undefined;
  if (file.size > limits.uploadBytes) throw new HTTPException(400, { message: "File is too large." });

  const buffer = Buffer.from(await file.arrayBuffer());
  const policy = mediaUploadPolicies[target];
  const accepted = validateIncomingMedia(file, buffer, policy);
  const processed = await processUserMedia({ ...accepted, buffer, policy });
  if (processed.buffer.length > limits.uploadBytes) throw new HTTPException(400, { message: "File is too large." });

  const filename = `${randomUUID()}${processed.ext}`;
  const handle = await open(join(policy.dir, filename), "wx");
  try {
    await handle.writeFile(processed.buffer);
  } finally {
    await handle.close();
  }
  return filename;
}

async function deleteUpload(dir: string, filename: string, fallback: string) {
  if (!filename || filename === fallback || filename !== basename(filename)) return;
  await rm(join(dir, filename), { force: true });
}
