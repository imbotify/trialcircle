import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customFields, graphLayouts, memories, people, relationships, spaces, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=240&w=240`;

const AVATARS = {
  man1: px(33136738),
  man2: px(4449136),
  woman1: px(10230832),
  woman2: px(35725749),
  woman3: px(32420159),
  man3: px(33148747),
  man4: px(8727669),
  woman4: px(11763450),
  woman5: px(35725753),
  man5: px(1054048),
};

export const DEMO_EMAIL = "demo@circlemap.app";
export const DEMO_PASSWORD = "circlemap";

type SeedPerson = {
  key: string;
  name: string;
  relationshipToMe?: string;
  avatarUrl?: string;
  tags?: string[];
  x: number;
  y: number;
  fields?: Array<[string, string]>;
  memories?: Array<{ date: string; title: string; description: string; icon: string; image?: string }>;
};

type SeedEdge = { from: string; to: string; label: string; type?: "mutual" | "directional" };

type SeedSpace = {
  name: string;
  description: string;
  icon: string;
  color: string;
  mePosition?: { x: number; y: number };
  people: SeedPerson[];
  edges: SeedEdge[];
};

/**
 * Demo content deliberately contains person-to-person edges that do NOT pass
 * through "Me" (e.g. Priya <-> Neha), multi-hop paths, and a cycle, so the graph
 * exercises real topology instead of a star.
 */
export const SEED_SPACES: SeedSpace[] = [
  {
    name: "My Family",
    description: "The people I grew up with and the ones who came after.",
    icon: "🏠",
    color: "#6366F1",
    people: [
      {
        key: "mom",
        name: "Anita Sharma",
        relationshipToMe: "Mother",
        avatarUrl: AVATARS.woman3,
        tags: ["Family", "Close"],
        x: -40,
        y: -220,
        fields: [
          ["Phone", "+91 98765 43210"],
          ["Birthday", "14 Mar 1968"],
          ["Favourite Food", "Rajma Chawal"],
          ["Lives in", "Jaipur"],
        ],
        memories: [
          {
            date: "2024-03-14",
            title: "Her 56th birthday",
            description: "Surprised her with a rooftop dinner and the whole family on video call.",
            icon: "🎂",
          },
          {
            date: "2023-08-02",
            title: "Taught me her rajma recipe",
            description: "Two hours in the kitchen, no measurements, all instinct.",
            icon: "🍲",
          },
        ],
      },
      {
        key: "dad",
        name: "Rajesh Sharma",
        relationshipToMe: "Father",
        avatarUrl: AVATARS.man3,
        tags: ["Family"],
        x: 210,
        y: -190,
        fields: [
          ["Phone", "+91 98200 11223"],
          ["Birthday", "2 Nov 1964"],
          ["Met at", "Home"],
        ],
        memories: [
          {
            date: "2022-12-25",
            title: "Fixed the old scooter together",
            description: "He still remembers every part number from 1991.",
            icon: "🔧",
          },
        ],
      },
      {
        key: "aman",
        name: "Aman Sharma",
        relationshipToMe: "Brother",
        avatarUrl: AVATARS.man1,
        tags: ["Family", "Close"],
        x: -250,
        y: 40,
        fields: [
          ["Phone", "+91 90000 55512"],
          ["Instagram", "@aman.shr"],
          ["Works at", "Zeta Labs"],
        ],
        memories: [
          {
            date: "2023-03-02",
            title: "Road trip to Manali",
            description: "Eleven hours of bad playlists and very good conversation.",
            icon: "🚗",
          },
        ],
      },
      {
        key: "neha",
        name: "Neha Sharma",
        relationshipToMe: "Sister",
        avatarUrl: AVATARS.woman2,
        tags: ["Family", "Close"],
        x: 250,
        y: 60,
        fields: [
          ["Birthday", "12 Mar 1998"],
          ["Favourite Food", "Biryani"],
          ["Instagram", "@neha.123"],
        ],
      },
      {
        key: "priya",
        name: "Priya Mehta",
        relationshipToMe: "Cousin",
        avatarUrl: AVATARS.woman1,
        tags: ["Family", "Delhi"],
        x: 40,
        y: 250,
        fields: [
          ["Phone", "+91 98765 43210"],
          ["Birthday", "12 Mar 1998"],
          ["Favourite Food", "Biryani"],
          ["Met at", "College"],
          ["Instagram", "@priya.123"],
        ],
        memories: [
          {
            date: "2023-08-15",
            title: "Last phone call",
            description: "Had a long conversation about her new job in Bengaluru.",
            icon: "📞",
          },
          {
            date: "2020-01-12",
            title: "First met at college",
            description: "We met during orientation week and instantly argued about music.",
            icon: "🎓",
          },
        ],
      },
      {
        key: "meera",
        name: "Meera Mehta",
        relationshipToMe: "Aunt",
        avatarUrl: AVATARS.woman4,
        tags: ["Family"],
        x: -230,
        y: 260,
        fields: [["Lives in", "Delhi"]],
      },
    ],
    edges: [
      { from: "me", to: "mom", label: "Mother" },
      { from: "me", to: "dad", label: "Father" },
      { from: "me", to: "aman", label: "Brother" },
      { from: "me", to: "neha", label: "Sister" },
      { from: "me", to: "priya", label: "Cousin" },
      { from: "mom", to: "dad", label: "Married" },
      { from: "mom", to: "aman", label: "Son", type: "directional" },
      { from: "dad", to: "neha", label: "Daughter", type: "directional" },
      { from: "aman", to: "neha", label: "Siblings" },
      { from: "priya", to: "neha", label: "Cousins" },
      { from: "priya", to: "meera", label: "Daughter", type: "directional" },
      { from: "meera", to: "mom", label: "Sisters" },
      { from: "aman", to: "priya", label: "Childhood Friends" },
    ],
  },
  {
    name: "Work Circle",
    description: "Colleagues, mentors and the people I ship with.",
    icon: "💼",
    color: "#06B6D4",
    people: [
      {
        key: "vikram",
        name: "Vikram Iyer",
        relationshipToMe: "Manager",
        avatarUrl: AVATARS.man2,
        tags: ["Work", "Important"],
        x: 0,
        y: -230,
        fields: [
          ["Team", "Platform"],
          ["Met at", "Zeta Labs"],
          ["Last 1:1", "12 Feb 2026"],
        ],
        memories: [
          {
            date: "2025-11-04",
            title: "Pitched the graph rewrite",
            description: "He backed the idea in front of leadership without hesitation.",
            icon: "🧠",
          },
        ],
      },
      {
        key: "sara",
        name: "Sara Kapoor",
        relationshipToMe: "Colleague",
        avatarUrl: AVATARS.woman5,
        tags: ["Work", "Close"],
        x: -240,
        y: -40,
        fields: [
          ["Role", "Product Designer"],
          ["Instagram", "@sara.makes"],
        ],
      },
      {
        key: "dan",
        name: "Daniel Okoro",
        relationshipToMe: "Former Boss",
        avatarUrl: AVATARS.man4,
        tags: ["Work", "Lost Touch"],
        x: 250,
        y: 10,
        fields: [["Company", "Northwind"]],
      },
      {
        key: "ria",
        name: "Ria Nambiar",
        relationshipToMe: "Colleague",
        avatarUrl: AVATARS.woman1,
        tags: ["Work"],
        x: -120,
        y: 230,
        fields: [["Role", "Data Engineer"]],
      },
      {
        key: "karan",
        name: "Karan Bose",
        relationshipToMe: "Business Partner",
        avatarUrl: AVATARS.man5,
        tags: ["Work", "Important"],
        x: 170,
        y: 240,
      },
    ],
    edges: [
      { from: "me", to: "vikram", label: "Manager", type: "directional" },
      { from: "me", to: "sara", label: "Colleague" },
      { from: "me", to: "dan", label: "Former Boss", type: "directional" },
      { from: "me", to: "karan", label: "Business Partner" },
      { from: "vikram", to: "sara", label: "Manages", type: "directional" },
      { from: "vikram", to: "ria", label: "Manages", type: "directional" },
      { from: "sara", to: "ria", label: "Project Team" },
      { from: "dan", to: "vikram", label: "Former Colleagues" },
      { from: "karan", to: "ria", label: "Knows" },
    ],
  },
  {
    name: "College Friends",
    description: "Hostel block C, and everything that came out of it.",
    icon: "🎓",
    color: "#8B5CF6",
    people: [
      {
        key: "rahul",
        name: "Rahul Verma",
        relationshipToMe: "Best Friend",
        avatarUrl: AVATARS.man1,
        tags: ["College", "Close"],
        x: -180,
        y: -160,
        fields: [
          ["Phone", "+91 99887 66554"],
          ["Met at", "Hostel Block C"],
        ],
        memories: [
          {
            date: "2019-12-05",
            title: "Her birthday party we crashed",
            description: "Still the funniest night of second year.",
            icon: "🎉",
          },
        ],
      },
      {
        key: "priyaC",
        name: "Priya Nair",
        relationshipToMe: "Classmate",
        avatarUrl: AVATARS.woman3,
        tags: ["College"],
        x: 200,
        y: -150,
        fields: [["Course", "Computer Science"]],
      },
      {
        key: "arjun",
        name: "Arjun Rao",
        relationshipToMe: "Friend",
        avatarUrl: AVATARS.man3,
        tags: ["College", "Lost Touch"],
        x: 240,
        y: 140,
      },
      {
        key: "tara",
        name: "Tara Dsouza",
        relationshipToMe: "Friend",
        avatarUrl: AVATARS.woman4,
        tags: ["College", "Close"],
        x: -220,
        y: 160,
      },
    ],
    edges: [
      { from: "me", to: "rahul", label: "Best Friend" },
      { from: "me", to: "priyaC", label: "Classmate" },
      { from: "rahul", to: "priyaC", label: "Childhood Friends" },
      { from: "priyaC", to: "arjun", label: "College Friends" },
      { from: "arjun", to: "tara", label: "Former Colleagues" },
      { from: "tara", to: "rahul", label: "Flatmates" },
    ],
  },
  {
    name: "Neighbours",
    description: "The people two doors away who always show up.",
    icon: "🌿",
    color: "#10B981",
    people: [
      {
        key: "gupta",
        name: "Mr. Gupta",
        relationshipToMe: "Neighbour",
        avatarUrl: AVATARS.man4,
        tags: ["Others"],
        x: -150,
        y: -140,
      },
      {
        key: "leela",
        name: "Leela Gupta",
        relationshipToMe: "Neighbour",
        avatarUrl: AVATARS.woman5,
        tags: ["Others", "Close"],
        x: 180,
        y: -120,
        fields: [["Known since", "2018"]],
      },
      {
        key: "sam",
        name: "Sam Fernandes",
        relationshipToMe: "Gym Partner",
        avatarUrl: AVATARS.man2,
        tags: ["Others"],
        x: 20,
        y: 200,
      },
    ],
    edges: [
      { from: "me", to: "gupta", label: "Neighbour" },
      { from: "me", to: "leela", label: "Neighbour" },
      { from: "me", to: "sam", label: "Gym Partner" },
      { from: "gupta", to: "leela", label: "Married" },
      { from: "leela", to: "sam", label: "Knows" },
    ],
  },
];

async function seedSpace(userId: string, seed: SeedSpace) {
  const [space] = await db
    .insert(spaces)
    .values({
      userId,
      name: seed.name,
      description: seed.description,
      icon: seed.icon,
      color: seed.color,
    })
    .returning();

  const [me] = await db
    .insert(people)
    .values({ spaceId: space.id, isMe: true, relationshipToMe: "This is you", tags: [] })
    .returning();

  const idByKey = new Map<string, string>([["me", me.id]]);
  const layoutRows: Array<typeof graphLayouts.$inferInsert> = [
    { spaceId: space.id, personId: me.id, viewMode: "circle", x: seed.mePosition?.x ?? 0, y: seed.mePosition?.y ?? 0 },
  ];

  for (const p of seed.people) {
    const [row] = await db
      .insert(people)
      .values({
        spaceId: space.id,
        name: p.name,
        relationshipToMe: p.relationshipToMe ?? null,
        avatarUrl: p.avatarUrl ?? null,
        tags: p.tags ?? [],
      })
      .returning();
    idByKey.set(p.key, row.id);
    layoutRows.push({ spaceId: space.id, personId: row.id, viewMode: "circle", x: p.x, y: p.y });

    if (p.fields?.length) {
      await db.insert(customFields).values(
        p.fields.map(([label, value], i) => ({ personId: row.id, label, value, sortOrder: i })),
      );
    }
    if (p.memories?.length) {
      await db.insert(memories).values(
        p.memories.map((m) => ({
          personId: row.id,
          title: m.title,
          description: m.description,
          eventDate: m.date,
          icon: m.icon,
          imageUrl: m.image ?? null,
        })),
      );
    }
  }

  const edgeValues = seed.edges
    .map((e) => {
      const from = idByKey.get(e.from);
      const to = idByKey.get(e.to);
      if (!from || !to) return null;
      return {
        spaceId: space.id,
        fromPersonId: from,
        toPersonId: to,
        label: e.label,
        type: e.type ?? "mutual",
      };
    })
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  if (edgeValues.length) await db.insert(relationships).values(edgeValues).onConflictDoNothing();
  if (layoutRows.length) await db.insert(graphLayouts).values(layoutRows).onConflictDoNothing();
  return space;
}

/** Gives a brand-new account one populated Space so the product is never a blank screen. */
export async function seedStarterSpace(userId: string) {
  await seedSpace(userId, SEED_SPACES[0]);
}

/** Idempotent: creates the shared demo account with the full multi-space network. */
export async function ensureDemoAccount() {
  const existing = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (existing.length) {
    const hasSpaces = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(eq(spaces.userId, existing[0].id))
      .limit(1);
    if (hasSpaces.length) return existing[0];
    for (const seed of SEED_SPACES) await seedSpace(existing[0].id, seed);
    return existing[0];
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      passwordHash,
      displayName: "Krpto",
      bio: "Building a private map of the people who matter.",
      avatarUrl: AVATARS.man5,
      isDemo: true,
    })
    .returning();

  for (const seed of SEED_SPACES) await seedSpace(user.id, seed);
  return user;
}

export async function spaceExistsForUser(userId: string, name: string) {
  const rows = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(and(eq(spaces.userId, userId), eq(spaces.name, name)))
    .limit(1);
  return rows.length > 0;
}
