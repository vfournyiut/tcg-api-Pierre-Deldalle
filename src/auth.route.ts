import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../src/database";

export const authRouter = Router();

/**
 * Route d’inscription d’un nouvel utilisateur.
 *
 * Cette route permet de créer un compte utilisateur à partir
 * d’un email, d’un nom d’utilisateur et d’un mot de passe.
 * Elle vérifie la validité des données fournies, s’assure que
 * l’email n’est pas déjà utilisé, hash le mot de passe avant
 * stockage en base de données, puis génère un token JWT
 * permettant l’authentification immédiate de l’utilisateur.
 *
 * Méthode HTTP : POST
 * URL : /api/auth/sign-up
 *
 * @param {Request} req - Requête HTTP contenant les informations d’inscription dans le corps (`email`, `username`, `password`).
 * @param {Response} res - Objet réponse Express permettant de retourner le statut et les données de l’inscription.
 *
 * @returns {Response}
 * - 201 : Inscription réussie avec un token JWT et les informations utilisateur.
 * - 400 : Données manquantes ou invalides.
 * - 409 : Email déjà utilisé.
 * - 500 : Erreur serveur lors de la création du compte.
 *
 * @throws {Error} Peut lever une erreur lors de l’accès à la base de données
 * ou lors du hashage du mot de passe (gérée et renvoyée sous forme de réponse HTTP).
 */
authRouter.post("/api/auth/sign-up", async (req: Request, res: Response) => {
  const { email, username, password } = req.body;

  try {
    // 1. Vérifier que les données soient présentes et valides
    if (!email || !username || !password) {
      return res.status(400).json({ error: "Données manquantes / invalides" });
    }

    // 2. Vérifier si l'email est déjà utilisée
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      return res.status(409).json({ error: "Email incorrecte" });
    }

    // 3. Hasher le mot de passe, inscrire l'utilisateur et vérifier l'inscription
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
      },
    });

    const createdUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!createdUser) {
      return res.status(500).json({ error: "Erreur lors de l'inscription" });
    }

    // 4. Générer le JWT
    const token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    // 5. Retourner le token
    return res.status(201).json({
      message: "Inscription réussie",
      token,
      user: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Route de connexion d’un utilisateur existant.
 *
 * Cette route permet à un utilisateur déjà inscrit de se connecter
 * à l’application en fournissant son email et son mot de passe.
 * Les identifiants sont vérifiés, le mot de passe est comparé
 * au hash stocké en base de données, puis un token JWT est généré
 * en cas de succès.
 *
 * Méthode HTTP : POST
 * URL : /api/auth/sign-in
 *
 * @param {Request} req - Requête HTTP contenant les identifiants de connexion (`email`, `password`).
 * @param {Response} res - Objet réponse Express permettant de retourner le statut et le token d’authentification.
 *
 * @returns {Response}
 * - 200 : Connexion réussie avec un token JWT et les informations utilisateur.
 * - 400 : Données manquantes ou invalides.
 * - 401 : Email ou mot de passe incorrect.
 * - 500 : Erreur serveur lors de l’authentification.
 *
 * @throws {Error} Peut lever une erreur lors de la comparaison du mot de passe
 * ou lors de l’accès à la base de données (gérée et renvoyée sous forme de réponse HTTP).
 */
authRouter.post("/api/auth/sign-in", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // 1. Vérifier que les données soient présentes et valides
    if (!email || !password) {
      return res.status(400).json({ error: "Données manquantes / invalides" });
    }

    // 2. Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // 3. Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // 4. Générer le JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    // 5. Retourner le token
    return res.status(200).json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});
