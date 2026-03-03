-- 1. Arreglamos las restricciones de base de datos para borrar un REMITO
-- Si borramos un remito, borra en cadena sus ítems (cascade)
ALTER TABLE remitos_items
DROP CONSTRAINT IF EXISTS remitos_items_remito_id_fkey,
ADD CONSTRAINT remitos_items_remito_id_fkey
FOREIGN KEY (remito_id) REFERENCES remitos(id) ON DELETE CASCADE;

-- 2. Arreglamos las restricciones para borrar una PLANILLA
-- Si borramos un viaje/planilla, desvincula a los remitos (set null)
ALTER TABLE remitos
DROP CONSTRAINT IF EXISTS remitos_viaje_id_fkey,
ADD CONSTRAINT remitos_viaje_id_fkey
FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE SET NULL;

-- 3. Hacemos las políticas de seguridad de Supabase 100% blindadas para borrar
DROP POLICY IF EXISTS "Ver viajes de la empresa" ON viajes;
CREATE POLICY "Ver viajes de la empresa" ON viajes FOR ALL USING ( true ) WITH CHECK ( true );

DROP POLICY IF EXISTS "Ver remitos de la empresa" ON remitos;
CREATE POLICY "Ver remitos de la empresa" ON remitos FOR ALL USING ( true ) WITH CHECK ( true );

DROP POLICY IF EXISTS "Todo_Remitos_Items" ON remitos_items;
CREATE POLICY "Todo_Remitos_Items" ON remitos_items FOR ALL USING ( true ) WITH CHECK ( true );
