import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../src/database";
import { CardModel } from "../src/generated/prisma/models/Card";
import { PokemonType } from "../src/generated/prisma/enums";
import { hash } from "crypto";

async function main() {
  console.log("🌱 Starting database seed...");

  await prisma.deckCard.deleteMany();
  await prisma.deck.deleteMany();
  await prisma.card.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("password123", 10);

  await prisma.user.createMany({
    data: [
      {
        username: "red",
        email: "red@example.com",
        password: hashedPassword,
      },
      {
        username: "blue",
        email: "blue@example.com",
        password: hashedPassword,
      },
      {
        email: "user@example.com",
        username: "username",
        password: hashedPassword,
      },
    ],
  });

  const redUser = await prisma.user.findUnique({
    where: { email: "red@example.com" },
  });
  const blueUser = await prisma.user.findUnique({
    where: { email: "blue@example.com" },
  });

  if (!redUser || !blueUser) {
    throw new Error("Failed to create users");
  }

  console.log("✅ Created users:", redUser.username, blueUser.username);

  const pokemonDataPath = join(__dirname, "data", "pokemon.json");
  const pokemonJson = readFileSync(pokemonDataPath, "utf-8");
  const pokemonData: CardModel[] = JSON.parse(pokemonJson);

  const createdCards = await Promise.all(
    pokemonData.map((pokemon) =>
      prisma.card.create({
        data: {
          name: pokemon.name,
          hp: pokemon.hp,
          attack: pokemon.attack,
          type: PokemonType[pokemon.type as keyof typeof PokemonType],
          pokedexNumber: pokemon.pokedexNumber,
          imgUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedexNumber}.png`,
        },
      }),
    ),
  );

  console.log(`✅ Created ${pokemonData.length} Pokemon cards`);

  function selectRandomCards(cards: any[], count: number) {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  const starterDeckRedCards = selectRandomCards(createdCards, 10);
  const starterDeckBlueCards = selectRandomCards(createdCards, 10);

  // Deck pour Red
  await prisma.deck.create({
    data: {
      name: "Starter Deck",
      userId: redUser.id,
      deckCard: {
        create: starterDeckRedCards.map((card) => ({
          cardId: card.id,
        })),
      },
    },
  });

  // Deck pour Blue
  await prisma.deck.create({
    data: {
      name: "Starter Deck",
      userId: blueUser.id,
      deckCard: {
        create: starterDeckBlueCards.map((card) => ({
          cardId: card.id,
        })),
      },
    },
  });

  console.log("✅ Created Starter Deck for red");
  console.log("✅ Created Starter Deck for blue");

  console.log("\n🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
