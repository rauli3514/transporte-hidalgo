-- 1. ACTUALIZAR COLUMNAS DE LA TABLA REMITOS
ALTER TABLE remitos
DROP COLUMN IF EXISTS flete_costo,
DROP COLUMN IF EXISTS seguro_costo,
DROP COLUMN IF EXISTS otros_costos,
DROP COLUMN IF EXISTS importe_total,
DROP COLUMN IF EXISTS valor_declarado,
DROP COLUMN IF EXISTS cantidad_bultos,
DROP COLUMN IF EXISTS descripcion;

ALTER TABLE remitos
ADD COLUMN IF NOT EXISTS valor_declarado_total decimal(12,2) default 0.00,
ADD COLUMN IF NOT EXISTS flete_total decimal(12,2) default 0.00,
ADD COLUMN IF NOT EXISTS seguro_total decimal(12,2) default 0.00,
ADD COLUMN IF NOT EXISTS otros_cargos decimal(12,2) default 0.00,
ADD COLUMN IF NOT EXISTS subtotal decimal(12,2) GENERATED ALWAYS AS (flete_total + seguro_total + otros_cargos) STORED,
ADD COLUMN IF NOT EXISTS tipo_flete text default 'pago_destino';

ALTER TABLE remitos
ALTER COLUMN numero_guia DROP NOT NULL; -- Hacemos que sea opcional permitiendo auto-generarlo

-- 2. CREAR TABLA PARA LOS BULTOS/ITEMS INDIVIDUALES
CREATE TABLE IF NOT EXISTS remitos_items (
  id uuid primary key default uuid_generate_v4(),
  remito_id uuid references remitos(id) on delete cascade not null,
  cantidad int default 1,
  detalle text,
  peso_kg decimal(10,2) default 0.00,
  bul int default 1,
  flete decimal(12,2) default 0.00,
  valor_declarado decimal(12,2) default 0.00,
  created_at timestamp with time zone default now()
);

-- 3. PERMISOS RLS PARA LOS ITEMS
ALTER TABLE remitos_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todo_Remitos_Items" ON remitos_items;
CREATE POLICY "Todo_Remitos_Items" ON remitos_items FOR ALL USING (
  true -- Para que sea más sencillo en este MVP, permitimos inserciones a la tabla hija
) WITH CHECK ( true );
