import { deletePostImage, deletePostImages } from "../../media/upload.js";
import { deleteComment } from "../comments.js";
import { deleteBlog } from "../blogs/index.js";
import { deleteGroup } from "../groups.js";
import { deleteMessage } from "../messages/index.js";
import { deletePost, postImageFilenamesForGroup } from "../posts/index.js";
import { deleteSkin } from "../skins.js";
import { commentSourceFor } from "./subjectSources.js";
import type { DeletableReportSubjectType, ReportSubjectType } from "../../../policy.js";

type SubjectDeleter = (id: number, actorId: number) => boolean | Promise<boolean>;

const subjectDeleters = {
  blog: (id: number, actorId: number) => deleteBlog(id, actorId, true),
  group: async (id: number, actorId: number) => {
    const postImages = postImageFilenamesForGroup(id);
    const deleted = deleteGroup(id, actorId, true);
    if (deleted) await deletePostImages(postImages);
    return deleted;
  },
  skin: (id: number, actorId: number) => deleteSkin(id, actorId, true),
  message: (id: number) => deleteMessage(id),
  post: async (id: number, actorId: number) => {
    const media = deletePost(id, actorId, true);
    if (media === false) return false;
    await deletePostImage(media);
    return true;
  }
} satisfies Record<DeletableReportSubjectType, SubjectDeleter>;

export async function deleteModerationSubject(type: ReportSubjectType, id: number, actorId: number) {
  const commentTarget = commentSourceFor(type)?.target;
  if (commentTarget) return deleteComment(commentTarget, id, actorId, true);

  return isDeletableSubjectType(type) ? await subjectDeleters[type](id, actorId) : false;
}

function isDeletableSubjectType(type: ReportSubjectType): type is DeletableReportSubjectType {
  return type in subjectDeleters;
}
