import { prisma } from "@/lib/db";
import { ALL_ACCOLADE_SEEDS } from "@/lib/gamification/accolade-definitions";

export async function ensureAccoladeDefinitions(): Promise<void> {
  for (const seed of ALL_ACCOLADE_SEEDS) {
    await prisma.accoladeDefinition.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        emoji: seed.emoji,
        category: seed.category,
        kind: seed.kind,
        sortOrder: seed.sortOrder,
        config: seed.config ?? undefined,
      },
      update: {
        name: seed.name,
        description: seed.description,
        emoji: seed.emoji,
        category: seed.category,
        kind: seed.kind,
        sortOrder: seed.sortOrder,
        config: seed.config ?? undefined,
      },
    });
  }
}
