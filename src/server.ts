import express from 'express';
import { PrismaClient } from "@prisma/client"
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json';

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/movies", async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: {
            title: "asc",
        },
        include: {
            genres: true,
            languages: true,
        },
    });
    res.json(movies);
});

app.post("/movies", async (req, res): Promise<any> => {
    const { title, genre_id, language_id, oscar_count, release_date } = req.body;

    try {

        const movieWithSameTitle = await prisma.movie.findFirst({
            where: {
                title: { equals: title, mode: "insensitive" },
            },
        });

        if (movieWithSameTitle) {
            return res.status(409).send({ message: "já existe um filme cadastrado com esse título" })
        }

        await prisma.movie.create({
            data: {
                title,
                genre_id,
                language_id,
                oscar_count,
                release_date: new Date(release_date)
            }
        });
    } catch {
        return res.status(500).send({ message: "Falha no servidor" });
    }

    res.status(201).send();
});

app.put("/movies/:id", async (req, res): Promise<any> => {
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({
            where: {
                id
            }
        });
        
        if (!movie){
            return res.status(404).send({ message: "Filme não encontrado" });
        }
    
        const data = { ...req.body };
        data.release_date = data.release_date ? new Date(data.release_date) : undefined;
    
        await prisma.movie.update({
            where: {
                id: id
            },
            data: data
        })
    } catch {
        return res.status(500).send({ message: "Falha ao atualizar o registro de filme" })
    }

    res.status(200).send();
})

app.delete("/movies/:id", async (req, res): Promise<any> => {
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({ where: { id }});

    if(!movie){
        return res.status(404).send({ message: "O filme não foi encontrado" })
    }

    await prisma.movie.delete({ where: { id }})
    } catch {
        return res.status(500).send({ message: "Não foi possível remover o filme" })
    }

    res.status(200).send();
})

app.get("/movies/:genreName", async (req, res) => {
    try {
        const movieFilteredByGenreName = await prisma.movie.findMany({
            include: {
                genres: true,
                languages: true,
            },
            where: {
                genres: {
                    name: {
                        equals: req.params.genreName,
                        mode: "insensitive",
                    },
                },
            },
        });
        res.status(200).send(movieFilteredByGenreName);
    } catch {
        res.status(500).send({ message: "Falha ao filtrar filmes por gênero" });
    }
})

app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
})