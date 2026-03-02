-- 1. Extensiones necesarias
create extension if not exists "uuid-ossp";

-- 2. ENUMERADOS
create type user_role as enum ('owner', 'admin', 'operador', 'transportista');
create type user_status as enum ('activo', 'inactivo');
create type vehiculo_status as enum ('activo', 'inactivo', 'mantenimiento');
create type chofer_status as enum ('activo', 'inactivo', 'vacaciones');
create type viaje_status as enum ('abierto', 'en_curso', 'cerrado');
create type remito_status as enum ('pendiente', 'en_transito', 'entregado', 'observado', 'cancelado');
create type condicion_pago as enum ('contado', 'pago en destino', 'cuenta corriente');

-- 3. TABLAS BASE
create table empresas (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  logo_url text,
  cuit text,
  direccion text,
  telefono text,
  plan text default 'basic',
  activa boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabla de Usuarios vinculada a auth.users de Supabase
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  nombre text not null,
  email text not null,
  rol user_role default 'operador',
  estado user_status default 'activo',
  created_at timestamp with time zone default now()
);

create table vehiculos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade not null,
  patente varchar(20) not null,
  modelo text,
  capacidad_kg decimal(10,2),
  estado vehiculo_status default 'activo',
  created_at timestamp with time zone default now()
);

create table choferes (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade not null,
  nombre text not null,
  dni text,
  telefono text,
  estado chofer_status default 'activo',
  created_at timestamp with time zone default now()
);

-- 4. OPERATIVA
create table viajes (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade not null,
  nombre text not null, -- Ej: DD-MM-AAAA Turno Mañana
  fecha date not null,
  turno text, -- Manana, Tarde, Noche
  vehiculo_id uuid references vehiculos(id),
  chofer_id uuid references choferes(id),
  estado viaje_status default 'abierto',
  notas text,

  -- Totales cacheados (opcionales, se pueden calcular al vuelo pero ayudan a performance)
  total_remitos int default 0,
  total_bultos int default 0,
  total_importe decimal(12,2) default 0.00,
  
  created_at timestamp with time zone default now(),
  updated_by uuid references usuarios(id)
);

create table remitos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) on delete cascade not null,
  viaje_id uuid references viajes(id) on delete set null,
  
  numero_guia text not null, -- Auto incremental lógico, ej: SEDE-452100
  factura_nro text,
  
  -- Remitente
  remitente_nombre text not null,
  remitente_telefono text,
  remitente_direccion text,
  remitente_localidad text,
  
  -- Destinatario
  destinatario_nombre text not null,
  destinatario_telefono text,
  destinatario_direccion text,
  destinatario_localidad text,
  
  -- Detalle Carga
  descripcion text, -- Ej: SOBRE o ENCOMIENDA
  cantidad_bultos int default 1,
  valor_declarado decimal(12,2) default 0.00,
  
  -- Cargos y Costos (Basado en imagen del recibo)
  flete_costo decimal(12,2) default 0.00,
  seguro_costo decimal(12,2) default 0.00,
  otros_costos decimal(12,2) default 0.00,
  importe_total decimal(12,2) GENERATED ALWAYS AS (flete_costo + seguro_costo + otros_costos) STORED,
  
  -- Pagos
  condicion_pago condicion_pago default 'pago en destino',
  contra_reembolso decimal(12,2) default 0.00, -- Si deben cobrar mercadería
  
  estado remito_status default 'pendiente',
  observaciones text,
  
  -- PRUEBAS DE ENTREGA (POD)
  firma_url text,
  firma_aclaracion text,
  firma_dni text,
  foto_entrega_url text,
  latitud_entrega decimal(10,7),
  longitud_entrega decimal(10,7),
  fecha_entrega timestamp with time zone,
  entregado_por_usuario_id uuid references usuarios(id),
  
  created_at timestamp with time zone default now(),
  created_by uuid references usuarios(id)
);

-- Constricción única para número_guia por empresa
create unique index idx_empresa_numero_guia on remitos(empresa_id, numero_guia);

-------------------------------------------------------
-- 5. ROW LEVEL SECURITY (Multi-tenant isolation)
-------------------------------------------------------

-- Habilitar RLS en todas las tablas
alter table empresas enable row level security;
alter table usuarios enable row level security;
alter table vehiculos enable row level security;
alter table choferes enable row level security;
alter table viajes enable row level security;
alter table remitos enable row level security;

-- Función helper para obtener la empresa del usuario logueado
create or replace function get_user_empresa_id()
returns uuid as $$
  select empresa_id from usuarios where id = auth.uid();
$$ language sql security definer;

-- Políticas para EMPRESAS 
-- (Un admin puede ver/editar su propia empresa)
create policy "Usuarios ven su propia empresa" 
  on empresas for select using (id = get_user_empresa_id());

-- Políticas para USUARIOS
create policy "Usuarios ven compañeros de su empresa" 
  on usuarios for select using (empresa_id = get_user_empresa_id());

-- Políticas para VEHICULOS
create policy "Ver vehiculos de la empresa" 
  on vehiculos for all using (empresa_id = get_user_empresa_id());

-- Políticas para CHOFERES
create policy "Ver choferes de la empresa" 
  on choferes for all using (empresa_id = get_user_empresa_id());

-- Políticas para VIAJES
create policy "Ver viajes de la empresa" 
  on viajes for all using (empresa_id = get_user_empresa_id());

-- Políticas para REMITOS
create policy "Ver remitos de la empresa" 
  on remitos for all using (empresa_id = get_user_empresa_id());

-- (Opcional) Las políticas de "para ALL" abarcan select, insert, update y delete 
-- siempre que el `empresa_id` coincida. Esto garantiza que nadie vea datos ajenos.
