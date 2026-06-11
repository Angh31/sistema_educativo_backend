# 🎓 Sistema Educativo — Backend API

API REST para gestión académica integral con autenticación por roles, registro de asistencia via QR/PIN y predicción de riesgo estudiantil.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

---

## ¿Qué es?

Sistema de gestión académica para instituciones educativas. Centraliza el control de asistencia, calificaciones, usuarios y alertas de riesgo en una sola API REST con autorización granular por rol.

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 4 |
| ORM | Prisma |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT + bcrypt |
| Validación | Express Validator |

---

## Roles del sistema

| Rol | Acceso |
|---|---|
| Administrador | Gestión completa — usuarios, cursos, reportes |
| Docente | Registro de asistencia, calificaciones, alertas |
| Estudiante | Consulta de notas, asistencia y horarios |
| Padre/Tutor | Seguimiento académico del estudiante |

---

## Funcionalidades clave

- **Autenticación JWT** — login seguro con expiración de sesión
- **Asistencia QR/PIN** — registro de asistencia via código QR o PIN numérico
- **Predicción de riesgo** — algoritmo que identifica estudiantes en riesgo académico basado en asistencia y calificaciones
- **Autorización por rol** — cada endpoint valida el rol antes de responder
- **Gestión de cursos** — asignación de docentes, estudiantes y horarios

---

## Endpoints principales

| Módulo | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` · `GET /api/auth/me` |
| Usuarios | `GET/POST/PUT /api/usuarios` |
| Cursos | `GET/POST/PUT /api/cursos` |
| Asistencia | `POST /api/asistencia/qr` · `POST /api/asistencia/pin` |
| Calificaciones | `GET/POST /api/calificaciones` |
| Riesgo | `GET /api/riesgo/estudiantes` |

---

## Instalación

```bash
git clone https://github.com/Angh31/sistema_educativo_backend.git
cd sistema_educativo_backend

npm install

# Configurar variables de entorno
copy .env.example .env

# Ejecutar migraciones
npx prisma migrate dev

# Iniciar servidor
npm run dev
```

---

## Variables de entorno

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sistema_educativo
JWT_SECRET=tu_secret_aqui
JWT_EXPIRES_IN=8h
PORT=3000
```

---

## Estructura

```
sistema_educativo_backend/
├── src/
│   ├── config/          # Configuración DB y variables
│   ├── middleware/      # Auth JWT, roles, errorHandler
│   ├── controllers/     # Lógica de cada módulo
│   ├── routes/          # Definición de endpoints
│   └── app.js           # Bootstrap Express
├── prisma/
│   └── schema.prisma    # Modelo de datos
├── .env.example
└── package.json
```

---

> Frontend disponible en [sistema_educativo_frontend](https://github.com/Angh31/sistema_educativo_frontend)
