/**
 * Crea la base indicada en DATABASE_URL si aún no existe.
 * Conecta a la base "postgres" del mismo host/usuario.
 * No uses esto en producción sin permisos CREATEDB; en Railway el PostgreSQL ya trae la DB.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { Client } = require("pg");

function assertSafeDbName(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `Nombre de base de datos no válido en DATABASE_URL: "${name}". Usa solo letras, números y _ (inicio con letra o _).`
    );
  }
  return name;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL no está definida (carga packages/prisma/.env o exporta la variable).");
    process.exit(1);
  }

  let targetName;
  try {
    const u = new URL(databaseUrl);
    targetName = (u.pathname || "/").replace(/^\//, "").split("/")[0];
  } catch (e) {
    console.error("DATABASE_URL no es una URL válida.");
    process.exit(1);
  }

  if (!targetName) {
    console.error("DATABASE_URL no incluye el nombre de la base en el path (ej. postgresql://.../psicologia).");
    process.exit(1);
  }

  const dbName = assertSafeDbName(targetName);
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  const client = new Client({ connectionString: adminUrl.toString() });
  try {
    await client.connect();
    const { rows } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (rows.length > 0) {
      console.log(`Base de datos "${dbName}" ya existe.`);
      return;
    }
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Base de datos "${dbName}" creada.`);
  } catch (err) {
    console.error(
      "No se pudo asegurar la base de datos. ¿Usuario/contraseña correctos y permiso de conexión a la base " +
        "`postgres`? Error:",
      err.message
    );
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
