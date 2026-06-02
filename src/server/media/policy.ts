import { paths } from "../env.js";

type MediaClass = "image" | "audio";
export type MediaUploadTarget = "profileImage" | "postImage" | "profileThemeSong";

type MediaTypePolicy = {
  mimeExtensions: ReadonlyMap<string, string>;
  extensions: ReadonlySet<string>;
};

type ImageProcessingPolicy = {
  maxWidth: number;
  maxHeight: number;
  limitInputPixels: number;
  quality: number;
  effort: number;
  output: {
    contentType: "image/webp";
    ext: ".webp";
  };
};

export type MediaUploadPolicy = {
  dir: string;
  mediaClass: MediaClass;
  image?: ImageProcessingPolicy;
};

const imageMimeExtensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"]
]);

const audioMimeExtensions = new Map([
  ["audio/mpeg", ".mp3"],
  ["audio/mp3", ".mp3"]
]);

const imageProcessingDefaults = {
  effort: 4,
  limitInputPixels: 40_000_000,
  output: {
    contentType: "image/webp",
    ext: ".webp"
  },
  quality: 82
} as const;

export const extensionAliases = new Map([[".jpeg", ".jpg"]]);

export const mediaTypes = {
  image: {
    extensions: new Set(imageMimeExtensions.values()),
    mimeExtensions: imageMimeExtensions
  },
  audio: {
    extensions: new Set(audioMimeExtensions.values()),
    mimeExtensions: audioMimeExtensions
  }
} satisfies Record<MediaClass, MediaTypePolicy>;

export const mediaUploadPolicies = {
  profileImage: {
    dir: paths.pfp,
    image: {
      ...imageProcessingDefaults,
      maxHeight: 768,
      maxWidth: 768
    },
    mediaClass: "image"
  },
  postImage: {
    dir: paths.postImages,
    image: {
      ...imageProcessingDefaults,
      maxHeight: 2048,
      maxWidth: 2048
    },
    mediaClass: "image"
  },
  profileThemeSong: {
    dir: paths.themeSongs,
    mediaClass: "audio"
  }
} satisfies Record<MediaUploadTarget, MediaUploadPolicy>;
