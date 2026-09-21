# BiblioTheca

BiblioTheca is a gamified library application with a React client, a Spring Boot REST API, persistent player progress, book data, and a Gemini-powered librarian chatbot.

## Current Tech Stack

- **Frontend:** React 19, React Router DOM 6, Vite 7, JavaScript/JSX, CSS, Lucide React, Recharts
- **Backend:** Java 17, Spring Boot 3.5.9, Spring Web, Spring WebFlux, Spring WebSocket, Spring Data JPA/Hibernate
- **Database:** PostgreSQL, intended for Supabase PostgreSQL through JDBC and environment variables
- **Build tools:** npm/Vite for the client and Maven Wrapper for the backend
- **External services:** Google Gemini API for chat, Open Library cover URLs, Vercel/Railway deployment configuration

## Architecture

```text
React/Vite client
        |
        | HTTP REST (VITE_API_URL)
        v
Spring Boot API
        |
        | Spring Data JPA / Hibernate
        v
Supabase PostgreSQL
```

The active persistence implementation is the Spring Boot JPA layer under `springboot/demo`. It owns the `books`, `players`, and `player_unlocked_books` tables. The old `server/` Mongoose files are not imported by the client or Spring Boot application and are not part of the active runtime.

## Supabase Setup

1. Create a Supabase project and open **Connect > JDBC**.
2. Configure the Spring backend with the pooled or direct PostgreSQL connection values supplied by Supabase:

```bash
export SPRING_DATASOURCE_URL='jdbc:postgresql://<host>:5432/postgres?sslmode=require'
export SPRING_DATASOURCE_USERNAME='postgres.<project-ref>'
export SPRING_DATASOURCE_PASSWORD='<database-password>'
export GEMINI_API_KEY='<gemini-key>'
```

For deployment, set the same variables in the backend service environment. Do not commit passwords, Gemini keys, or a Supabase service-role key. The frontend should contain only the public backend URL:

```bash
VITE_API_URL=https://<your-backend-domain>
```

`spring.jpa.hibernate.ddl-auto=update` creates or updates the JPA tables. `DataInitializer` inserts the nine starter books only when the `books` table is empty. Existing Supabase data is not deleted by startup.

## Run Locally

Frontend:

```bash
cd client
npm install
npm run dev
```

Backend:

```bash
cd springboot/demo
./mvnw spring-boot:run
```

The backend listens on port `8080` locally, or on the platform `PORT` value. The client defaults to `http://localhost:8080` when `VITE_API_URL` is not set.

## Main API Routes

- `GET /api/books` - list books
- `POST /api/players/register` - create a player
- `POST /api/players/login` - authenticate a player
- `GET /api/players/{id}` - get player state
- `POST /api/players/{id}/unlock-book` - persist a book unlock
- `POST /api/players/{id}/complete-level` - persist game completion and KP
- `GET/POST /api/players/{id}/daily-reward/status|claim` - daily reward state
- `POST /api/chat` - Gemini chatbot proxy

## Important Notes

- Passwords are currently stored by the existing backend as plain text. Add password hashing and token-based authentication before production use.
- Supabase Auth is not currently wired into the application; player login is handled by the Spring API.
- The `server/` directory contains an unused Mongoose model/route path. It has no package manifest or active entry point; use the Spring/JPA path for this application.
- `client/dist` and `springboot/demo/target` are generated build output and should not be used as source configuration.
