require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log("Iniciando login con email");
    // Asumimos el email de admin para transporte hidalgo de alguna de las props, o fetch users (no podemos usar admin api, o podemos consultar por SQL)
}
check();
