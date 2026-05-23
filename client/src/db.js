import Database from '@tauri-apps/plugin-sql';

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
      board           TEXT NOT NULL DEFAULT 'main'
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

export async function renameDeck(id, name) {
  const db = await getDb();
  return db.execute('UPDATE decks SET name = $1 WHERE id = $2', [name, id]);
}

// Cards
export async function getCardsForDeck(deckId) {
  const db = await getDb();
  return db.select('SELECT * FROM deck_cards WHERE deck_id = $1', [deckId]);
}

export async function insertCard(deckId, card) {
  const db = await getDb();
  return db.execute(
    `INSERT INTO deck_cards (deck_id, scryfall_id, name, quantity, image_uri, image_uri_back, board, is_legendary)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [deckId, card.scryfall_id, card.name, card.quantity, card.image_uri, card.image_uri_back ?? null, card.board ?? 'main', card.is_legendary ? 1 : 0]
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
