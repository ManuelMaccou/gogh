import privy from '../services/privyClient.js';

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "No authentication token provided." });
    }

    const token = authHeader.split(' ')[1]; 
    const verifiedClaims = await privy.verifyAuthToken(token);

    req.user = verifiedClaims.userId

    next();
  } catch (error) {
    // If token verification fails
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

export default auth;
