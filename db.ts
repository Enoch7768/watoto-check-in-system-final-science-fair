import Database from 'better-sqlite3';

const db = new Database('watoto.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  // Classes Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  // Students Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      class_id INTEGER,
      biometric_template TEXT UNIQUE,
      photo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id)
    )
  `);

  // Attendance Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      check_out_time DATETIME,
      status TEXT CHECK(status IN ('Present', 'Late')) NOT NULL,
      date DATE DEFAULT (date('now', 'localtime')),
      FOREIGN KEY (student_id) REFERENCES students(id)
    )
  `);

  try {
    db.exec("ALTER TABLE attendance ADD COLUMN check_out_time DATETIME");
  } catch (e) {
    // Column might already exist
  }

  // Parents Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      biometric_template TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Student-Parents Junction Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_parents (
      student_id INTEGER,
      parent_id INTEGER,
      PRIMARY KEY (student_id, parent_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
    )
  `);

  // Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Seed initial data if empty
  const classCount = db.prepare('SELECT count(*) as count FROM classes').get() as { count: number };
  if (classCount.count === 0) {
    const insertClass = db.prepare('INSERT INTO classes (name) VALUES (?)');
    const classes = ['Grade 1A', 'Grade 1B', 'Grade 2A', 'Grade 2B', 'Grade 3A'];
    classes.forEach(c => insertClass.run(c));

    const insertStudent = db.prepare(`
      INSERT INTO students (first_name, last_name, class_id, biometric_template) 
      VALUES (?, ?, ?, ?)
    `);
    
    // Mock students
    insertStudent.run('John', 'Doe', 1, 'bio_john_doe');
    insertStudent.run('Jane', 'Smith', 2, 'bio_jane_smith');
    insertStudent.run('Alice', 'Johnson', 1, 'bio_alice_johnson');
    insertStudent.run('Bob', 'Brown', 3, 'bio_bob_brown');

    const insertParent = db.prepare(`
      INSERT INTO parents (first_name, last_name, phone, biometric_template)
      VALUES (?, ?, ?, ?)
    `);
    insertParent.run('Michael', 'Doe', '555-0101', 'bio_michael_doe');
    insertParent.run('Sarah', 'Smith', '555-0102', 'bio_sarah_smith');

    const insertSP = db.prepare('INSERT INTO student_parents (student_id, parent_id) VALUES (?, ?)');
    insertSP.run(1, 1); // John Doe -> Michael Doe
    insertSP.run(2, 2); // Jane Smith -> Sarah Smith
  }
}

export default db;
