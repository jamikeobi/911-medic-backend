// utils/sanitize.js
const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    return Object.keys(obj).reduce((acc, key) => {
        if (key.startsWith('$') || key.includes('.')) {
            return acc; // skip dangerous keys
        }
        acc[key] = typeof obj[key] === 'object'
            ? sanitize(obj[key])
            : obj[key];
        return acc;
    }, {});
};

const mongoSanitizeManual = (req, res, next) => {
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);
    next();
};

module.exports = mongoSanitizeManual;