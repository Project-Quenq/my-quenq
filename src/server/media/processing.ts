import { HTTPException } from "hono/http-exception";
import sharp from "sharp";
import { env } from "../env.js";
import type { MediaUploadPolicy } from "./policy.js";

type ProcessedMedia = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

sharp.concurrency(env.mediaConcurrency);

export async function processUserMedia(input: {
  buffer: Buffer;
  contentType: string;
  ext: string;
  policy: MediaUploadPolicy;
}): Promise<ProcessedMedia> {
  if (input.policy.mediaClass === "image") return processImage(input);

  return {
    buffer: input.buffer,
    contentType: input.contentType,
    ext: input.ext
  };
}

async function processImage(input: {
  buffer: Buffer;
  contentType: string;
  ext: string;
  policy: MediaUploadPolicy;
}): Promise<ProcessedMedia> {
  const policy = input.policy.image;
  if (!policy) throw new HTTPException(500, { message: "Image processing policy is missing." });

  try {
    const buffer = await sharp(input.buffer, {
      animated: supportsAnimation(input.ext),
      limitInputPixels: policy.limitInputPixels
    })
      .rotate()
      .resize({
        fit: "inside",
        height: policy.maxHeight,
        width: policy.maxWidth,
        withoutEnlargement: true
      })
      .webp({
        effort: policy.effort,
        quality: policy.quality
      })
      .toBuffer();

    return {
      buffer,
      contentType: policy.output.contentType,
      ext: policy.output.ext
    };
  } catch {
    throw new HTTPException(400, { message: "Image could not be processed." });
  }
}

function supportsAnimation(ext: string) {
  return ext === ".gif" || ext === ".webp";
}
