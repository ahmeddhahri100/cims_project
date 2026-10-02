require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const axios = require('axios');

const authRoutes = require('./routes/auth');
const scansRoutes = require('./routes/scans');
const detectionRoutes = require('./routes/detection');
const chatbotRoutes = require('./routes/chatbot');
const configRoutes = require('./routes/config');
const totpRoutes = require('./routes/totp');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8000;
const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = process.env.POSTGRES_PORT || 5432;
const POSTGRES_DB = process.env.POSTGRES_DB || 'n8n';
const POSTGRES_USER = process.env.POSTGRES_USER || 'n8n';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'n8npassword';

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'platform-voc-secret-key-change-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 3600000
    }
}));

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Platform VOC API is running',
        version: '1.0.0'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/totp', totpRoutes);
app.use('/api/v1/scans', auth, scansRoutes);
app.use('/api/v1/detection', auth, detectionRoutes);
app.use('/api/v1/chatbot', chatbotRoutes);
app.use('/api/v1/config', auth, configRoutes);

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

function tryListen(retries = 3) {
    const srv = app.listen(PORT);
    srv.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && retries > 0) {
            const { execSync } = require('child_process');
            try {
                const pid = execSync(`lsof -ti :${PORT}`, { encoding: 'utf8' }).trim();
                if (pid) {
                    console.log(`[SERVER] Port ${PORT} in use by PID ${pid}. Killing...`);
                    execSync(`kill -9 ${pid}`);
                }
            } catch {}
            console.log(`[SERVER] Waiting for port ${PORT} to be freed...`);
            setTimeout(() => tryListen(retries - 1), 1500);
        } else if (err.code === 'EADDRINUSE') {
            console.error(`[SERVER] Port ${PORT} still in use after retries.`);
            process.exit(1);
        } else {
            console.error('[SERVER] Error:', err.message);
            process.exit(1);
        }
    });
    srv.on('listening', () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║          Platform VOC Backend (Express.js)           ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                ║
║  Keycloak:       http://localhost:8080                  ║
║  Frontend:      http://localhost:5173                   ║
╚═══════════════════════════════════════════════════════════╝
        `);
    });
}

tryListen();

module.exports = app;