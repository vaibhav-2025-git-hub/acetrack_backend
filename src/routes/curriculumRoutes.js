const express = require('express');
const router = express.router ? express.Router() : express.Router;
// Commonjs safe router require
const { getAllTopics, addTopic, deleteTopic } = require('../controllers/curriculumController');

const { protect, authorize } = require('../middleware/authMiddleware');

const r = express.Router();

r.get('/', protect, getAllTopics);
r.post('/', protect, authorize('faculty', 'admin'), addTopic);
r.delete('/:id', protect, authorize('faculty', 'admin'), deleteTopic);

module.exports = r;
