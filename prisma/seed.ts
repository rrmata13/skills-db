import { PrismaClient } from "@prisma/client";
import { ALL_MOCK_DATA } from "../data/mock-skills";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  for (const entry of ALL_MOCK_DATA) {
    console.log(`  Syncing source: ${entry.source.name} (${entry.skills.length} skills)`);

    const source = await prisma.sourceRepository.upsert({
      where: { slug: entry.source.slug },
      update: {
        name: entry.source.name,
        author: entry.source.author,
        description: entry.source.description,
        githubUrl: entry.source.githubUrl,
        rating: entry.source.rating,
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
      },
      create: {
        slug: entry.source.slug,
        name: entry.source.name,
        author: entry.source.author,
        sourceUrl: entry.source.sourceUrl,
        githubUrl: entry.source.githubUrl,
        description: entry.source.description,
        rating: entry.source.rating,
        lastSyncedAt: new Date(),
        syncStatus: "SYNCED",
      },
    });

    for (const skill of entry.skills) {
      const slug =
        skill.slug ||
        `${entry.source.slug}-${skill.name.toLowerCase().replace(/\s+/g, "-")}`;

      const embeddingText = [
        skill.name,
        skill.description,
        ...(skill.tags || []),
        ...(skill.categories || []),
        ...(skill.capabilities?.map((c) => c.capability) || []),
      ].join(" ");

      const upsertedSkill = await prisma.skill.upsert({
        where: { slug },
        update: {
          name: skill.name,
          description: skill.description,
          longDescription: skill.longDescription || null,
          rawContent: skill.rawContent || null,
          embeddingText,
          imageUrl: skill.imageUrl || null,
          authorName: skill.authorName || null,
          authorUrl: skill.authorUrl || null,
          repoUrl: skill.repoUrl || null,
          rating: skill.rating || 0,
          lastSyncedAt: new Date(),
        },
        create: {
          sourceRepositoryId: source.id,
          name: skill.name,
          slug,
          description: skill.description,
          longDescription: skill.longDescription || null,
          rawContent: skill.rawContent || null,
          embeddingText,
          imageUrl: skill.imageUrl || null,
          authorName: skill.authorName || null,
          authorUrl: skill.authorUrl || null,
          repoUrl: skill.repoUrl || null,
          rating: skill.rating || 0,
          lastSyncedAt: new Date(),
        },
      });

      // Clear existing
      await prisma.skillCategory.deleteMany({ where: { skillId: upsertedSkill.id } });
      await prisma.skillTag.deleteMany({ where: { skillId: upsertedSkill.id } });
      await prisma.skillCapability.deleteMany({ where: { skillId: upsertedSkill.id } });

      if (skill.categories?.length) {
        await prisma.skillCategory.createMany({
          data: skill.categories.map((category) => ({
            skillId: upsertedSkill.id,
            category,
          })),
        });
      }

      const allTags = [...new Set([...(skill.tags || []), ...(skill.keywords || [])])];
      if (allTags.length) {
        await prisma.skillTag.createMany({
          data: allTags.map((tag) => ({
            skillId: upsertedSkill.id,
            tag,
          })),
        });
      }

      if (skill.capabilities?.length) {
        await prisma.skillCapability.createMany({
          data: skill.capabilities.map((cap) => ({
            skillId: upsertedSkill.id,
            capability: cap.capability,
            inputType: cap.inputType || null,
            outputType: cap.outputType || null,
          })),
        });
      }
    }
  }

  const skillCount = await prisma.skill.count();
  const sourceCount = await prisma.sourceRepository.count();
  console.log(`\nDone! Seeded ${sourceCount} sources with ${skillCount} skills.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
