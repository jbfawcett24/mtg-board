import Database from '@tauri-apps/plugin-sql';
import { toDbCard } from './api/scryfall';

let db = null;

export async function getDb() {
  if (db) return db;
  db = await Database.load('sqlite:mtg.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS decks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      format     TEXT NOT NULL DEFAULT 'commander',
      color_identity TEXT NOT NULL DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS deck_cards (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id         INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      scryfall_id     TEXT,
      name            TEXT NOT NULL,
      quantity        INTEGER NOT NULL DEFAULT 1,
      image_uri       TEXT,
      image_uri_back  TEXT,
      is_legendary    INTEGER NOT NULL DEFAULT 0,
      board           TEXT NOT NULL DEFAULT 'main',
      oracle_text     TEXT NOT NULL,
      type_line       TEXT NOT NULL,
      color_identity  TEXT NOT NULL DEFAULT '[]'
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id     INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      scryfall_id TEXT,
      name        TEXT NOT NULL,
      image_uri   TEXT,
      power       TEXT,
      toughness   TEXT,
      colors      TEXT
    )
  `);


  await addColumnIfMissing(db, 'decks', 'color_identity', `TEXT NOT NULL DEFAULT '[]'`);
  await addColumnIfMissing(db, 'deck_cards', 'color_identity', `TEXT NOT NULL DEFAULT '[]'`);
}

async function addColumnIfMissing(db, table, column, definition) {
  const cols = await db.select(`PRAGMA table_info(${table})`);
  const exists = cols.some(c => c.name === column);
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Decks
export async function getDecks() {
  const db = await getDb();
  return db.select('SELECT * FROM decks ORDER BY created_at DESC');
}

export async function createDeck(name, format = 'commander') {
  const db = await getDb();
  return db.execute('INSERT INTO decks (name, format) VALUES ($1, $2)', [name, format]);
}

export async function deleteDeck(id) {
  const db = await getDb();
  return db.execute('DELETE FROM decks WHERE id = $1', [id]);
}

async function deleteDb() {
  const db = await getDb();
  return db.execute(`PRAGMA writable_schema = 1;
    DELETE FROM sqlite_master;
    PRAGMA writable_schema = 0;
    VACUUM;
    PRAGMA integrity_check;`
  )
}

export async function renameDeck(id, name) {
  const db = await getDb();
  return db.execute('UPDATE decks SET name = $1 WHERE id = $2', [name, id]);
}

// Cards
export async function getCardsForDeck(deckId) {
  const db = await getDb();
  return db.select('SELECT * FROM deck_cards WHERE deck_id = $1', [deckId]);
}

export async function insertCard(deckId, card, amount = 1) {
  const db = await getDb();

  const existing = await db.select(
    `SELECT id, quantity FROM deck_cards WHERE deck_id = $1 AND scryfall_id = $2 AND board = $3`,
    [deckId, card.scryfall_id, card.board ?? 'main']
  );

  if (existing.length > 0) {
    const newQuantity = existing[0].quantity + amount;
    return db.execute(
      `UPDATE deck_cards SET quantity = $1 WHERE id = $2`,
      [newQuantity, existing[0].id]
    );
  }

  return db.execute(
    `INSERT INTO deck_cards (deck_id, scryfall_id, name, quantity, image_uri, image_uri_back, board, is_legendary, oracle_text, type_line, color_identity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [deckId, card.scryfall_id, card.name, card.quantity, card.image_uri, card.image_uri_back ?? null, card.board ?? 'main', card.is_legendary ? 1 : 0, card.oracle_text, card.type_line, card.color_identity ?? '[]']
  );
}

export async function setCommander(deckId, card) {
  const db = await getDb();

  await db.execute(
    `UPDATE deck_cards SET board = 'main' WHERE deck_id = $1 AND board = 'commander'`,
    [deckId]
  );

  await updateDeckColors(deckId, card)

  return db.execute(
    `UPDATE deck_cards SET board = 'commander' WHERE deck_id = $1 AND scryfall_id = $2`,
    [deckId, card.scryfall_id]
  );
}

export async function setCommanderStart(deckId, scryfallCard) {
  const db = await getDb();

  const dbCard = toDbCard(scryfallCard, 1, 'commander');

  await updateDeckColors(deckId, dbCard);

  return db.execute(
    `INSERT INTO deck_cards (deck_id, scryfall_id, name, quantity, image_uri, image_uri_back, board, is_legendary, oracle_text, type_line, color_identity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [deckId, dbCard.scryfall_id, dbCard.name, dbCard.quantity, dbCard.image_uri, dbCard.image_uri_back ?? null, dbCard.board, dbCard.is_legendary ? 1 : 0, dbCard.oracle_text, dbCard.type_line, dbCard.color_identity]
  );
}

export async function removeCard(deckId, card, amount = 1) {
  const db = await getDb();

  const existing = await db.select(
    `SELECT id, quantity FROM deck_cards WHERE deck_id = $1 AND scryfall_id = $2 AND board = $3`,
    [deckId, card.scryfall_id, card.board ?? 'main']
  )

  if (existing.length === 0) {
    return;
  }

  const newQuantity = existing[0].quantity - amount

  if (newQuantity <= 0) {
    return db.execute(
      'DELETE FROM deck_cards WHERE id = $1',
      [existing[0].id]
    )
  }

  return db.execute(
    'UPDATE deck_cards SET quantity = $1 WHERE id = $2',
    [newQuantity, existing[0].id]
  )
}

export async function changeCardImage(deckId, card, newUrlFront, newUrlBack) {
  const db = await getDb();
  return db.execute(
    `UPDATE deck_cards
     SET image_uri = ?, image_uri_back = ?
     WHERE deck_id = ? AND id = ?`,
    [newUrlFront, newUrlBack ?? null, deckId, card.id]
  );
}


async function updateDeckColors(deckId, commander) {
  const colorIdentity = commander.color_identity ?? '[]';
  return db.execute(
    `UPDATE decks SET color_identity = $1 WHERE id = $2`,
    [colorIdentity, deckId]
  );
}

// Tokens
export async function getTokensForDeck(deckId) {
  const db = await getDb();
  return db.select('SELECT * FROM tokens WHERE deck_id = $1', [deckId]);
}

export async function insertToken(deckId, token) {
  const db = await getDb();
  return db.execute(
    `INSERT INTO tokens (deck_id, scryfall_id, name, image_uri, power, toughness, colors)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [deckId, token.scryfall_id ?? null, token.name, token.image_uri ?? null, token.power ?? null, token.toughness ?? null, token.colors ?? null]
  );
}

