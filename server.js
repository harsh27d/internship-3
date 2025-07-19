const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*'
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'social_media'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to MySQL');
});

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Register
app.post('/api/register', upload.single('profilePhoto'), async (req, res) => {
  const { username, email, password } = req.body;
  const profileImage = req.file ? req.file.filename : 'default.png';
  try {
    const hashed = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (username, email, password, profile_image) VALUES (?, ?, ?, ?)',
      [username, email, hashed, profileImage],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Registration failed' });
        }
        res.status(201).json({ userId: result.insertId });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (results.length === 0) return res.status(401).json({ error: 'User not found' });
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid password' });

    const { id, username, email: userEmail, profile_image } = user;
    res.json({
      message: 'Login successful',
      user: { id, username, email: userEmail, profile_image }
    });
  });
});

// Posts
app.get('/api/posts', (req, res) => {
  const sql = `
    SELECT posts.id, posts.content, posts.created_at, users.username, users.profile_image
    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to load posts' });
    res.json(results);
  });
});

app.post('/api/posts', (req, res) => {
  const { user_id, content } = req.body;
  db.query('INSERT INTO posts (user_id, content) VALUES (?, ?)', [user_id, content], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to create post' });
    res.json({ postId: result.insertId });
  });
});

// Comments
app.post('/api/comments', (req, res) => {
  const { user_id, post_id, comment } = req.body;
  db.query('INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)', [post_id, user_id, comment], err => {
    if (err) return res.status(500).json({ error: 'Failed to add comment' });
    res.json({ success: true });
  });
});

app.get('/api/comments/:postId', (req, res) => {
  const postId = req.params.postId;
  const sql = `
    SELECT c.id, c.comment, u.username, c.created_at, u.profile_image
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `;
  db.query(sql, [postId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to load comments' });
    res.json(results);
  });
});

// Friend Requests
app.get('/api/friend-requests/:userId', (req, res) => {
  const userId = req.params.userId;
  db.query(`
    SELECT fr.id, u.id as user_id, u.username, u.profile_image
    FROM friend_requests fr
    JOIN users u ON fr.sender_id = u.id
    WHERE fr.receiver_id = ? AND fr.status = 'pending'
  `, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to get requests' });
    }
    res.json(results);
  });
});

app.post('/api/friend-requests/send', (req, res) => {
  const { sender_id, receiver_id } = req.body;
  if (sender_id === receiver_id) {
    return res.status(400).json({ error: 'Cannot send request to yourself' });
  }
  const query = `
    INSERT INTO friend_requests (sender_id, receiver_id, status)
    SELECT ?, ?, 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM friend_requests 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ) AND ? != ?
  `;
  db.query(query, [sender_id, receiver_id, sender_id, receiver_id, receiver_id, sender_id, sender_id, receiver_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Request failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'Request already exists' });
    }
    res.json({ success: true });
  });
});

app.post('/api/friend-requests/accept', (req, res) => {
  const { requestId } = req.body;
  db.query('UPDATE friend_requests SET status = "accepted" WHERE id = ?', [requestId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to accept request' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json({ success: true });
  });
});

// Friends List (accepted)
app.get('/api/friends/:userId', (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT u.id, u.username, u.profile_image
    FROM users u
    JOIN friend_requests fr ON (
      (fr.sender_id = ? AND fr.receiver_id = u.id) OR 
      (fr.receiver_id = ? AND fr.sender_id = u.id)
    )
    WHERE fr.status = 'accepted' AND u.id != ?
  `;
  db.query(query, [userId, userId, userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch friends' });
    }
    res.json(results);
  });
});

// People You May Know (all users except yourself)
app.get('/api/users/all-except/:userId', (req, res) => {
  const userId = req.params.userId;
  db.query(
    'SELECT id, username, profile_image FROM users WHERE id != ?',
    [userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to load users' });
      }
      res.json(results);
    }
  );
});

// Chat Messages
app.post('/api/messages/send', (req, res) => {
  const { sender_id, receiver_id, message } = req.body;
  if (sender_id === receiver_id) {
    return res.status(400).json({ error: 'Cannot message yourself' });
  }
  db.query(
    'INSERT INTO messages (sender_id, receiver_id, message, created_at) VALUES (?, ?, ?, NOW())',
    [sender_id, receiver_id, message],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Message failed' });
      }
      res.json({ messageId: result.insertId });
    }
  );
});

app.get('/api/messages/:senderId/:receiverId', (req, res) => {
  const { senderId, receiverId } = req.params;
  const sql = `
    SELECT m.id, m.sender_id, m.receiver_id, m.message, m.created_at, 
           u.username as sender_username, u.profile_image as sender_profile_image
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `;
  db.query(sql, [senderId, receiverId, receiverId, senderId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to load messages' });
    }
    res.json(results);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
