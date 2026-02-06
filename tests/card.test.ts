import { describe, expect, it } from "vitest";
import request from "supertest";
import { prismaMock } from "./vitest.setup";
import { app } from "../src/index";

describe("GET /cards", () => {
  it("should return an array of cards", async () => {
    // Mock de la réponse Prisma
    prismaMock.card.findMany.mockResolvedValue([
      {
        id: 1,
        name: "Bulbasaur",
        hp: 45,
        attack: 49,
        type: "Grass",
        pokedexNumber: 1,
        imgUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: "Charmander",
        hp: 39,
        attack: 52,
        type: "Fire",
        pokedexNumber: 4,
        imgUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        name: "Squirtle",
        hp: 44,
        attack: 48,
        type: "Water",
        pokedexNumber: 7,
        imgUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Requête HTTP via supertest
    const response = await request(app).get("/api/cards");

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Envoi des cartes réussi");
    expect(response.body.cards).toHaveLength(3);
  });

  it('should return 500 if prisma throws', async () => {
  prismaMock.card.findMany.mockRejectedValue(new Error("DB crash"))

  const response = await request(app).get('/api/cards')

  expect(response.status).toBe(500)
  expect(response.body).toHaveProperty('error', 'Erreur serveur')
})

});
