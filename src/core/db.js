import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import config from '../config.js';

let _db = null;

export function db() {
  if (_db) return _db;
  mkdirSync(dirname(config.db.ruta), { recursive: true });
  _db = new DatabaseSync(config.db.ruta);
  _db.exec('PRAGMA journal_mode = WAL');
  _db.exec('PRAGMA foreign_keys = ON');
  migrar(_db);
  return _db;
}

/** Permite apuntar a una base en memoria dentro de los tests. */
export function usarBase(instancia) {
  _db = instancia;
  if (_db) {
    _db.exec('PRAGMA foreign_keys = ON');
    migrar(_db);
  }
  return _db;
}

export function baseEnMemoria() {
  return usarBase(new DatabaseSync(':memory:'));
}

function migrar(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL DEFAULT '',
      telefono TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      rubro TEXT NOT NULL DEFAULT '',
      comuna TEXT NOT NULL DEFAULT '',
      origen TEXT NOT NULL DEFAULT 'web',
      etapa TEXT NOT NULL DEFAULT 'nuevo',
      interes TEXT NOT NULL DEFAULT '',
      valor_estimado INTEGER NOT NULL DEFAULT 0,
      notas TEXT NOT NULL DEFAULT '',
      shopify_customer_id TEXT NOT NULL DEFAULT '',
      shopify_order_id TEXT NOT NULL DEFAULT '',
      creado TEXT NOT NULL,
      actualizado TEXT NOT NULL,
      etapa_desde TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_leads_etapa ON leads(etapa);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_telefono ON leads(telefono) WHERE telefono <> '';

    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      detalle TEXT NOT NULL DEFAULT '',
      creado TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_eventos_lead ON eventos(lead_id);

    CREATE TABLE IF NOT EXISTS tareas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      canal TEXT NOT NULL DEFAULT 'whatsapp',
      titulo TEXT NOT NULL,
      mensaje TEXT NOT NULL DEFAULT '',
      vence TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      creado TEXT NOT NULL,
      completado TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas(estado, vence);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tareas_unicas ON tareas(lead_id, tipo) WHERE estado = 'pendiente';

    CREATE TABLE IF NOT EXISTS envios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      canal TEXT NOT NULL,
      plantilla TEXT NOT NULL,
      destino TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'enviado',
      error TEXT NOT NULL DEFAULT '',
      creado TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_envios_unicos ON envios(lead_id, plantilla);

    CREATE TABLE IF NOT EXISTS publicaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      canal TEXT NOT NULL DEFAULT 'instagram',
      formato TEXT NOT NULL DEFAULT 'post',
      producto_handle TEXT NOT NULL DEFAULT '',
      titulo TEXT NOT NULL DEFAULT '',
      copy TEXT NOT NULL DEFAULT '',
      hashtags TEXT NOT NULL DEFAULT '',
      imagen_url TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'planificada',
      referencia_externa TEXT NOT NULL DEFAULT '',
      creado TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pub_unica ON publicaciones(fecha, canal, formato, producto_handle);

    CREATE TABLE IF NOT EXISTS webhooks_vistos (
      id TEXT PRIMARY KEY,
      creado TEXT NOT NULL
    );
  `);
}

export const ahora = () => new Date().toISOString();
