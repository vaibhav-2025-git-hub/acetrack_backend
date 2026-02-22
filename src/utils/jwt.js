const jwt = require('jsonwebtoken');

const generateToken = (id, email, user_type) => {
    return jwt.sign({ id, email, user_type }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
