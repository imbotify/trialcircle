/** Client-safe view models shared by the API and the UI (no server imports). */

export type PersonView = {
  id: string;
  spaceId: string;
  name: string;
  avatarUrl: string | null;
  relationshipToMe: string | null;
  tags: string[];
  isMe: boolean;
  createdAt: string;
};

export type EdgeView = {
  id: string;
  spaceId: string;
  fromPersonId: string;
  toPersonId: string;
  label: string;
  type: "mutual" | "directional";
};

export type LayoutView = {
  personId: string;
  viewMode: ViewMode;
  x: number;
  y: number;
};

export type ViewMode = "circle" | "tree";

export type SpaceView = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  updatedAt: string;
};

export type SpaceGraphView = {
  space: SpaceView;
  people: PersonView[];
  relationships: EdgeView[];
  layouts: LayoutView[];
};

export type SpaceSummaryView = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  peopleCount: number;
  connectionCount: number;
  updatedAt: string;
};

export type FieldView = { id: string; label: string; value: string; sortOrder: number };

export type MediaView = {
  id: string;
  kind: "photo" | "document";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  url: string;
  createdAt: string;
};

export type MemoryView = {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  imageUrl: string | null;
  icon: string;
};

export type ConnectionView = {
  relationshipId: string;
  label: string;
  type: "mutual" | "directional";
  direction: "outgoing" | "incoming";
  person: PersonView;
};

export type PersonDetailView = {
  person: PersonView;
  space: { id: string; name: string; icon: string; color: string };
  fields: FieldView[];
  media: MediaView[];
  memories: MemoryView[];
  connections: ConnectionView[];
};

export type AccountView = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isDemo: boolean;
};

export type AllConnectionRow = PersonView & {
  connectionCount: number;
  space: { id: string; name: string; icon: string; color: string };
};
