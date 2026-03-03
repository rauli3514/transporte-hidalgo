-- 1. DESTRABAR PERMISOS RLS (Row Level Security)
DROP POLICY IF EXISTS "Todo_Usuarios" ON usuarios;
CREATE POLICY "Todo_Usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Todo_Viajes" ON viajes;
CREATE POLICY "Todo_Viajes" ON viajes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Todo_Remitos" ON remitos;
CREATE POLICY "Todo_Remitos" ON remitos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Todo_Vehiculos" ON vehiculos;
CREATE POLICY "Todo_Vehiculos" ON vehiculos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Todo_Choferes" ON choferes;
CREATE POLICY "Todo_Choferes" ON choferes FOR ALL USING (true) WITH CHECK (true);

-- 2. VINCULAR LA CUENTA DEL CHOFER
-- Habíamos filtrado por @chofer.hidalgo.com.ar pero estaban guardados como @hidalgo.com.ar
-- Esta regla vincula a TODOS los choferes o usuarios huérfanos a tu empresa.
INSERT INTO public.usuarios (id, empresa_id, nombre, email, rol)
SELECT 
    au.id, 
    'a92cbc47-aeec-44ac-aaaa-fdf834e0f382',
    SPLIT_PART(au.email, '@', 1),
    au.email, 
    'transportista'
FROM auth.users au
LEFT JOIN public.usuarios u ON au.id = u.id
WHERE u.id IS NULL;
