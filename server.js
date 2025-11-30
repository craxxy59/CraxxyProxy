const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const url = require('url');
const path = require('path');

const app = express();
app.use(helmet());

// Fichiers statiques (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Whitelist — ajoute tes domaines ici
const WHITELIST = [
  "example.com",
  "www.example.com"
];

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
});
app.use(limiter);

// Checker domaine autorisé
function isAllowed(targetUrl) {
  try {
    const hostname = new url.URL(targetUrl).hostname;
    return WHITELIST.includes(hostname);
  } catch {
    return false;
  }
}

// Route proxy
app.get('/proxy', (req, res, next) => {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: "URL manquante" });

  if (!isAllowed(target)) {
    return res.status(403).json({ error: "Domaine non autorisé" });
  }

  const parsed = new url.URL(target);

  createProxyMiddleware({
    target: parsed.origin,
    changeOrigin: true,
    pathRewrite: () => parsed.pathname + parsed.search,
    onProxyReq: (proxyReq) => {
      proxyReq.removeHeader("cookie");
    },
    onError: () => res.status(500).send("Erreur proxy"),
  })(req, res, next);
});

// Lancement serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CraxxyProxy running on ${PORT}`));
