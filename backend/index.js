require('dd-trace').init();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// test

const app = express();
app.use(express.json());

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, PORT = 3000 } = process.env;

let pool;
(async () => {
  pool = mysql.createPool({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME,
    waitForConnections: true, connectionLimit: 10, queueLimit: 0
  });
})();

// Auth middleware
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'unauthorized' }); }
}

// Health check
app.get('/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); }
  catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Auth login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE username=?', [username]);
  if (!rows.length) return res.status(401).json({ error: 'invalid credentials' });
  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Create user
app.post('/users', auth, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const hash = await bcrypt.hash(password, 10);
  await pool.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
  res.status(201).json({ username });
});

// List users
app.get('/users', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, GROUP_CONCAT(r.name ORDER BY r.name) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON u.id=ur.user_id
     LEFT JOIN roles r ON ur.role_id=r.id
     GROUP BY u.id, u.username`
  );
  res.json(rows);
});

// Update user
app.put('/users/:id', auth, async (req, res) => {
  const { username, password } = req.body;
  if (!username && !password) {
    return res.status(400).json({ error: 'username or password required' });
  }
  try {
    const fields = [];
    const values = [];
    if (username) {
      fields.push("username = ?");
      values.push(username);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push("password_hash = ?");
      values.push(hash);
    }
    values.push(req.params.id);

    const [result] = await pool.execute(
      `UPDATE users SET ${fields.join(", ")} WHERE id=?`,
      values
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'not found' });
    res.json({ id: Number(req.params.id), username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Delete user
app.delete('/users/:id', auth, async (req, res) => {
  const [result] = await pool.execute('DELETE FROM users WHERE id=?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

// Assign role
app.post('/users/:id/roles', auth, async (req, res) => {
  const { name } = req.body;
  const [[role]] = await pool.query('SELECT * FROM roles WHERE name=?', [name]);
  let roleId = role?.id;
  if (!roleId) {
    const [r] = await pool.execute('INSERT INTO roles (name) VALUES (?)', [name]);
    roleId = r.insertId;
  }
  await pool.execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [req.params.id, roleId]);
  res.status(201).json({ userId: Number(req.params.id), role: name });
});

// Remove role
app.delete('/users/:id/roles/:role', auth, async (req, res) => {
  const [[role]] = await pool.query('SELECT * FROM roles WHERE name=?', [req.params.role]);
  if (!role) return res.status(404).json({ error: 'role not found' });
  const [r] = await pool.execute('DELETE FROM user_roles WHERE user_id=? AND role_id=?', [req.params.id, role.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

// Transactions CRUD
app.post('/api/transaction', auth, async (req, res) => {
  const { reference, amount, currency = 'USD', status = 'pending' } = req.body;
  if (!reference || amount == null) return res.status(400).json({ error: 'reference and amount required' });
  const [result] = await pool.execute(
    'INSERT INTO transactions (reference, amount, currency, status) VALUES (?, ?, ?, ?)',
    [reference, amount, currency, status]
  );
  res.status(201).json({ id: result.insertId, reference, amount, currency, status });
});

app.get('/api/transaction', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
  res.json(rows);
});

app.get('/api/transaction/:id', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM transactions WHERE id=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

app.put('/api/transaction/:id', auth, async (req, res) => {
  const { amount, currency, status } = req.body;
  const [r] = await pool.execute(
    'UPDATE transactions SET amount=COALESCE(?, amount), currency=COALESCE(?, currency), status=COALESCE(?, status) WHERE id=?',
    [amount, currency, status, req.params.id]
  );
  if (!r.affectedRows) return res.status(404).json({ error: 'not found' });
  res.json({ id: Number(req.params.id), amount, currency, status });
});

app.delete('/api/transaction/:id', auth, async (req, res) => {
  const [r] = await pool.execute('DELETE FROM transactions WHERE id=?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

app.listen(PORT, () => console.log(`App listening on ${PORT}`));


