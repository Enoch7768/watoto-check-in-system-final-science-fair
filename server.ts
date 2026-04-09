import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import db, { initDb } from "./db";

// Initialize Database
initDb();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- Middleware ---
  const requireAdmin = (req: any, res: any, next: any) => {
    try {
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('adminPassword') as { value: string } | undefined;
      const requiredPassword = setting?.value;

      if (!requiredPassword) return next();

      const authHeader = req.headers.authorization;
      if (authHeader === `Bearer ${requiredPassword}`) return next();

      res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
    } catch (error) {
      res.status(500).json({ error: "Auth check failed" });
    }
  };

  const requireAnalytics = (req: any, res: any, next: any) => {
    try {
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('analyticsPassword') as { value: string } | undefined;
      const requiredPassword = setting?.value;

      if (!requiredPassword) return next();

      const authHeader = req.headers.authorization;
      if (authHeader === `Bearer ${requiredPassword}`) return next();

      res.status(401).json({ error: "Unauthorized: Invalid Analytics Password" });
    } catch (error) {
      res.status(500).json({ error: "Auth check failed" });
    }
  };

  const requireDev = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader === `Bearer IamthebestDev`) {
      return next();
    }
    res.status(401).json({ error: "Unauthorized: Dev access required" });
  };

  // --- Settings Routes ---
  app.get("/api/settings", requireDev, (req, res) => {
    try {
      const settings = db.prepare('SELECT * FROM settings').all();
      const settingsMap = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", requireDev, (req, res) => {
    try {
      const { key, value } = req.body;
      db.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(key, value);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // --- Auth Verification ---
  app.post("/api/auth/verify", (req, res) => {
    try {
      const { type, password } = req.body;
      const key = type === 'admin' ? 'adminPassword' : 'analyticsPassword';
      
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
      const requiredPassword = setting?.value;

      if (!requiredPassword) {
        return res.json({ success: true }); // No password set
      }

      if (password === requiredPassword) {
        return res.json({ success: true });
      }

      res.status(401).json({ error: "Invalid password" });
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // --- API Routes ---

  // Get all classes
  app.get("/api/classes", requireAdmin, (req, res) => {
    try {
      const classes = db.prepare('SELECT * FROM classes').all();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  // Get all students (with class name)
  app.get("/api/students", (req, res) => {
    try {
      const students = db.prepare(`
        SELECT s.*, COALESCE(c.name, 'Unassigned') as class_name 
        FROM students s 
        LEFT JOIN classes c ON s.class_id = c.id
        ORDER BY s.last_name
      `).all();
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  // Create Student
  app.post("/api/students", requireAdmin, (req, res) => {
    try {
      const { first_name, last_name, class_id, biometric_template } = req.body;
      const stmt = db.prepare(`
        INSERT INTO students (first_name, last_name, class_id, biometric_template)
        VALUES (?, ?, ?, ?)
      `);
      const info = stmt.run(first_name, last_name, class_id, biometric_template || null);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create student" });
    }
  });

  // Update Student
  app.put("/api/students/:id", requireAdmin, (req, res) => {
    try {
      const { first_name, last_name, class_id, biometric_template } = req.body;
      const stmt = db.prepare(`
        UPDATE students 
        SET first_name = ?, last_name = ?, class_id = ?, biometric_template = ?
        WHERE id = ?
      `);
      stmt.run(first_name, last_name, class_id, biometric_template || null, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update student" });
    }
  });

  // Delete Student
  app.delete("/api/students/:id", requireAdmin, (req, res) => {
    try {
      const deleteAttendance = db.prepare('DELETE FROM attendance WHERE student_id = ?');
      deleteAttendance.run(req.params.id);

      const stmt = db.prepare('DELETE FROM students WHERE id = ?');
      stmt.run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  // Create Class
  app.post("/api/classes", requireAdmin, (req, res) => {
    try {
      const { name } = req.body;
      const stmt = db.prepare('INSERT INTO classes (name) VALUES (?)');
      const info = stmt.run(name);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create class" });
    }
  });

  // Delete Class
  app.delete("/api/classes/:id", requireAdmin, (req, res) => {
    try {
      // Check if class has students
      const count = db.prepare('SELECT count(*) as count FROM students WHERE class_id = ?').get(req.params.id).count;
      if (count > 0) {
        return res.status(400).json({ error: "Cannot delete class with enrolled students" });
      }
      
      const stmt = db.prepare('DELETE FROM classes WHERE id = ?');
      stmt.run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete class" });
    }
  });

  // --- Parents Routes ---

  // Get all parents
  app.get("/api/parents", (req, res) => {
    try {
      const parents = db.prepare(`
        SELECT p.*, 
               GROUP_CONCAT(s.id) as student_ids, 
               GROUP_CONCAT(s.first_name || ' ' || s.last_name) as student_names
        FROM parents p
        LEFT JOIN student_parents sp ON p.id = sp.parent_id
        LEFT JOIN students s ON sp.student_id = s.id
        GROUP BY p.id
        ORDER BY p.last_name
      `).all();
      
      const formattedParents = parents.map((p: any) => ({
        ...p,
        student_ids: p.student_ids ? p.student_ids.split(',').map(Number) : [],
        student_names: p.student_names ? p.student_names.split(',') : []
      }));
      
      res.json(formattedParents);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch parents" });
    }
  });

  // Create Parent
  app.post("/api/parents", requireAdmin, (req, res) => {
    const { first_name, last_name, phone, biometric_template, student_ids } = req.body;
    try {
      db.transaction(() => {
        const info = db.prepare(`
          INSERT INTO parents (first_name, last_name, phone, biometric_template)
          VALUES (?, ?, ?, ?)
        `).run(first_name, last_name, phone || null, biometric_template || null);
        
        const parentId = info.lastInsertRowid;
        
        if (student_ids && Array.isArray(student_ids)) {
          const insertSP = db.prepare('INSERT INTO student_parents (parent_id, student_id) VALUES (?, ?)');
          for (const sid of student_ids) {
            insertSP.run(parentId, sid);
          }
        }
      })();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create parent" });
    }
  });

  // Update Parent
  app.put("/api/parents/:id", requireAdmin, (req, res) => {
    const { first_name, last_name, phone, biometric_template, student_ids } = req.body;
    const parentId = req.params.id;
    try {
      db.transaction(() => {
        db.prepare(`
          UPDATE parents 
          SET first_name = ?, last_name = ?, phone = ?, biometric_template = ?
          WHERE id = ?
        `).run(first_name, last_name, phone || null, biometric_template || null, parentId);
        
        db.prepare('DELETE FROM student_parents WHERE parent_id = ?').run(parentId);
        
        if (student_ids && Array.isArray(student_ids)) {
          const insertSP = db.prepare('INSERT INTO student_parents (parent_id, student_id) VALUES (?, ?)');
          for (const sid of student_ids) {
            insertSP.run(parentId, sid);
          }
        }
      })();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update parent" });
    }
  });

  // Delete Parent
  app.delete("/api/parents/:id", requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM parents WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete parent" });
    }
  });

  // Check-in / Sign-out Logic
  app.post("/api/checkin", (req, res) => {
    try {
      const { student_id, parent_id, biometric_template } = req.body;

      const eatDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      // 1. Identify User by Biometric
      if (biometric_template) {
        const student = db.prepare('SELECT * FROM students WHERE biometric_template = ?').get(biometric_template);
        if (student) {
          return handleStudentCheckIn(student, eatDate, res);
        }
        const parent = db.prepare('SELECT * FROM parents WHERE biometric_template = ?').get(biometric_template);
        if (parent) {
          return handleParentSignOut(parent, eatDate, res);
        }
        return res.status(404).json({ error: "Biometric template not recognized" });
      }

      // 2. Manual Student Check-in
      if (student_id) {
        const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
        if (!student) return res.status(404).json({ error: "Student not found" });
        return handleStudentCheckIn(student, eatDate, res);
      }

      // 3. Manual Parent Sign-out
      if (parent_id) {
        const parent = db.prepare('SELECT * FROM parents WHERE id = ?').get(parent_id);
        if (!parent) return res.status(404).json({ error: "Parent not found" });
        return handleParentSignOut(parent, eatDate, res);
      }

      return res.status(400).json({ error: "Invalid request" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Operation failed" });
    }
  });

  function handleStudentCheckIn(student: any, eatDate: string, res: any) {
    const existing = db.prepare(`
      SELECT * FROM attendance 
      WHERE student_id = ? AND date = ?
    `).get(student.id, eatDate);

    if (existing) {
      return res.status(400).json({ error: "Already checked in today", record: existing });
    }

    const now = new Date();
    const eatTimeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).formatToParts(now);
    
    const hour = parseInt(eatTimeParts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(eatTimeParts.find(p => p.type === 'minute')?.value || '0');
    
    const isLate = (hour > 7) || (hour === 7 && minute > 30);
    const status = isLate ? 'Late' : 'Present';

    const info = db.prepare(`
      INSERT INTO attendance (student_id, status, date)
      VALUES (?, ?, ?)
    `).run(student.id, status, eatDate);

    const record = db.prepare(`
      SELECT a.*, s.first_name, s.last_name, c.name as class_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE a.id = ?
    `).get(info.lastInsertRowid);

    res.json({ type: 'checkin', record });
  }

  function handleParentSignOut(parent: any, eatDate: string, res: any) {
    const children = db.prepare(`
      SELECT a.id as attendance_id, s.first_name, s.last_name
      FROM student_parents sp
      JOIN students s ON sp.student_id = s.id
      JOIN attendance a ON s.id = a.student_id
      WHERE sp.parent_id = ? AND a.date = ? AND a.check_out_time IS NULL
    `).all(parent.id, eatDate);

    if (children.length === 0) {
      return res.status(400).json({ error: "No children available to sign out today. They may not be checked in, or are already signed out." });
    }

    const updateStmt = db.prepare(`UPDATE attendance SET check_out_time = CURRENT_TIMESTAMP WHERE id = ?`);
    db.transaction(() => {
      for (const child of children as any[]) {
        updateStmt.run(child.attendance_id);
      }
    })();

    res.json({ 
      type: 'signout', 
      parent: { first_name: parent.first_name, last_name: parent.last_name },
      children: children 
    });
  }

  // Analytics Stats
  app.get("/api/stats", requireAnalytics, (req, res) => {
    try {
      // Get EAT Date
      const eatDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      // Total students
      const totalStudents = (db.prepare('SELECT count(*) as count FROM students').get() as any).count;

      // Today's attendance
      const attendance = db.prepare(`
        SELECT status, count(*) as count 
        FROM attendance 
        WHERE date = ?
        GROUP BY status
      `).all(eatDate) as { status: string, count: number }[];

      const presentCount = attendance.find(a => a.status === 'Present')?.count || 0;
      const lateCount = attendance.find(a => a.status === 'Late')?.count || 0;
      const checkedInCount = presentCount + lateCount;
      const absentCount = totalStudents - checkedInCount;

      // Class breakdown
      const classStats = db.prepare(`
        SELECT 
          c.name as class_name,
          COUNT(s.id) as total_students,
          SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late,
          COUNT(s.id) - COUNT(a.id) as absent
        FROM classes c
        LEFT JOIN students s ON c.id = s.class_id
        LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
        GROUP BY c.id
      `).all(eatDate);

      res.json({
        summary: {
          total: totalStudents,
          present: presentCount,
          late: lateCount,
          absent: absentCount
        },
        byClass: classStats
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Attendance History
  app.get("/api/attendance/history", requireAnalytics, (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let query = `
        SELECT a.*, s.first_name, s.last_name, c.name as class_name
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id
      `;
      
      const params: any[] = [];
      if (startDate && endDate) {
        query += ` WHERE a.date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ` WHERE a.date >= ?`;
        params.push(startDate);
      } else if (endDate) {
        query += ` WHERE a.date <= ?`;
        params.push(endDate);
      }
      
      query += ` ORDER BY a.date DESC, a.check_in_time DESC`;
      
      const history = db.prepare(query).all(...params);
      res.json(history);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch attendance history" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
