import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Étendre le type Request pour ajouter userId
declare global {
  namespace Express {
    interface Request {
      user?: {
        unserId: number;
        email: string;
      };
    }
  }
}

/**
 * Middleware d’authentification basé sur JSON Web Token (JWT).
 *
 * Analyse l’en-tête HTTP `Authorization` de la requête entrante.
 * Le token doit être fourni au format : `Bearer <token>`.
 *
 * Si le token est valide :
 * - Il est décodé via `jwt.verify`
 * - Les informations utilisateur (userId et email)
 *   sont injectées dans `req.user`
 * - L’exécution continue via `next()`
 *
 * Si le token est absent, invalide ou expiré :
 * - Une réponse HTTP 401 est renvoyée
 * - La requête est interrompue
 *
 * @param {Request} req - Requête HTTP contenant éventuellement l’en-tête Authorization.
 * @param {Response} res - Objet réponse permettant d’envoyer une réponse HTTP.
 * @param {NextFunction} next - Fonction de continuation vers le middleware suivant.
 *
 * @returns {void | Response}
 * - `void` si authentification réussie (appel de `next()`).
 * - `Response` avec statut 401 en cas d’échec.
 *
 * @throws {JsonWebTokenError} Si le token est invalide.
 * @throws {TokenExpiredError} Si le token est expiré.
 */

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 1. Récupérer le token depuis l'en-tête Authorization
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }

  try {
    // 2. Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
      email: string;
    };

    // 3. Ajouter userId à la requête pour l'utiliser dans les routes
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    // 4. Passer au prochain middleware ou à la route
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
};
