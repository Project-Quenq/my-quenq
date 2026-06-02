import { sqlite } from "../client.js";
import { anchors } from "../../../anchors.js";
import type { CommentReportSubjectType, ContentReportSubjectType } from "../../../policy.js";
import type { CommentTarget } from "../comments.js";
import { blogCommentsPath, blogPath, groupPath, postPath, profilePath, skinCommentsPath, skinPath } from "../../../paths.js";

export type SubjectRow = {
  title?: string | null;
  bodyHtml?: string | null;
  url?: string | null;
  authorId: number | null;
  authorName: string | null;
  authorHandle: string | null;
  parentId?: number;
  receiverName?: string | null;
};

type CommentSource = {
  target: CommentTarget;
  label: string;
  url: (parentId: number, commentId: number) => string;
  row: (id: number) => SubjectRow | undefined;
};

type SubjectSource = {
  label: string;
  canDelete: boolean;
  row: (id: number) => SubjectRow | undefined;
};

const commentSources = {
  blog_comment: {
    target: "blog",
    label: "Blog comment",
    url: (parentId: number, commentId: number) => `${blogCommentsPath(parentId)}#${anchors.comment(commentId)}`,
    row: (id: number) => commentRow("blog_comments", "blog_id", id)
  },
  post_comment: {
    target: "post",
    label: "Post comment",
    url: (parentId: number, commentId: number) => `${postPath(parentId)}#${anchors.comment(commentId)}`,
    row: (id: number) => commentRow("post_comments", "post_id", id)
  },
  skin_comment: {
    target: "skin",
    label: "Skin comment",
    url: (parentId: number, commentId: number) => `${skinCommentsPath(parentId)}#${anchors.comment(commentId)}`,
    row: (id: number) => commentRow("skin_comments", "skin_id", id)
  }
} as const satisfies Record<CommentReportSubjectType, CommentSource>;

const subjectSources = {
  post: {
    label: "Post",
    canDelete: true,
    row: (id: number) => row(
      `SELECT po.body_html AS bodyHtml, ? AS url, u.id AS authorId, u.username AS authorName, p.handle AS authorHandle
      FROM posts po
      JOIN users u ON u.id = po.author_id
      JOIN profiles p ON p.user_id = u.id
      WHERE po.id = ?`,
      postPath(id),
      id
    )
  },
  user: {
    label: "User",
    canDelete: false,
    row: (id: number) => {
      const subject = row(
        `SELECT u.id AS authorId, u.username AS authorName, p.handle AS authorHandle, p.bio_html AS bodyHtml
        FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`,
        id
      );
      return subject?.authorHandle ? { ...subject, url: profilePath(subject.authorHandle) } : subject;
    }
  },
  blog: {
    label: "Blog entry",
    canDelete: true,
    row: (id: number) => row(
      `SELECT b.title, b.body_html AS bodyHtml, ? AS url, u.id AS authorId, u.username AS authorName, p.handle AS authorHandle
      FROM blogs b
      JOIN users u ON u.id = b.author_id
      JOIN profiles p ON p.user_id = u.id
      WHERE b.id = ?`,
      blogPath(id),
      id
    )
  },
  group: {
    label: "Group",
    canDelete: true,
    row: (id: number) => row(
      `SELECT g.name AS title, g.description_html AS bodyHtml, ? AS url, u.id AS authorId, u.username AS authorName, p.handle AS authorHandle
      FROM groups g
      JOIN users u ON u.id = g.owner_id
      JOIN profiles p ON p.user_id = u.id
      WHERE g.id = ?`,
      groupPath(id),
      id
    )
  },
  skin: {
    label: "Skin",
    canDelete: true,
    row: (id: number) => row(
      `SELECT s.title, s.description_html AS bodyHtml, ? AS url, u.id AS authorId,
        CASE WHEN s.source_key IS NOT NULL THEN 'quenq' ELSE u.username END AS authorName,
        p.handle AS authorHandle
      FROM skins s
      LEFT JOIN users u ON u.id = s.author_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE s.id = ?`,
      skinPath(id),
      id
    )
  },
  message: {
    label: "Private message",
    canDelete: true,
    row: (id: number) => row(
      `SELECT m.subject AS title, m.body_html AS bodyHtml, NULL AS url,
        sender.id AS authorId, sender.username AS authorName, senderProfile.handle AS authorHandle, receiver.username AS receiverName
      FROM messages m
      JOIN users sender ON sender.id = m.sender_id
      JOIN profiles senderProfile ON senderProfile.user_id = sender.id
      JOIN users receiver ON receiver.id = m.receiver_id
      WHERE m.id = ?`,
      id
    )
  }
} satisfies Record<ContentReportSubjectType, SubjectSource>;

export function commentSourceFor(type: string) {
  return isCommentSourceType(type) ? commentSources[type] : undefined;
}

export function subjectSourceFor(type: string) {
  return isSubjectSourceType(type) ? subjectSources[type] : undefined;
}

function isCommentSourceType(type: string): type is keyof typeof commentSources {
  return Object.hasOwn(commentSources, type);
}

function isSubjectSourceType(type: string): type is keyof typeof subjectSources {
  return Object.hasOwn(subjectSources, type);
}

function commentRow(table: string, parentColumn: string, id: number) {
  return row(
    `SELECT c.text_html AS bodyHtml, c.${parentColumn} AS parentId, u.id AS authorId, u.username AS authorName, p.handle AS authorHandle
    FROM ${table} c
    JOIN users u ON u.id = c.author_id
    JOIN profiles p ON p.user_id = u.id
    WHERE c.id = ?`,
    id
  );
}

function row(sql: string, ...params: unknown[]) {
  return sqlite.prepare(sql).get(...params) as SubjectRow | undefined;
}
