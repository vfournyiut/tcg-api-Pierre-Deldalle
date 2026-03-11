import { Request, Response, Router } from "express";
import { prisma } from "../src/database";

export const cardsRouter = Router();

/**
 * Route GET permettant de récupérer toutes les cartes disponibles.
 *
 * Cette route retourne la liste complète des cartes Pokémon présentes
 * dans la base de données, triées par leur numéro dans le Pokédex.
 * Elle est utilisée pour afficher les cartes disponibles à l'utilisateur.
 *
 * Méthode HTTP : GET
 * URL : /api/cards
 *
 * @param {Request} _req - Requête HTTP entrante (aucun paramètre requis).
 * @param {Response} res - Objet réponse Express utilisé pour renvoyer la liste des cartes.
 *
 * @returns {Response}
 * - 200 : Succès, renvoie un objet contenant un message et la liste des cartes.
 * - 500 : Erreur serveur lors de la récupération des cartes.
 *
 * @throws {Error} Peut lever une erreur si la connexion à la base de données échoue
 * (gérée et transformée en réponse HTTP 500).
 */
cardsRouter.get("/api/cards", async (_req: Request, res: Response) => {
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
