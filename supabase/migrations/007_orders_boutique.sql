-- Mise à jour table orders pour supporter les nouveaux produits et modes de livraison boutique

-- Élargir le CHECK constraint product
alter table orders drop constraint if exists orders_product_check;
alter table orders add constraint orders_product_check
  check (product in ('epub', 'physique', 'livre', 'pack3', 'pack10'));

-- Ajouter les colonnes manquantes (idempotent)
alter table orders add column if not exists delivery        text;
alter table orders add column if not exists relay_point     jsonb;
alter table orders add column if not exists shipped_at      timestamptz;
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists tracking_url    text;

-- Supprimer tout CHECK constraint sur delivery (pickup, relay, home-mr, switzerland, postal sont tous valides)
alter table orders drop constraint if exists orders_delivery_check;
