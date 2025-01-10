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

        if (!movie) {
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
        const movie = await prisma.movie.findUnique({ where: { id } });

        if (!movie) {
            return res.status(404).send({ message: "O filme não foi encontrado" })
        }

        await prisma.movie.delete({ where: { id } })
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

app.put("/genres/:id", async (req, res): Promise<any> => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).send({ message: "O nome é necessário" })
    }

    try {
        const genre = await prisma.genre.findUnique({
            where: {
                id: Number(id)
            }
        });
        if (!genre) {
            return res.status(404).send({ message: "Gênero não encontrado" });
        }

        const existingGenre = await prisma.genre.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive",
                },
                id: {
                    not: Number(id),
                }
            }
        })

        if (existingGenre) {
            return res.status(409).send({ message: "Este nome de gênero já existe." })
        }

        const updatedGenre = await prisma.genre.update({
            where: {
                id: Number(id),
            },
            data: {
                name: name,
            }
        });
        res.status(200).json(updatedGenre);
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Houve um problema ao atualizar o gênero" });
    }
})

app.post("/genres", async (req, res): Promise<any> => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).send({ message: "O gênero precisa ter um nome." })
    }

    try {
        const existingGenre = await prisma.genre.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive"
                }
            }
        })

        if (existingGenre) {
            return res.status(408).send({ message: "Já existe um gênero com esse nome" })
        }
        const addNewGenre = await prisma.genre.create({
            data: {
                name: name
            }
        });
        res.status(201).json(addNewGenre)

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Houve uma falha ao adicionar um novo gênero" })
    }
})

app.get("/genres", async (_, res): Promise<any> => {
    try {
        const genres = await prisma.genre.findMany({
            orderBy: {
                "name": "asc"
            }
        });

        res.status(200).json(genres);
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Houve algum erro ao buscar os gêneros" })
    }
})

app.delete("/genres/:id", async (req, res): Promise<any> => {
    const { id } = req.params;

    try {
        const genre = await prisma.genre.findUnique({
            where: {
                id: Number(id)
            }
        })
        
        if(!genre){
            return res.status(404).send({ message: "Gênero não encontrado" })
        }

        await prisma.genre.delete({
            where: {
                id: Number(id)
            }
        })
    
        res.status(200).send({ message: "Gênero removido com sucesso"} )
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Houve um erro ao tentar deletar o gênero" })
    }
})

app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
})