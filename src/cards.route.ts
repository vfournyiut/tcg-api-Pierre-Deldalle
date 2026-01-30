import { Request, Response, Router } from "express";
import { prisma } from "../src/database";

export const cardsRouter = Router();

// POST /api/auth/sign-in
// Accessible via POST /api/auth/sign-in
cardsRouter.get("/api/cards", async (req: Request, res: Response) => {
  try {
    // 1. Retourne les cartes
    const cards = await prisma.card.findMany({
      orderBy: {
        pokedexNumber: "asc",
      },
    });
    return res.status(200).json({
      message: "Envoi des cartes réussi",
      cards,
    });
  } catch (error) {
    console.error("Erreur lors de l'\envoi des cartes:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});
