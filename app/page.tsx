import { prisma } from "@/lib/db";
import { HomeClient } from "./home-client";

export default async function HomePage() {
  const [skills, skillCount, sourceCount] = await Promise.all([
    prisma.skill.findMany({
      include: {
        sourceRepository: { select: { id: true, name: true, author: true, sourceUrl: true } },
        categories: { select: { category: true } },
        tags: { select: { tag: true } },
      },
      orderBy: { rating: "desc" },
      take: 12,
    }),
    prisma.skill.count(),
    prisma.sourceRepository.count(),
  ]);

  return (
    <HomeClient
      skills={skills}
      stats={{ skillCount, sourceCount }}
    />
  );
}
