const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store
let notes = new Map();

function seed() {
  notes.clear();
  const now = new Date().toISOString();
  const note1 = {
    id: crypto.randomUUID(),
    title: 'Welcome to Notes',
    content: 'This is your first sample note. You can edit or delete it, or create new notes to get started with the app.',
    createdAt: now,
    updatedAt: now
  };
  const note2 = {
    id: crypto.randomUUID(),
    title: 'Getting Started',
    content: 'Click the + New Note button to create a new note. Click on any note in the list to view its details.',
    createdAt: now,
    updatedAt: now
  };
  notes.set(note1.id, note1);
  notes.set(note2.id, note2);
}
seed();

function validateNoteBody(body) {
  const errors = [];
  if (!body || !body.title || !body.title.trim()) errors.push('Title is required.');
  else if (body.title.length > 255) errors.push('Title must not exceed 255 characters.');
  if (!body || !body.content || !body.content.trim()) errors.push('Content is required.');
  else if (body.content.length > 10000) errors.push('Content must not exceed 10000 characters.');
  return errors;
}

// Reset endpoint for E2E tests
app.post('/api/reset', (req, res) => {
  if (req.body && req.body.empty) {
    notes.clear();
  } else {
    seed();
  }
  res.json({ ok: true });
});

// List notes
app.get('/api/notes', (req, res) => {
  const list = Array.from(notes.values()).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  res.json(list);
});

// Get note
app.get('/api/notes/:id', (req, res) => {
  const note = notes.get(req.params.id);
  if (!note) return res.status(404).json({ errors: ['Note not found'] });
  res.json(note);
});

// Create note
app.post('/api/notes', (req, res) => {
  const errors = validateNoteBody(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const now = new Date().toISOString();
  const note = {
    id: crypto.randomUUID(),
    title: req.body.title.trim(),
    content: req.body.content.trim(),
    createdAt: now,
    updatedAt: now
  };
  notes.set(note.id, note);
  res.status(201).json(note);
});

// Update note
app.put('/api/notes/:id', (req, res) => {
  const note = notes.get(req.params.id);
  if (!note) return res.status(404).json({ errors: ['Note not found'] });
  const errors = validateNoteBody(req.body);
  if (errors.length) return res.status(400).json({ errors });
  note.title = req.body.title.trim();
  note.content = req.body.content.trim();
  note.updatedAt = new Date().toISOString();
  res.json(note);
});

// Delete note
app.delete('/api/notes/:id', (req, res) => {
  if (!notes.has(req.params.id)) return res.status(404).json({ errors: ['Note not found'] });
  notes.delete(req.params.id);
  res.status(204).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
