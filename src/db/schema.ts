import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * CircleMap schema.
 *
 * Ownership chain (enforced in the data-access layer on every query):
 *   users -> spaces -> people -> (custom_fields | media | memories)
 *   relationships -> space + from_person + to_person (all same space)
 *   graph_layouts -> space + person + view_mode (pure visualization state)
 */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_unique").on(t.token), index("sessions_user_idx").on(t.userId)],
);

export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon").notNull().default("🏠"),
    color: text("color").notNull().default("#6366F1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("spaces_user_idx").on(t.userId)],
);

/**
 * A person inside a Space. The "Me" node (isMe) is the space-local representation
 * of the account: name/avatar are nullable overrides — when null the account value
 * is inherited at read time, so editing the account never clobbers an intentional
 * per-space override.
 */
export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    relationshipToMe: text("relationship_to_me"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    isMe: boolean("is_me").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("people_space_idx").on(t.spaceId)],
);

/** relationshipType: "mutual" | "directional" */
export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    fromPersonId: uuid("from_person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    toPersonId: uuid("to_person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    type: text("type").notNull().default("mutual"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("relationships_space_idx").on(t.spaceId),
    index("relationships_from_idx").on(t.fromPersonId),
    index("relationships_to_idx").on(t.toPersonId),
    // Blocks exact accidental duplicates while still allowing several
    // distinct labels between the same pair of people.
    uniqueIndex("relationships_pair_label_unique").on(t.fromPersonId, t.toPersonId, t.label),
  ],
);

export const customFields = pgTable(
  "custom_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    value: text("value").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("custom_fields_person_idx").on(t.personId)],
);

/** kind: "photo" | "document". Binary payload is private; served only via an authorized route. */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("photo"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    caption: text("caption"),
    /** base64 payload for uploads, or null when externalUrl is used (demo seed). */
    data: text("data"),
    externalUrl: text("external_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_person_idx").on(t.personId)],
);

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    eventDate: text("event_date").notNull(),
    imageUrl: text("image_url"),
    icon: text("icon").notNull().default("✨"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("memories_person_idx").on(t.personId)],
);

/** Pure visualization state. Never holds relationship semantics. viewMode: "circle" | "tree". */
export const graphLayouts = pgTable(
  "graph_layouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    viewMode: text("view_mode").notNull().default("circle"),
    x: real("x").notNull(),
    y: real("y").notNull(),
    pinned: boolean("pinned").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("graph_layouts_unique").on(t.spaceId, t.viewMode, t.personId),
    index("graph_layouts_space_idx").on(t.spaceId, t.viewMode),
  ],
);

export type User = typeof users.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Relationship = typeof relationships.$inferSelect;
export type CustomField = typeof customFields.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type GraphLayout = typeof graphLayouts.$inferSelect;
