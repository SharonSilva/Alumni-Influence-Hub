

const { validationResult } = require('express-validator');
const { db, id, today }    = require('../db');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return false; }
  return true;
}

function listEvents(req, res) {
  let events = [...db.events].sort((a, b) => a.date.localeCompare(b.date));
  if (req.query.upcoming === 'true') events = events.filter(e => e.date >= today());
  res.json({ success: true, data: events });
}

function getEvent(req, res) {
  const event = db.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  const attendees = db.eventAttendees
    .filter(a => a.eventId === event.id)
    .map(a => ({ userId: a.userId, name: db.users.find(u => u.id === a.userId)?.name, registeredAt: a.registeredAt }));
  res.json({ success: true, data: { ...event, attendees } });
}

function createEvent(req, res) {
  if (!handleValidation(req, res)) return;
  const newEvent = { id: id(), title: req.body.title, date: req.body.date, location: req.body.location, description: req.body.description || '', unlocksExtraBid: req.body.unlocksExtraBid || false, createdAt: new Date().toISOString() };
  db.events.push(newEvent);
  res.status(201).json({ success: true, data: newEvent });
}

function registerForEvent(req, res) {
  const event = db.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  if (req.user.role !== 'alumni') return res.status(403).json({ success: false, message: 'Only alumni can register for events' });
  if (db.eventAttendees.find(a => a.eventId === event.id && a.userId === req.user.id)) return res.status(409).json({ success: false, message: 'Already registered' });
  const att = { id: id(), eventId: event.id, userId: req.user.id, registeredAt: new Date().toISOString().split('T')[0] };
  db.eventAttendees.push(att);
  res.status(201).json({ success: true, data: att, message: event.unlocksExtraBid ? ' Registered! This event unlocks a 4th bid slot this month.' : ' Registered.' });
}

module.exports = { listEvents, getEvent, createEvent, registerForEvent };