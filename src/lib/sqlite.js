/**
 * Reads an SQLite database in the browser with sql.js (WASM). Loaded lazily so
 * the ~1.5 MB engine only ships when someone actually opens a database.
 */
let engine = null;

async function sql() {
  if (engine) return engine;
  const [initSqlJs, wasmUrl] = await Promise.all([
    import('sql.js').then((m) => m.default),
    import('sql.js/dist/sql-wasm.wasm?url').then((m) => m.default)
  ]);
  engine = await initSqlJs({ locateFile: () => wasmUrl });
  return engine;
}

const quote = (n) => '"' + String(n).replace(/"/g, '""') + '"';

/**
 * Opens `bytes` and returns one entry per user table:
 * `{ name, columns, rows, total }`, rows capped at `rowLimit`.
 */
export async function readSqlite(bytes, { rowLimit = 200 } = {}) {
  const SQL = await sql();
  const db = new SQL.Database(bytes);
  try {
    const list = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const names = list.length ? list[0].values.map((r) => r[0]) : [];
    return names.map((name) => {
      const total = db.exec(`SELECT COUNT(*) FROM ${quote(name)}`)[0]?.values[0][0] ?? 0;
      const res = db.exec(`SELECT * FROM ${quote(name)} LIMIT ${rowLimit}`);
      return res.length
        ? { name, columns: res[0].columns, rows: res[0].values, total }
        : { name, columns: [], rows: [], total };
    });
  } finally {
    db.close();
  }
}
