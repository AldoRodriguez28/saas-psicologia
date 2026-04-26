# SistemaNota · Psicología Clínica SaaS

Sistema web para generación automática de notas clínicas SOAP con diagnóstico CIE-10.  
Stack: **Next.js 14 · NestJS · PostgreSQL · Prisma · Anthropic Claude**

---

## Estructura del proyecto

```
psicologia-saas/
├── apps/
│   ├── api/          ← Backend NestJS (puerto 3001)
│   └── web/          ← Frontend Next.js (puerto 3000)
└── packages/
    └── prisma/       ← Schema y migraciones de base de datos
```

---

## Requisitos previos

- Node.js 20+
- npm 10+
- Cuenta en [Railway](https://railway.app) (gratis para empezar)
- API Key de [Anthropic](https://console.anthropic.com)

---

## Desarrollo local

### 1. Clonar e instalar dependencias

```bash
git clone <tu-repo>
cd psicologia-saas
npm install
```

### 2. Configurar variables de entorno

```bash
# Backend
cp .env.example apps/api/.env

# Frontend
cp .env.example apps/web/.env.local
```

Edita `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/psicologia"
JWT_SECRET="un-secreto-largo-y-aleatorio"
ANTHROPIC_API_KEY="sk-ant-..."
FRONTEND_URL="http://localhost:3000"
```

Edita `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

### 3. Levantar base de datos local (Docker)

```bash
docker run -d \
  --name psicologia-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=psicologia \
  -p 5432:5432 \
  postgres:16
```

### 4. Ejecutar migraciones

```bash
cd packages/prisma
npx prisma migrate dev --name init
npx prisma generate
cd ../..
```

### 5. Iniciar en modo desarrollo

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api
- Prisma Studio: `npm run db:studio`

---

## Despliegue en Railway

### Paso 1 — Crear proyecto en Railway

1. Ir a [railway.app](https://railway.app) → New Project
2. Seleccionar **"Deploy from GitHub repo"**
3. Conectar tu repositorio

### Paso 2 — Agregar base de datos PostgreSQL

1. En el proyecto Railway → **New Service → Database → PostgreSQL**
2. Railway creará automáticamente la variable `DATABASE_URL`

### Paso 3 — Configurar el servicio API (NestJS)

1. New Service → GitHub Repo → carpeta `apps/api`
2. En **Settings → Variables**, agregar:

```
DATABASE_URL        = (se copia del servicio PostgreSQL)
JWT_SECRET          = (genera uno: openssl rand -base64 32)
ANTHROPIC_API_KEY   = sk-ant-...
FRONTEND_URL        = https://tu-web.up.railway.app
PORT                = 3001
```

3. En **Settings → Build Command**:
```
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

4. En **Settings → Start Command**:
```
node dist/main
```

### Paso 4 — Configurar el servicio Web (Next.js)

1. New Service → GitHub Repo → carpeta `apps/web`
2. En **Settings → Variables**, agregar:

```
NEXT_PUBLIC_API_URL = https://tu-api.up.railway.app/api
```

3. Railway detecta Next.js automáticamente (build y start commands son automáticos)

### Paso 5 — Verificar despliegue

- Visita `https://tu-api.up.railway.app/api/health` → debe responder `{"status":"ok"}`
- Visita `https://tu-web.up.railway.app` → debe mostrar la pantalla de login

---

## Flujo de uso

### Para el psicólogo (usuario final)

1. **Registrarse** en `/auth/register` con nombre, correo y contraseña
2. **Crear paciente** en `/dashboard/patients/new`
3. **Nueva nota** → seleccionar paciente → elegir tipo:
   - **Ingreso**: primera consulta, sin contexto previo
   - **Seguimiento**: el sistema carga automáticamente las últimas 3 notas como contexto
4. Escribir nota libre en texto natural
5. La IA genera el SOAP estructurado con códigos CIE-10
6. **Revisar y editar** la nota generada (todos los campos son editables)
7. **Guardar** → se añade al expediente del paciente

### Contexto para notas de seguimiento

Cuando se genera una nota de seguimiento, el backend:
1. Recupera las últimas 3 notas del paciente de la base de datos
2. Las formatea como contexto clínico estructurado
3. Las incluye en el prompt enviado a Claude
4. Claude genera una nota que referencia la evolución del paciente

---

## Seguridad y aislamiento de datos

- Cada psicólogo solo puede ver **sus propios pacientes y notas**
- El campo `userId` en la tabla `Patient` garantiza aislamiento completo
- Todos los endpoints verifican que el recurso pertenezca al usuario autenticado via JWT
- Las contraseñas se guardan con **bcrypt** (salt rounds: 12)

---

## Variables de entorno requeridas

| Variable | Dónde | Descripción |
|---|---|---|
| `DATABASE_URL` | API | URL de PostgreSQL |
| `JWT_SECRET` | API | Secreto para firmar tokens JWT |
| `ANTHROPIC_API_KEY` | API | Clave de API de Anthropic |
| `FRONTEND_URL` | API | URL del frontend (para CORS) |
| `NEXT_PUBLIC_API_URL` | Web | URL base del backend |

---

## Costo estimado en producción

| Servicio | Costo |
|---|---|
| Railway (API + DB) | $0–5 USD/mes (plan Hobby) |
| Anthropic API (~50 notas/mes) | ~$1–2 USD/mes |
| **Total** | **~$1–7 USD/mes** |

---

## Próximas mejoras sugeridas

- [ ] Exportar nota a PDF/Word desde el expediente
- [ ] Búsqueda global de pacientes por diagnóstico CIE-10
- [ ] Plantillas personalizables por psicólogo
- [ ] Notificaciones de próximas citas
- [ ] Panel de administración multi-clínica
