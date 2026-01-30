import {Request, Response, Router} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {prisma} from "../src/database";

export const authRouter = Router()

// POST /api/auth/sign-up
// Accessible via POST /api/auth/sign-up
authRouter.post('/api/auth/sign-up', async (req: Request, res: Response) => {
    const {email, username, password} = req.body

    try {
        // 1. Vérifier que les données soient présentes et valides
        if (!email || !username || !password) {
            return res.status(400).json({error: 'Données manquantes / invalides'})
        }

        // 2. Vérifier si l'email est déjà utilisée
        const user = await prisma.user.findUnique({
            where: {email},
        })

        if (user) {
            return res.status(409).json({error: 'Email incorrecte'})
        }

        // 3. Hasher le mot de passe, inscrire l'utilisateur et vérifier l'inscription
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                username: username,
                email: email,
                password: hashedPassword,
            }
        });

        const createdUser = await prisma.user.findUnique({
            where: {email},
        })

        if (!createdUser) {
            return res.status(500).json({error: 'Erreur lors de l\'inscription'})
        }

        // 4. Générer le JWT
        const token = jwt.sign(
            {
                userId: createdUser.id,
                email: createdUser.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'}, // Le token expire dans 7 jours
        )

        // 5. Retourner le token
        return res.status(201).json({
            message: 'Inscription réussie',
            token,
            user: {
                id: createdUser.id,
                username: createdUser.username,
                email: createdUser.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

// POST /api/auth/sign-in
// Accessible via POST /api/auth/sign-in
authRouter.post('/api/auth/sign-in', async (req: Request, res: Response) => {
    const {email, password} = req.body

    try {
        // 1. Vérifier que les données soient présentes et valides
        if (!email || !password) {
            return res.status(400).json({error: 'Données manquantes / invalides'})
        }

        // 2. Vérifier que l'utilisateur existe
        const user = await prisma.user.findUnique({
            where: {email},
        })

        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // 3. Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // 4. Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'}, // Le token expire dans 7 jours
        )

        // 5. Retourner le token
        return res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})