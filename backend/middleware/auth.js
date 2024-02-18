import pkg from 'jsonwebtoken';
const { verify } = pkg;

const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = verify(token, process.env.JWT_SECRET);
        req.user = decoded.userId;
        if (decoded.impersonatedBy) {
            req.impersonatedBy = decoded.impersonatedBy;
        }
        next();
    } catch (err) {
        console.error('JWT Error:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

export default auth;
