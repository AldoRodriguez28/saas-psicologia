import { config } from 'dotenv';
import { resolve } from 'path';

// Debe importarse en main ANTES de AppModule. En CJS, require() de app.module
// se ejecuta antes de cualquier línea suelta de main; este import asegura .env
// listo al cargar JwtModule.
config({ path: resolve(__dirname, '../.env') });
