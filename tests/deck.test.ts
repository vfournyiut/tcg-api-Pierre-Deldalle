import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { prismaMock } from "./vitest.setup";

// Mocks must be declared before importing the module that uses them
vi.mock("../src/database", () => ({ prisma: prismaMock }));
vi.mock("../src/auth.middleware", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { userId: 1 };
    next();
  },
}));

import { decksRouter } from "../src/decks.route";

const app = express();
app.use(express.json());
app.use((req: any, _res: any, next: any) => {
  req.user = { userId: 1 };
  next();
});
app.use(decksRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/decks", () => {
  it("should create a deck with 10 valid cards", async () => {
    prismaMock.card.aggregate.mockResolvedValue({
      _max: { pokedexNumber: 151 },
    } as any);

    const tenCards = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `P${i + 1}`,
      pokedexNumber: i + 1,
      hp: 50,
      attack: 50,
      type: "Normal",
      imgUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    prismaMock.deck.create.mockResolvedValue({
      id: 1,
      name: "Test Deck",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    prismaMock.card.findMany.mockResolvedValue(tenCards as any);
    prismaMock.deckCard.createMany.mockResolvedValue({ count: 10 } as any);

    const response = await request(app)
      .post("/api/decks")
      .send({
        name: "Test Deck",
        cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });

    expect(response.status).toBe(201);
    expect(response.body.deck.cards).toHaveLength(10);
  });

  it("should return 400 if name is missing", async () => {
    const response = await request(app)
      .post("/api/decks")
      .send({ cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

    expect(response.status).toBe(400);
  });

  it("should return 400 if deck has not exactly 10 cards", async () => {
    const response = await request(app)
      .post("/api/decks")
      .send({ name: "Deck invalide", cards: [1, 2] });

    expect(response.status).toBe(400);
  });

  it("should return 400 if a card pokedex number is invalid", async () => {
    prismaMock.card.aggregate.mockResolvedValue({
      _max: { pokedexNumber: 151 },
    } as any);

    const response = await request(app)
      .post("/api/decks")
      .send({
        name: "Invalid Deck",
        cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 999],
      });

    expect(response.status).toBe(400);
  });

  it("should return 500 if database create fails", async () => {
    prismaMock.card.aggregate.mockResolvedValue({
      _max: { pokedexNumber: 151 },
    } as any);

    prismaMock.deck.create.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .post("/api/decks")
      .send({
        name: "Test",
        cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });

    expect(response.status).toBe(500);
  });

  it("should return 500 when aggregate max is missing", async () => {
    prismaMock.card.aggregate.mockResolvedValue({
      _max: { pokedexNumber: null },
    } as any);

    const response = await request(app)
      .post("/api/decks")
      .send({
        name: "Test",
        cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });

    expect(response.status).toBe(500);
  });
});

describe("GET /api/decks/mine", () => {
  it("should return all decks of the authenticated user", async () => {
    const tenCards = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: i === 0 ? "Pikachu" : `P${i + 1}`,
      pokedexNumber: i + 1,
      hp: 50,
      attack: 50,
      type: "Normal",
      imgUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    prismaMock.deck.findMany.mockResolvedValue([
      {
        id: 1,
        name: "My Deck",
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    prismaMock.deckCard.findMany.mockResolvedValue([
      {
        id: 1,
        deckId: 1,
        cardId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    prismaMock.card.findMany.mockResolvedValue([tenCards[0]] as any);

    const response = await request(app).get("/api/decks/mine");

    expect(response.status).toBe(200);
    expect(response.body[0].cards[0].name).toBe("Pikachu");
  });

  it("should return empty array if user has no decks", async () => {
    prismaMock.deck.findMany.mockResolvedValue([]);

    const response = await request(app).get("/api/decks/mine");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe("GET /api/decks/:id", () => {
  it("should return a deck with its cards", async () => {
    const tenCards = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: i === 0 ? "Mewtwo" : `P${i + 1}`,
      pokedexNumber: i + 1,
      hp: 50,
      attack: 50,
      type: "Psychic",
      imgUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Test Deck",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    prismaMock.deckCard.findMany.mockResolvedValue([
      {
        id: 1,
        deckId: 1,
        cardId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    prismaMock.card.findMany.mockResolvedValue([tenCards[0]] as any);

    const response = await request(app).get("/api/decks/1");

    expect(response.status).toBe(200);
    expect(response.body.cards[0].name).toBe("Mewtwo");
  });

  it("should return 404 if deck does not exist", async () => {
    prismaMock.deck.findUnique.mockResolvedValue(null);
    const response = await request(app).get("/api/decks/999");

    expect(response.status).toBe(404);
  });

  it("should return 403 if deck belongs to another user", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Other Deck",
      userId: 999,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).get("/api/decks/1");

    expect(response.status).toBe(403);
  });

  it("should return 500 if fetching cards fails", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Test Deck",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    prismaMock.deckCard.findMany.mockRejectedValue(new Error("DB error"));

    const response = await request(app).get("/api/decks/1");

    expect(response.status).toBe(500);
  });

  it("should return 401 when authenticateToken does not set req.user", async () => {
    await vi.resetModules();
    vi.mock("../src/database", () => ({ prisma: prismaMock }));
    vi.mock("../src/auth.middleware", () => ({
      authenticateToken: (req: any, _res: any, next: any) => {
        next();
      },
    }));
    const { decksRouter: router } = await import("../src/decks.route");
    const appNoUser = express();
    appNoUser.use(express.json());
    appNoUser.use(router);

    const res = await request(appNoUser).get("/api/decks/1");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/decks/:id", () => {
  it("should update deck name", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Old",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    prismaMock.deck.update.mockResolvedValue({
      id: 1,
      name: "New",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app)
      .patch("/api/decks/1")
      .send({ name: "New" });

    expect(response.status).toBe(200);
    expect(response.body.deck.name).toBe("New");
  });

  it("should return 404 if deck to update does not exist", async () => {
    prismaMock.deck.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/decks/1")
      .send({ name: "New" });

    expect(response.status).toBe(404);
  });

  it("should return 403 if updating a deck of another user", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Other",
      userId: 999,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app)
      .patch("/api/decks/1")
      .send({ name: "New" });

    expect(response.status).toBe(403);
  });

  it("should return 400 if no valid fields provided", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Deck",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).patch("/api/decks/1").send({});

    expect(response.status).toBe(400);
  });

  it("should return 500 if update fails", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Deck",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    prismaMock.deck.update.mockRejectedValue(new Error("DB error"));

    const response = await request(app)
      .patch("/api/decks/1")
      .send({ name: "New" });

    expect(response.status).toBe(500);
  });

  it("should return 400 if deck has not exactly 10 cards", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Deck",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app)
      .patch("/api/decks/1")
      .send({ cards: [1, 2, 3] });

    expect(response.status).toBe(400);
  });

  it("should return 400 if provided cards not all exist", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 7,
      name: "Deck 7",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    prismaMock.card.findMany.mockResolvedValue([
      {
        id: 1,
        name: "P1",
        pokedexNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
    ]);

    const response = await request(app)
      .patch("/api/decks/7")
      .send({ cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

    expect(response.status).toBe(400);
  });

  it("should perform deckCard.deleteMany and deckCard.createMany when cards valid", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 5,
      name: "Before",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const tenCards = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `P${i + 1}`,
      pokedexNumber: i + 1,
      hp: 50,
      attack: 50,
      type: "Normal",
      imgUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    prismaMock.card.findMany.mockResolvedValue(tenCards as any);
    prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 } as any);
    prismaMock.deckCard.createMany.mockResolvedValue({ count: 10 } as any);

    prismaMock.deck.update.mockResolvedValue({
      id: 5,
      name: "Before",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app)
      .patch("/api/decks/5")
      .send({
        cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });

    expect(response.status).toBe(200);
    expect(prismaMock.deckCard.deleteMany).toHaveBeenCalledWith({
      where: { deckId: 5 },
    });
    expect(prismaMock.deckCard.createMany).toHaveBeenCalled();
  });

  it("should return 401 when authenticateToken does not set req.user", async () => {
    await vi.resetModules();
    vi.mock("../src/database", () => ({ prisma: prismaMock }));
    vi.mock("../src/auth.middleware", () => ({
      authenticateToken: (req: any, _res: any, next: any) => {
        next();
      },
    }));
    const { decksRouter: router } = await import("../src/decks.route");
    const appNoUser = express();
    appNoUser.use(express.json());
    appNoUser.use(router);

    const res = await request(appNoUser)
      .patch("/api/decks/1")
      .send({
        cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/decks/:id", () => {
  it("should delete a deck", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Deck",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 } as any);
    prismaMock.deck.delete.mockResolvedValue({
      id: 1,
      name: "Deck",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).delete("/api/decks/1");

    expect(response.status).toBe(200);
  });

  it("should return 404 if deck to delete does not exist", async () => {
    prismaMock.deck.findUnique.mockResolvedValue(null);
    const response = await request(app).delete("/api/decks/1");

    expect(response.status).toBe(404);
  });

  it("should return 403 if deleting a deck of another user", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Other",
      userId: 999,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await request(app).delete("/api/decks/1");

    expect(response.status).toBe(403);
  });

  it("should return 500 if delete fails", async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 1,
      name: "Deck",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    prismaMock.deckCard.deleteMany.mockRejectedValue(new Error("DB error"));

    const response = await request(app).delete("/api/decks/1");

    expect(response.status).toBe(500);
  });
});

describe("Error handling", () => {
  it("should return 500 if database fails", async () => {
    prismaMock.deck.findMany.mockRejectedValue(new Error("DB error"));
    const response = await request(app).get("/api/decks/mine");

    expect(response.status).toBe(500);
  });
});

describe("req.user checks (testing 401 responses)", () => {
  it("POST /api/decks -> 401 when req.user is missing", async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    // middleware WITHOUT setting req.user
    appNoAuth.use((req: any, _res: any, next: any) => {
      next();
    });
    appNoAuth.use(decksRouter);

    const response = await request(appNoAuth)
      .post("/api/decks")
      .send({
        name: "Test",
        cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Token manquant / invalide");
  });

  it("GET /api/decks/mine -> 401 when req.user is missing", async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    appNoAuth.use((req: any, _res: any, next: any) => {
      next();
    });
    appNoAuth.use(decksRouter);

    const response = await request(appNoAuth).get("/api/decks/mine");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Token manquant / invalide");
  });

  it("GET /api/decks/:id -> 401 when req.user is missing", async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    appNoAuth.use((req: any, _res: any, next: any) => {
      next();
    });
    appNoAuth.use(decksRouter);

    const response = await request(appNoAuth).get("/api/decks/1");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Token manquant / invalide");
  });

  it("PATCH /api/decks/:id -> 401 when req.user is missing", async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    appNoAuth.use((req: any, _res: any, next: any) => {
      next();
    });
    appNoAuth.use(decksRouter);

    const response = await request(appNoAuth)
      .patch("/api/decks/1")
      .send({ name: "New" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Token manquant / invalide");
  });

  it("DELETE /api/decks/:id -> 401 when req.user is missing", async () => {
    const appNoAuth = express();
    appNoAuth.use(express.json());
    appNoAuth.use((req: any, _res: any, next: any) => {
      next();
    });
    appNoAuth.use(decksRouter);

    const response = await request(appNoAuth).delete("/api/decks/1");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Token manquant / invalide");
  });
});
