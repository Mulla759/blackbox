import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";

type DispatchDb = {
  exec(sql: string): void;
  get<T>(sql: string, ...params: any[]): T | undefined;
  all<T>(sql: string, ...params: any[]): T[];
  run(sql: string, ...params: any[]): unknown;
};

let dbPromise: Promise<DispatchDb> | null = null;

const DB_PATH = join(process.cwd(), ".data", "blackbox_dispatch.sqlite");

async function seedIfEmpty(db: DispatchDb) {
  const row = db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM contacts"
  ) ?? { count: 0 };
  if (row.count > 0) return;
  const now = new Date().toISOString();
  db.exec(`
    INSERT INTO contacts (
      id, full_name, phone_number, address, city, state, zip_code, preferred_language,
      accessibility_needs, is_deaf_or_hard_of_hearing, requires_interpreter, interpreter_language,
      prefers_sms, prefers_voice, emergency_contact_name, emergency_contact_phone, notes,
      opted_out_sms, profile_complete, created_at, updated_at
    ) VALUES
      ('c_maria','Maria Lopez','+16125550101','101 River St','Janesville','WI','53545','Spanish',
       'mobility support',0,0,NULL,0,1,'Carlos Lopez','+16125550111','Needs wheelchair-accessible transport.',0,1, '${now}','${now}'),
      ('c_ahmed','Ahmed Hassan','+16125550102','22 Oak Ave','Beloit','WI','53511','Somali',
       'transportation support',0,0,NULL,1,0,'Ayan Hassan','+16125550112','Prefers text updates first.',0,1, '${now}','${now}'),
      ('c_john','John Miller','+16125550103','14 Pine Rd','Milton','WI','53563','English',
       'power for medical device',0,0,NULL,0,1,'Elaine Miller','+16125550113','Needs battery backup options.',0,1, '${now}','${now}'),
      ('c_sarah','Sarah Johnson','+16125550104','81 Center St','Janesville','WI','53548','English',
       'hearing support',1,1,'ASL',1,0,'David Johnson','+16125550114','SMS or interpreter-assisted communication recommended.',0,1, '${now}','${now}');
  `);

  db.exec(`
    INSERT INTO responders (
      id, full_name, phone_number, role, preferred_language, created_at, updated_at
    ) VALUES
      ('r_1','Alex Rivera','+16125550201','field_responder','English','${now}','${now}'),
      ('r_2','Nadia Omar','+16125550202','dispatcher_assist','Somali','${now}','${now}');
  `);

  db.exec(`
    INSERT INTO dispatcher_settings (
      id, dispatcher_name, dispatcher_phone_number, default_language, created_at, updated_at
    ) VALUES
      ('default','BlackBox Dispatch','+16124331186','English','${now}','${now}');
  `);
}

async function initSchema(db: DispatchDb) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      full_name TEXT,
      phone_number TEXT UNIQUE NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      preferred_language TEXT,
      accessibility_needs TEXT,
      is_deaf_or_hard_of_hearing INTEGER NOT NULL DEFAULT 0,
      requires_interpreter INTEGER NOT NULL DEFAULT 0,
      interpreter_language TEXT,
      prefers_sms INTEGER NOT NULL DEFAULT 0,
      prefers_voice INTEGER NOT NULL DEFAULT 1,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      notes TEXT,
      opted_out_sms INTEGER NOT NULL DEFAULT 0,
      profile_complete INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS communication_logs (
      id TEXT PRIMARY KEY,
      contact_id TEXT,
      phone_number TEXT NOT NULL,
      direction TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      message_body TEXT,
      call_summary TEXT,
      language_used TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS responders (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone_number TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      preferred_language TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dispatcher_settings (
      id TEXT PRIMARY KEY,
      dispatcher_name TEXT NOT NULL,
      dispatcher_phone_number TEXT NOT NULL,
      default_language TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function wrapDb(db: DatabaseSync): DispatchDb {
  return {
    exec(sql: string) {
      db.exec(sql);
    },
    get<T>(sql: string, ...params: any[]) {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    all<T>(sql: string, ...params: any[]) {
      return db.prepare(sql).all(...params) as T[];
    },
    run(sql: string, ...params: any[]) {
      return db.prepare(sql).run(...params);
    },
  };
}

export async function getDispatchDb(): Promise<DispatchDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      mkdirSync(dirname(DB_PATH), { recursive: true });
      const db = new DatabaseSync(DB_PATH);
      const wrapped = wrapDb(db);
      await initSchema(wrapped);
      await seedIfEmpty(wrapped);
      return wrapped;
    })();
  }
  return dbPromise;
}
