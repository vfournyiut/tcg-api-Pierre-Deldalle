import { Request, Response, Router } from "express";
import { prisma } from "../src/database";
import { authenticateToken } from "./auth.middleware";

export const decksRouter = Router();

//POST /api/decks
//Créer un nouveau deck pour l'utilisateur authentifié
//Le deck doit contenir exactement 10 cartes valides
//Le deck est automatiquement associé à l'utilisateur connecté
decksRouter.post(
  "/api/decks",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { name, cards } = req.body;

    try {
      // 1. Vérifier que le token est présent et valide
      if (!req.user) {
        return res.status(401).json({ error: "Token manquant / invalide" });
      }

      // 2. Vérifier que le nom du deck est présent
      if (!name) {
        return res.status(400).json({ error: "Nom du deck manquant" });
      }

      // 3. Vérifier que cards est un tableau et contient exactement 10 cartes
      if (!Array.isArray(cards) || cards.length !== 10) {
        return res
          .status(400)
          .json({ error: "Le deck ne possède pas exactement 10 cartes" });
      }

      // 4. Récupérer le numéro de pokédex maximal existant en base
      const result = await prisma.card.aggregate({
        _max: {
          pokedexNumber: true,
        },
      });

      const numMaxPokemon = result._max.pokedexNumber;
      if (!numMaxPokemon) {
        return res.status(500).json({ error: "Erreur serveur" });
      }

      // 5. Vérifier que chaque numéro de pokédex fourni est valide
      for (let i: number = 0; i < cards.length; i++) {
        if (cards[i] < 1 || cards[i] > numMaxPokemon) {
          return res.status(400).json({
            error: "Un ou plusieurs id des pokémons du deck sont invalides",
          });
        }
      }

      // 6. Créer le deck en base de données et l'associer à l'utilisateur
      const deck = await prisma.deck.create({
        data: {
          name: name,
          userId: req.user.userId,
        },
      });

      // 7. Récupérer les cartes correspondant aux numéros de pokédex fournis
      const deckCards = await prisma.card.findMany({
        where: {
          pokedexNumber: {
            in: cards,
          },
        },
      });

      // 8. Créer les associations entre le deck et les cartes
      await prisma.deckCard.createMany({
        data: deckCards.map((card) => ({
          cardId: card.id,
          deckId: deck.id,
        })),
      });

      // 9. Retourner le deck créé avec ses cartes
      return res.status(201).json({
        message: "Deck créé avec succès",
        deck: {
          id: deck.id,
          name: deck.name,
          cards: deckCards,
          userId: deck.userId,
        },
      });
    } catch (error) {
      console.error("Erreur lors de la création du deck :", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  },
);


//GET /api/decks/mine
//Récupérer tous les decks de l'utilisateur authentifié
//Chaque deck est retourné avec ses cartes associées
decksRouter.get(
  "/api/decks/mine",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // 1. Vérifier que le token est présent et valide
      if (!req.user) {
        return res.status(401).json({ error: "Token manquant / invalide" });
      }

      // 2. Récupérer l'identifiant de l'utilisateur connecté
      const userId = req.user.userId;

      // 3. Récupérer tous les decks appartenant à cet utilisateur
      const decks = await prisma.deck.findMany({
        where: { userId },
      });

      // 4. Pour chaque deck, récupérer les cartes associées
      const decksWithCards = await Promise.all(
        decks.map(async (deck) => {
          const deckCards = await prisma.deckCard.findMany({
            where: { deckId: deck.id },
          });

          const cards = await prisma.card.findMany({
            where: {
              id: {
                in: deckCards.map((dc) => dc.cardId),
              },
            },
          });

          return {
            id: deck.id,
            name: deck.name,
            cards: cards,
            userId: deck.userId,
          };
        }),
      );

      // 5. Retourner la liste des decks (vide si aucun deck)
      return res.status(200).json(decksWithCards);
    } catch (error) {
      console.error("Erreur lors de la récupération des decks :", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  },
);

//GET /api/decks/:id
//Récupérer un deck spécifique appartenant à l'utilisateur authentifié
decksRouter.get(
  "/api/decks/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // 1. Vérifier que le token est présent et valide
      if (!req.user) {
        return res.status(401).json({ error: "Token manquant / invalide" });
      }

      // 2. Récupérer l'identifiant du deck depuis l'URL
      const deckId = Number(req.params.id);

      // 3. Vérifier que le deck existe
      const deck = await prisma.deck.findUnique({
        where: { id: deckId },
      });

      if (!deck) {
        return res.status(404).json({ error: "Deck inexistant" });
      }

      // 4. Vérifier que le deck appartient bien à l'utilisateur connecté
      if (deck.userId !== req.user.userId) {
        return res.status(403).json({ error: "Accès interdit" });
      }

      // 5. Récupérer les cartes associées au deck
      const deckCards = await prisma.deckCard.findMany({
        where: { deckId: deck.id },
      });

      const cards = await prisma.card.findMany({
        where: {
          id: {
            in: deckCards.map((dc) => dc.cardId),
          },
        },
      });

      // 6. Retourner le deck avec ses cartes
      return res.status(200).json({
        id: deck.id,
        name: deck.name,
        cards: cards,
        userId: deck.userId,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération du deck :", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  },
);


//PATCH /api/decks/:id
//Modifier le nom et/ou les cartes d'un deck existant
decksRouter.patch(
  "/api/decks/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { name, cards } = req.body;
    const deckId = Number(req.params.id);

    try {
      // 1. Vérifier que le token est présent et valide
      if (!req.user) {
        return res.status(401).json({ error: "Token manquant / invalide" });
      }

      // 2. Vérifier que le deck existe
      const deck = await prisma.deck.findUnique({
        where: { id: deckId },
      });

      if (!deck) {
        return res.status(404).json({ error: "Deck inexistant" });
      }

      // 3. Vérifier que le deck appartient à l'utilisateur connecté
      if (deck.userId !== req.user.userId) {
        return res.status(403).json({ error: "Accès interdit" });
      }

      // 4. Si les cartes sont modifiées, vérifier leur validité
      if (cards) {
        if (!Array.isArray(cards) || cards.length !== 10) {
          return res
            .status(400)
            .json({ error: "Le deck doit contenir exactement 10 cartes" });
        }

        const existingCards = await prisma.card.findMany({
          where: { id: { in: cards } },
        });

        if (existingCards.length !== 10) {
          return res.status(400).json({
            error: "Un ou plusieurs id des pokémons du deck sont invalides",
          });
        }

        // 5. Supprimer les anciennes associations cartes/deck
        await prisma.deckCard.deleteMany({
          where: { deckId },
        });

        // 6. Créer les nouvelles associations cartes/deck
        await prisma.deckCard.createMany({
          data: existingCards.map((card) => ({
            deckId,
            cardId: card.id,
          })),
        });
      }

      // 7. Mettre à jour le nom du deck si nécessaire
      const updatedDeck = await prisma.deck.update({
        where: { id: deckId },
        data: { name },
      });

      return res.status(200).json({
        message: "Deck modifié avec succès",
        deck: updatedDeck,
      });
    } catch (error) {
      console.error("Erreur lors de la modification du deck :", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  },
);


//DELETE /api/decks/:id
//Supprimer définitivement un deck et ses associations
decksRouter.delete(
  "/api/decks/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const deckId = Number(req.params.id);

    try {
      // 1. Vérifier que le token est présent et valide
      if (!req.user) {
        return res.status(401).json({ error: "Token manquant / invalide" });
      }

      // 2. Vérifier que le deck existe
      const deck = await prisma.deck.findUnique({
        where: { id: deckId },
      });

      if (!deck) {
        return res.status(404).json({ error: "Deck inexistant" });
      }

      // 3. Vérifier que le deck appartient à l'utilisateur connecté
      if (deck.userId !== req.user.userId) {
        return res.status(403).json({ error: "Accès interdit" });
      }

      // 4. Supprimer les associations deck/cartes
      await prisma.deckCard.deleteMany({
        where: { deckId },
      });

      // 5. Supprimer le deck
      await prisma.deck.delete({
        where: { id: deckId },
      });

      return res.status(200).json({ message: "Deck supprimé avec succès" });
    } catch (error) {
      console.error("Erreur lors de la suppression du deck :", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  },
);
