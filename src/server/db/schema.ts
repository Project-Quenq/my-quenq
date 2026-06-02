import { sqlite } from "./client.js";
import { ensureRuntimeDirs } from "../env.js";
import { installDefaultAutomodRules } from "../moderation/automodDefaults.js";
import { blogCategories, defaultBlogCategory } from "../../policy.js";
import { ensureDefaultGroupMemberships } from "./groups.js";
import { ensureProtectedAdminFriendships } from "./relationships.js";
import { installBuiltinSkins } from "./skins.js";
import {
  notificationContextTypeNames,
  notificationKindNames,
  notificationPreferenceTypeNames,
  notificationPreferenceTypes,
  notificationKinds,
  notificationSubjectTypeNames
} from "../../notifications.js";

const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;
const blogCategoryCheck = blogCategories.map(sqlString).join(", ");
const notificationKindCheck = notificationKindNames.map(sqlString).join(", ");
const notificationPreferenceTypeCheck = notificationPreferenceTypeNames.map(sqlString).join(", ");
const notificationSubjectTypeCheck = notificationSubjectTypeNames.map(sqlString).join(", ");
const notificationContextTypeCheck = notificationContextTypeNames.map(sqlString).join(", ");

const schemaSql = `
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  email_canonical TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  verified_at TEXT,
  banned_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_canonical_idx ON users(email_canonical);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_created_idx ON users(created_at);

CREATE TABLE IF NOT EXISTS handle_reservations (
  handle TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS handle_reservations_user_idx ON handle_reservations(user_id);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description_html TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS groups_owner_idx ON groups(owner_id);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio_html TEXT NOT NULL DEFAULT '',
  skin_html TEXT NOT NULL DEFAULT '',
  interests_json TEXT NOT NULL,
  social_links_json TEXT NOT NULL DEFAULT '{}',
  status_json TEXT NOT NULL,
  pfp TEXT NOT NULL DEFAULT 'default',
  theme_song TEXT NOT NULL DEFAULT 'default.mp3',
  current_group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  private INTEGER NOT NULL DEFAULT 0 CHECK (private IN (0, 1)),
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  handle TEXT NOT NULL REFERENCES handle_reservations(handle)
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_idx ON profiles(handle);
CREATE INDEX IF NOT EXISTS profiles_pfp_idx ON profiles(pfp);
CREATE INDEX IF NOT EXISTS profiles_theme_song_idx ON profiles(theme_song);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL,
  csrf_token TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  action TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (action, subject_hash, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limit_counters_window_idx ON rate_limit_counters(window_start);
CREATE INDEX IF NOT EXISTS rate_limit_counters_updated_idx ON rate_limit_counters(updated_at);

CREATE TABLE IF NOT EXISTS rate_limit_settings (
  action TEXT PRIMARY KEY,
  limit_count INTEGER NOT NULL CHECK (limit_count >= 0),
  window_seconds INTEGER NOT NULL CHECK (window_seconds >= 1),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS rate_limit_settings_updated_idx ON rate_limit_settings(updated_at);

CREATE TABLE IF NOT EXISTS friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (sender_id <> receiver_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_idx ON friendships(sender_id, receiver_id);
-- Unordered-pair uniqueness: blocks a second row with sender and receiver
-- swapped, so A->B and B->A cannot both exist.
CREATE UNIQUE INDEX IF NOT EXISTS friendships_unordered_pair_idx ON friendships(min(sender_id, receiver_id), max(sender_id, receiver_id));
CREATE INDEX IF NOT EXISTS friendships_sender_status_created_idx ON friendships(sender_id, status, created_at);
CREATE INDEX IF NOT EXISTS friendships_receiver_status_created_idx ON friendships(receiver_id, status, created_at);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  favorite_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, favorite_id)
);
CREATE INDEX IF NOT EXISTS favorites_favorite_idx ON favorites(favorite_id, created_at);

CREATE TABLE IF NOT EXISTS blogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body_html TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT ${sqlString(defaultBlogCategory)} CHECK (category IN (${blogCategoryCheck})),
  privacy_level INTEGER NOT NULL DEFAULT 0 CHECK (privacy_level IN (0, 1, 2)),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  comments_enabled INTEGER NOT NULL DEFAULT 1 CHECK (comments_enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS blogs_author_idx ON blogs(author_id);
CREATE INDEX IF NOT EXISTS blogs_feed_idx ON blogs(pinned, created_at);
CREATE INDEX IF NOT EXISTS blogs_category_idx ON blogs(category, pinned, created_at);

CREATE TABLE IF NOT EXISTS blog_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text_html TEXT NOT NULL,
  parent_id INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS blog_comments_blog_idx ON blog_comments(blog_id);
CREATE INDEX IF NOT EXISTS blog_comments_blog_created_idx ON blog_comments(blog_id, created_at);

CREATE TABLE IF NOT EXISTS blog_props (
  blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blog_id, user_id)
);
CREATE INDEX IF NOT EXISTS blog_props_user_idx ON blog_props(user_id, created_at);

CREATE TABLE IF NOT EXISTS group_members (
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'owner')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS group_members_user_idx ON group_members(user_id);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wall_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  body_html TEXT NOT NULL,
  media_filename TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((wall_user_id IS NOT NULL) <> (group_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS posts_author_idx ON posts(author_id, created_at);
CREATE INDEX IF NOT EXISTS posts_wall_idx ON posts(wall_user_id, created_at);
CREATE INDEX IF NOT EXISTS posts_group_idx ON posts(group_id, created_at);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts(created_at);
CREATE INDEX IF NOT EXISTS posts_media_filename_idx ON posts(media_filename);

CREATE TABLE IF NOT EXISTS post_props (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_props_user_idx ON post_props(user_id, created_at);

CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text_html TEXT NOT NULL,
  parent_id INTEGER REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS post_comments_post_idx ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS post_comments_author_created_idx ON post_comments(author_id, created_at);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subject_author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subject_type TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  reason_html TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS reports_subject_idx ON reports(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS reports_unresolved_idx ON reports(resolved_at);
CREATE INDEX IF NOT EXISTS reports_created_idx ON reports(created_at);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  read_at TEXT,
  sender_deleted INTEGER NOT NULL DEFAULT 0 CHECK (sender_deleted IN (0, 1)),
  receiver_deleted INTEGER NOT NULL DEFAULT 0 CHECK (receiver_deleted IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS messages_receiver_visible_idx ON messages(receiver_id, receiver_deleted, created_at, id);
CREATE INDEX IF NOT EXISTS messages_sender_visible_idx ON messages(sender_id, sender_deleted, created_at, id);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (${notificationPreferenceTypeCheck})),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, type)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (${notificationKindCheck})),
  subject_type TEXT NOT NULL CHECK (subject_type IN (${notificationSubjectTypeCheck})),
  subject_id INTEGER NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN (${notificationContextTypeCheck})),
  context_id INTEGER NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (recipient_id <> actor_id)
);
CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx ON notifications(recipient_id, created_at, id);
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx ON notifications(recipient_id, read_at, created_at);
CREATE INDEX IF NOT EXISTS notifications_context_idx ON notifications(context_type, context_id, created_at);

CREATE TRIGGER IF NOT EXISTS notifications_wall_posts_insert
AFTER INSERT ON posts
WHEN NEW.wall_user_id IS NOT NULL
  AND NEW.wall_user_id <> NEW.author_id
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks b
    WHERE (b.blocker_id = NEW.wall_user_id AND b.blocked_id = NEW.author_id)
      OR (b.blocker_id = NEW.author_id AND b.blocked_id = NEW.wall_user_id)
  )
  AND NOT EXISTS (
    SELECT 1 FROM notification_preferences np
    WHERE np.user_id = NEW.wall_user_id
      AND np.type = ${sqlString(notificationPreferenceTypes.wallPosts)}
      AND np.enabled = 0
  )
BEGIN
  INSERT INTO notifications (
    recipient_id, actor_id, kind, subject_type, subject_id, context_type, context_id
  ) VALUES (
    NEW.wall_user_id, NEW.author_id, ${sqlString(notificationKinds.wallPost)}, 'post', NEW.id, 'post', NEW.id
  );
END;

CREATE TRIGGER IF NOT EXISTS notifications_posts_delete
AFTER DELETE ON posts
BEGIN
  DELETE FROM notifications
  WHERE (context_type = 'post' AND context_id = OLD.id)
    OR (subject_type = 'post' AND subject_id = OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS notifications_post_comments_delete
AFTER DELETE ON post_comments
BEGIN
  DELETE FROM notifications
  WHERE subject_type = 'post_comment' AND subject_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS notifications_blogs_delete
AFTER DELETE ON blogs
BEGIN
  DELETE FROM notifications
  WHERE (context_type = 'blog' AND context_id = OLD.id)
    OR (subject_type = 'blog' AND subject_id = OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS notifications_blog_comments_delete
AFTER DELETE ON blog_comments
BEGIN
  DELETE FROM notifications
  WHERE subject_type = 'blog_comment' AND subject_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS notifications_groups_delete
BEFORE DELETE ON groups
BEGIN
  DELETE FROM notifications
  WHERE context_type = 'post' AND context_id IN (SELECT id FROM posts WHERE group_id = OLD.id);
END;

CREATE TABLE IF NOT EXISTS skins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description_html TEXT NOT NULL,
  code_html TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS skins_author_idx ON skins(author_id);
CREATE INDEX IF NOT EXISTS skins_updated_idx ON skins(updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS skins_source_key_idx ON skins(source_key);

CREATE TABLE IF NOT EXISTS skin_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skin_id INTEGER NOT NULL REFERENCES skins(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text_html TEXT NOT NULL,
  parent_id INTEGER REFERENCES skin_comments(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS skin_comments_skin_idx ON skin_comments(skin_id);
CREATE INDEX IF NOT EXISTS skin_comments_skin_created_idx ON skin_comments(skin_id, created_at);

CREATE TRIGGER IF NOT EXISTS notifications_skins_delete
AFTER DELETE ON skins
BEGIN
  DELETE FROM notifications
  WHERE (context_type = 'skin' AND context_id = OLD.id)
    OR (subject_type = 'skin' AND subject_id = OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS notifications_skin_comments_delete
AFTER DELETE ON skin_comments
BEGIN
  DELETE FROM notifications
  WHERE subject_type = 'skin_comment' AND subject_id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON user_blocks(blocked_id, blocker_id);

CREATE TABLE IF NOT EXISTS reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS reset_tokens_user_idx ON reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS verification_tokens_user_idx ON verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS email_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  sent_at TEXT,
  delivery_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS email_outbox_created_idx ON email_outbox(created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  reason_html TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS audit_log_subject_idx ON audit_log(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS automod_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  pattern_type TEXT NOT NULL DEFAULT 'keyword' CHECK (pattern_type IN ('keyword', 'regex')),
  scope TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('all', 'profile', 'blog', 'post', 'comment', 'group', 'skin', 'message')),
  action TEXT NOT NULL DEFAULT 'review' CHECK (action IN ('review', 'reject')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS automod_rules_enabled_idx ON automod_rules(enabled, scope);
CREATE INDEX IF NOT EXISTS automod_rules_updated_idx ON automod_rules(updated_at);
`;

export function initializeDatabase() {
  ensureRuntimeDirs();
  sqlite.exec(schemaSql);
  installDefaultAutomodRules();
  installBuiltinSkins();
  ensureProtectedAdminFriendships();
  ensureDefaultGroupMemberships();
}
