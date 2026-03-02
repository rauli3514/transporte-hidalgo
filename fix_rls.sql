-- SOLUCION A RLS (Reglas de Seguridad) que evitan crear usuarios y choferes
-- Para correr en Supabase SQL Editor:

-- 1. Deshabilitar RLS temporal o Ajustar Políticas para Permitir Insertar
DROP POLICY IF EXISTS "Ver vehiculos de la empresa" ON vehiculos;
DROP POLICY IF EXISTS "Ver choferes de la empresa" ON choferes;
DROP POLICY IF EXISTS "Ver remitos de la empresa" ON remitos;
DROP POLICY IF EXISTS "Ver viajes de la empresa" ON viajes;
DROP POLICY IF EXISTS "Usuarios ven compañeros de su empresa" ON usuarios;

-- 2. Crear las Políticas ALL (Incluye SELECT, INSERT, UPDATE, DELETE)

-- VEHICULOS
CREATE POLICY "Permitir todo a usuarios de la misma empresa - vehiculos" 
ON vehiculos FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
) WITH CHECK (
  empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
);

-- CHOFERES
CREATE POLICY "Permitir todo a usuarios de la misma empresa - choferes" 
ON choferes FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
) WITH CHECK (
  empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
);

-- VIAJES
CREATE POLICY "Permitir todo a usuarios de la misma empresa - viajes" 
ON viajes FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
) WITH CHECK (
  empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
);

-- REMITOS
CREATE POLICY "Permitir todo a usuarios de la misma empresa - remitos" 
ON remitos FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
) WITH CHECK (
  empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
);

-- USUARIOS
CREATE POLICY "Permitir todo a usuarios de la misma empresa - usuarios" 
ON usuarios FOR ALL USING (
  empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
) WITH CHECK (
  true -- Necesario para poder inyectar nuevos usuarios desde el admin sin bloquearse a sí mismo
);

-- 3. INSERTAR EL ENLACE DEL PRIMER ADMIN PARA LA EMPRESA (Ejecución Única)
-- Como RLS nos bloqueaba en el paso anterior, Ramón no tenía empresa asignada físicamente en la db.
DO $$
DECLARE
  v_empresa_id UUID;
  v_user_id UUID;
BEGIN
  -- 1. Buscamos el ID del usuario en Auth
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'ramonhidalgo@hidalgo.com.ar' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
      -- 2. Creamos o conseguimos la empresa principal
      SELECT id INTO v_empresa_id FROM empresas WHERE cuit = '30-12345678-9' LIMIT 1;
      
      IF v_empresa_id IS NULL THEN
          INSERT INTO empresas (nombre, cuit, plan) VALUES ('Transporte Hidalgo', '30-12345678-9', 'premium') RETURNING id INTO v_empresa_id;
      END IF;

      -- 3. Enlazamos a Ramón como administrador de la empresa en la tabla pública de usuarios
      INSERT INTO usuarios (id, empresa_id, nombre, email, rol)
      VALUES (v_user_id, v_empresa_id, 'Ramón Hidalgo', 'ramonhidalgo@hidalgo.com.ar', 'admin')
      ON CONFLICT (id) DO UPDATE SET empresa_id = EXCLUDED.empresa_id;
  END IF;
END $$;
