const express = require('express');
const router = express.router ? express.Router() : express.Router;
// Commonjs safe router require
const { getAllTopics, addTopic, deleteTopic } = require('../controllers/curriculumController');

const r = express.Router();

r.get('/', getAllTopics);
r.post('/', addTopic);
r.delete('/:id', deleteTopic);

module.exports = r;
