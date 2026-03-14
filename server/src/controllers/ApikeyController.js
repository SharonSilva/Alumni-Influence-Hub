const { validationResult } = require('express-validator');
const ApiKey = require('../models/ApiKey');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return false; }
  return true;
}

function listKeys(req, res) {
  res.json({ success: true, data: ApiKey.getAll() });
}

function createKey(req, res) {
  if (!handleValidation(req, res)) return;
  const key = ApiKey.create({ name: req.body.name, scopes: req.body.scopes, ownerId: req.user.id });
  res.status(201).json({ success: true, message: 'API key generated. Save it — it will not be shown in full again.', data: key });
}

function getKeyDetail(req, res) {
  const key = ApiKey.findById(req.params.keyId);
  if (!key) return res.status(404).json({ success: false, message: 'Key not found' });
  const stats = ApiKey.getStats(key.id);
  res.json({ success: true, data: { ...key, ...stats } });
}

function getKeyStats(req, res) {
  const key = ApiKey.findById(req.params.keyId);
  if (!key) return res.status(404).json({ success: false, message: 'Key not found' });
  res.json({ success: true, data: { keyId: key.id, keyName: key.name, active: key.active, ...ApiKey.getStats(key.id) } });
}

function revokeKey(req, res) {
  const result = ApiKey.revoke(req.params.keyId, req.user.id);
  if (!result) return res.status(404).json({ success: false, message: 'Key not found or already revoked' });
  res.json({ success: true, message: `API key "${result.name}" revoked.` });
}

module.exports = { listKeys, createKey, getKeyDetail, getKeyStats, revokeKey };