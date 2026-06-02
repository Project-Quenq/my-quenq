import { extname } from "node:path";
import { HTTPException } from "hono/http-exception";
import { extensionAliases, mediaTypes, type MediaUploadPolicy } from "./policy.js";

type AcceptedMedia = {
  contentType: string;
  ext: string;
};

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const fileSignatures = new Map<string, (buffer: Buffer) => boolean>([
  [".jpg", (buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff],
  [".png", (buffer) => buffer.subarray(0, pngSignature.length).equals(pngSignature)],
  [".gif", (buffer) => buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a"],
  [".webp", (buffer) => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP"],
  [".mp3", (buffer) => buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)]
]);

export function validateIncomingMedia(file: File, buffer: Buffer, policy: MediaUploadPolicy): AcceptedMedia {
  const mediaType = mediaTypes[policy.mediaClass];
  const ext = acceptedExtension(file, mediaType);
  if (!ext || !fileSignatures.get(ext)?.(buffer)) throw new HTTPException(400, { message: "File type is not allowed." });

  return {
    contentType: contentTypeForExtension(ext, mediaType) ?? file.type,
    ext
  };
}

function acceptedExtension(file: File, mediaType: (typeof mediaTypes)[keyof typeof mediaTypes]) {
  const fileExt = extname(file.name).toLowerCase();
  const fallbackExt = extensionAliases.get(fileExt) ?? fileExt;
  return mediaType.mimeExtensions.get(file.type) ?? (mediaType.extensions.has(fallbackExt) ? fallbackExt : undefined);
}

function contentTypeForExtension(ext: string, mediaType: (typeof mediaTypes)[keyof typeof mediaTypes]) {
  for (const [contentType, contentExt] of mediaType.mimeExtensions) {
    if (contentExt === ext) return contentType;
  }
  return undefined;
}
