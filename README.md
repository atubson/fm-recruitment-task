<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Docker

Run the Nest application and PostgreSQL together using Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/) (included with Docker Desktop)

### First-time setup

1. Copy the environment template and adjust values if needed:

```bash
cp .env.example .env
```

2. Build and start both services in the background:

```bash
docker compose up -d
```

3. Verify the app is running:

```bash
curl http://localhost:3000
```

The API is available at `http://localhost:3000`. PostgreSQL is exposed on `localhost:5432`.

### Common commands

```bash
# Start services (build image if missing)
docker compose up -d

# Start and rebuild the app image after code changes
docker compose up -d --build

# View logs
docker compose logs -f

# View logs for a single service
docker compose logs -f app
docker compose logs -f postgres

# Stop services (containers removed, data volume kept)
docker compose down

# Stop services and delete database volume (data loss)
docker compose down -v

# Check service status
docker compose ps
```

### How it works

Docker Compose starts two services defined in `docker-compose.yaml`:

| Service    | Image / build      | Purpose                                      |
| ---------- | ------------------ | -------------------------------------------- |
| `postgres` | `postgres:16-alpine` | PostgreSQL database with persistent storage |
| `app`      | Built from `Dockerfile` | NestJS application (production build)   |

**Startup order**

1. The `postgres` service starts and runs a health check (`pg_isready`).
2. On first run, PostgreSQL creates the user and database from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.
3. Once Postgres is healthy, the `app` service starts.
4. The Nest app listens on the port defined by `PORT` (default `3000`).

**Environment variables**

- Variables are loaded from `.env` at **container runtime**, not baked into the Docker image.
- `.env` is listed in `.gitignore` and excluded from the image via `.dockerignore` — keep real secrets only in `.env`.
- Use `.env.example` as a safe, committable template with placeholder values.
- Inside Docker, `DATABASE_HOST` is overridden to `postgres` (the Compose service name). For local development without Docker, use `DATABASE_HOST=localhost` in `.env`.

**Data persistence**

Database files are stored in a Docker volume named `postgres_data`. Running `docker compose down` stops containers but keeps the data. To reset the database completely, run `docker compose down -v`.

**When you change `.env`**

Editing `.env` does not rebuild the image. Recreate containers to apply new values:

```bash
docker compose up -d
```

Note: changing `POSTGRES_*` variables only affects a **new** database. If the `postgres_data` volume already exists, update credentials in PostgreSQL manually or remove the volume with `docker compose down -v` (this deletes all data).

**When you change application code**

Rebuild the app image before restarting:

```bash
docker compose up -d --build
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
