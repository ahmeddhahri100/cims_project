const router = require('express').Router();
const axios = require('axios');
const { Pool } = require('pg');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/monitor';
const N8N_CIMS_WEBHOOK = process.env.N8N_CIMS_WEBHOOK || 'http://localhost:5678/webhook-test/cims-monitor';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'n8n',
  user: process.env.POSTGRES_USER || 'n8n',
  password: process.env.POSTGRES_PASSWORD || 'n8npassword',
});

const initDatabase = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('[DETECTION] Database connection OK');
  } catch (err) {
    console.error('[DETECTION] Database connection error:', err.message);
  }

  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS attack_logs (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(100),
      source_platform VARCHAR(50) DEFAULT 'platform_voc',
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      source_ip VARCHAR(45),
      target_service VARCHAR(50),
      endpoint VARCHAR(255),
      method VARCHAR(10),
      headers JSONB,
      payload TEXT,
      attack_type VARCHAR(100),
      severity VARCHAR(20),
      status VARCHAR(20) DEFAULT 'detected'
    );

    CREATE TABLE IF NOT EXISTS ai_analysis (
      id SERIAL PRIMARY KEY,
      attack_log_id INT REFERENCES attack_logs(id),
      session_id VARCHAR(100),
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      ai_model VARCHAR(50),
      analysis JSONB,
      threat_level VARCHAR(20),
      recommendations TEXT,
      is_processed BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS scan_sessions (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(100) UNIQUE,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'active',
      total_attacks INT DEFAULT 0,
      critical_count INT DEFAULT 0,
      high_count INT DEFAULT 0,
      medium_count INT DEFAULT 0,
      low_count INT DEFAULT 0,
      n8n_workflow_id VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS cims_endpoints (
      id SERIAL PRIMARY KEY,
      service_name VARCHAR(50),
      base_url VARCHAR(255),
      port INT,
      endpoints JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_attack_analysis (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(100),
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      logs_analyzed INT,
      threat_detected BOOLEAN,
      threat_level VARCHAR(20),
      attack_types TEXT[],
      affected_services TEXT[],
      summary TEXT,
      recommendations TEXT[],
      confidence FLOAT,
      raw_response TEXT
    );

    INSERT INTO cims_endpoints (service_name, base_url, port, endpoints) VALUES
      ('auth-service', 'host.docker.internal', 3001, '["/api/auth/register", "/api/auth/login", "/api/auth/verify", "/api/auth/me"]'),
      ('patient-service', 'host.docker.internal', 3002, '["/api/patients", "/api/patients/:id", "/api/patients/profile", "/api/patients/sync-profile"]'),
      ('rdv-service', 'host.docker.internal', 3003, '["/api/rdv", "/api/rdv/doctors", "/api/rdv/patients", "/api/rdv/:id", "/api/appointments"]')
    ON CONFLICT DO NOTHING;
  `;

  try {
    await pool.query(createTablesSQL);
    console.log('[DETECTION] Database initialized successfully');
  } catch (err) {
    console.error('[DETECTION] Database init error:', err.message);
  }
};

setTimeout(() => initDatabase(), 1000);
console.log('[DETECTION] Route loaded');

router.post('/start-detection', async (req, res) => {
  try {
    const sessionId = `scan_${uuidv4().slice(0, 8)}`;

    try {
      const n8nResponse = await axios.post(N8N_WEBHOOK_URL, {
        action: 'start',
        session_id: sessionId,
        timestamp: new Date().toISOString()
      }, { timeout: 15000 });

      console.log('[DETECTION] n8n webhook triggered');
      console.log('[DETECTION] Response:', JSON.stringify(n8nResponse.data));
    } catch (n8nErr) {
      console.log('[DETECTION] n8n response:', n8nErr.response?.data || n8nErr.message);
    }

    try {
      await pool.query(
        `INSERT INTO scan_sessions (session_id, status) VALUES ($1, 'active')`,
        [sessionId]
      );
    } catch (dbErr) {
      console.log('[DETECTION] DB error (non-critical):', dbErr.message);
    }

    res.status(201).json({
      message: 'Attack detection started via n8n',
      session_id: sessionId,
      status: 'active',
      n8n_webhook: N8N_WEBHOOK_URL,
      workflow: 'cims-platform-voc-monitor'
    });
  } catch (err) {
    console.error('[DETECTION] Start error:', err.message);
    res.status(500).json({ error: 'Failed to start detection', details: err.message });
  }
});

router.post('/stop-detection', async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id required' });
    }

    await pool.query(
      `UPDATE scan_sessions SET status = 'completed', ended_at = NOW() WHERE session_id = $1`,
      [session_id]
    );

    const attackCount = await pool.query(
      `SELECT COUNT(*) as count FROM attack_logs WHERE session_id = $1`,
      [session_id]
    );

    res.json({
      message: 'Detection stopped',
      session_id: session_id,
      status: 'completed',
      total_attacks: parseInt(attackCount.rows[0].count)
    });
  } catch (err) {
    console.error('[DETECTION] Stop error:', err.message);
    res.status(500).json({ error: 'Failed to stop detection' });
  }
});

router.post('/log-attack', async (req, res) => {
  try {
    const {
      session_id,
      source_platform,
      source_ip,
      target_service,
      endpoint,
      method,
      headers,
      payload,
      attack_type,
      severity
    } = req.body;

    if (!session_id || !target_service) {
      return res.status(400).json({ error: 'session_id and target_service required' });
    }

    const platform = source_platform || 'platform_voc';

    const result = await pool.query(
      `INSERT INTO attack_logs 
       (session_id, source_platform, source_ip, target_service, endpoint, method, headers, payload, attack_type, severity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [session_id, platform, source_ip, target_service, endpoint, method, JSON.stringify(headers), payload, attack_type, severity]
    );

    const logId = result.rows[0].id;

    await pool.query(
      `UPDATE scan_sessions SET total_attacks = total_attacks + 1 WHERE session_id = $1`,
      [session_id]
    );

    try {
      const ollamaResponse = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt: `You are a cybersecurity expert. Analyze this attack attempt and provide:\n1. Threat level (Critical/High/Medium/Low)\n2. Attack type classification\n3. What the attacker was trying to accomplish\n4. Recommended response actions\n\nAttack Details:\n- Source IP: ${source_ip}\n- Target: ${target_service}\n- Endpoint: ${endpoint}\n- Method: ${method}\n- Payload: ${payload}\n- Attack Type: ${attack_type}\n- Severity: ${severity}\n\nProvide your analysis in JSON format:\n{"threat_level": "...", "attack_classification": "...", "goal": "...", "recommendations": ["...", "..."]}`,
        stream: false
      }, { timeout: 30000 });

      const aiAnalysis = ollamaResponse.data.response;

      let threatLevel = 'Medium';
      try {
        const parsed = JSON.parse(aiAnalysis);
        threatLevel = parsed.threat_level || severity || 'Medium';
      } catch (e) {
        if (aiAnalysis.toLowerCase().includes('critical')) threatLevel = 'Critical';
        else if (aiAnalysis.toLowerCase().includes('high')) threatLevel = 'High';
        else if (aiAnalysis.toLowerCase().includes('low')) threatLevel = 'Low';
      }

      await pool.query(
        `INSERT INTO ai_analysis (attack_log_id, session_id, ai_model, analysis, threat_level)
         VALUES ($1, $2, $3, $4, $5)`,
        [logId, session_id, OLLAMA_MODEL, JSON.stringify({ raw_analysis: aiAnalysis }), threatLevel]
      );

      if (threatLevel === 'Critical') {
        await pool.query(`UPDATE scan_sessions SET critical_count = critical_count + 1 WHERE session_id = $1`, [session_id]);
      } else if (threatLevel === 'High') {
        await pool.query(`UPDATE scan_sessions SET high_count = high_count + 1 WHERE session_id = $1`, [session_id]);
      } else if (threatLevel === 'Medium') {
        await pool.query(`UPDATE scan_sessions SET medium_count = medium_count + 1 WHERE session_id = $1`, [session_id]);
      } else {
        await pool.query(`UPDATE scan_sessions SET low_count = low_count + 1 WHERE session_id = $1`, [session_id]);
      }

      res.json({
        message: 'Attack logged and analyzed',
        log_id: logId,
        ai_analysis: aiAnalysis,
        threat_level: threatLevel
      });
    } catch (ollamaErr) {
      console.error('[DETECTION] Ollama error:', ollamaErr.message);

      await pool.query(
        `INSERT INTO ai_analysis (attack_log_id, session_id, ai_model, analysis, threat_level)
         VALUES ($1, $2, $3, $4, $5)`,
        [logId, session_id, OLLAMA_MODEL, JSON.stringify({ error: ollamaErr.message }), severity || 'Medium']
      );

      res.json({
        message: 'Attack logged (AI analysis pending)',
        log_id: logId,
        threat_level: severity || 'Medium'
      });
    }
  } catch (err) {
    console.error('[DETECTION] Log attack error:', err.message);
    res.status(500).json({ error: 'Failed to log attack' });
  }
});

router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await pool.query(
      `SELECT * FROM scan_sessions WHERE session_id = $1`,
      [sessionId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const attacks = await pool.query(
      `SELECT * FROM attack_logs WHERE session_id = $1 ORDER BY timestamp DESC`,
      [sessionId]
    );

    const analysis = await pool.query(
      `SELECT * FROM ai_analysis WHERE session_id = $1 ORDER BY timestamp DESC`,
      [sessionId]
    );

    res.json({
      session: session.rows[0],
      attacks: attacks.rows,
      ai_analysis: analysis.rows
    });
  } catch (err) {
    console.error('[DETECTION] Session query error:', err.message);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await pool.query(
      `SELECT * FROM scan_sessions ORDER BY started_at DESC LIMIT 20`
    );

    res.json({ sessions: sessions.rows });
  } catch (err) {
    console.error('[DETECTION] Sessions query error:', err.message);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

router.get('/report/:sessionId/pdf', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await pool.query(
      `SELECT * FROM scan_sessions WHERE session_id = $1`,
      [sessionId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const attacks = await pool.query(
      `SELECT * FROM attack_logs WHERE session_id = $1 ORDER BY timestamp DESC`,
      [sessionId]
    );

    const analysis = await pool.query(
      `SELECT a.*, al.attack_type, al.severity, al.endpoint, al.payload, al.source_ip
       FROM ai_analysis a
       JOIN attack_logs al ON a.attack_log_id = al.id
       WHERE a.session_id = $1
       ORDER BY a.timestamp DESC`,
      [sessionId]
    );

    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => { });

    doc.fontSize(24).text('CIMS Security Attack Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Session ID: ${sessionId}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.text(`Status: ${session.rows[0].status}`);
    doc.moveDown();

    doc.fontSize(16).text('Summary', { underline: true });
    doc.fontSize(12).text(`Total Attacks: ${session.rows[0].total_attacks}`);
    doc.text(`Critical: ${session.rows[0].critical_count}`);
    doc.text(`High: ${session.rows[0].high_count}`);
    doc.text(`Medium: ${session.rows[0].medium_count}`);
    doc.text(`Low: ${session.rows[0].low_count}`);
    doc.moveDown();

    doc.fontSize(16).text('Detailed Attack Analysis', { underline: true });
    doc.moveDown();

    for (const att of attacks.rows) {
      doc.fontSize(12).fillColor('red').text(`Attack #${att.id}`);
      doc.fillColor('black');
      doc.text(`Time: ${att.timestamp}`);
      doc.text(`Source IP: ${att.source_ip}`);
      doc.text(`Target: ${att.target_service} ${att.endpoint}`);
      doc.text(`Method: ${att.method}`);
      doc.text(`Attack Type: ${att.attack_type}`);
      doc.text(`Severity: ${att.severity}`);

      if (att.payload) {
        doc.text(`Payload: ${att.payload.substring(0, 500)}`);
      }
      doc.moveDown();
    }

    if (analysis.rows.length > 0) {
      doc.moveDown();
      doc.fontSize(16).text('AI Security Analysis (Ollama llama3)', { underline: true });
      doc.moveDown();

      for (const ai of analysis.rows) {
        doc.fontSize(12).fillColor('blue').text(`Analysis #${ai.id}`);
        doc.fillColor('black');
        doc.text(`AI Model: ${ai.ai_model}`);
        doc.text(`Threat Level: ${ai.threat_level}`);

        try {
          const analysisObj = JSON.parse(ai.analysis);
          if (analysisObj.raw_analysis) {
            doc.text(`Analysis: ${analysisObj.raw_analysis.substring(0, 1000)}`);
          }
        } catch (e) { }
        doc.moveDown();
      }
    }

    doc.end();

    await new Promise(resolve => doc.on('end', resolve));

    const pdfBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attack_report_${sessionId}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[DETECTION] PDF generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

router.get('/report/:sessionId/json', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await pool.query(
      `SELECT * FROM scan_sessions WHERE session_id = $1`,
      [sessionId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const attacks = await pool.query(
      `SELECT * FROM attack_logs WHERE session_id = $1 ORDER BY timestamp DESC`,
      [sessionId]
    );

    const analysis = await pool.query(
      `SELECT a.*, al.attack_type, al.severity, al.endpoint, al.payload, al.source_ip
       FROM ai_analysis a
       JOIN attack_logs al ON a.attack_log_id = al.id
       WHERE a.session_id = $1
       ORDER BY a.timestamp DESC`,
      [sessionId]
    );

    res.json({
      report: {
        session_id: sessionId,
        generated_at: new Date().toISOString(),
        status: session.rows[0].status,
        summary: {
          total_attacks: session.rows[0].total_attacks,
          critical: session.rows[0].critical_count,
          high: session.rows[0].high_count,
          medium: session.rows[0].medium_count,
          low: session.rows[0].low_count
        },
        attacks: attacks.rows,
        ai_analysis: analysis.rows.map(a => ({
          ...a,
          analysis: JSON.parse(a.analysis)
        }))
      }
    });
  } catch (err) {
    console.error('[DETECTION] JSON report error:', err.message);
    res.status(500).json({ error: 'Failed to generate JSON report' });
  }
});

router.get('/services', async (req, res) => {
  try {
    const services = await pool.query(
      `SELECT * FROM cims_endpoints WHERE is_active = true ORDER BY service_name`
    );

    res.json({ services: services.rows });
  } catch (err) {
    console.error('[DETECTION] Services query error:', err.message);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

router.post('/services', async (req, res) => {
  try {
    const { service_name, base_url, port, endpoints } = req.body;

    if (!service_name || !base_url || !port) {
      return res.status(400).json({ error: 'service_name, base_url, port required' });
    }

    await pool.query(
      `INSERT INTO cims_endpoints (service_name, base_url, port, endpoints)
       VALUES ($1, $2, $3, $4)`,
      [service_name, base_url, port, JSON.stringify(endpoints)]
    );

    res.status(201).json({ message: 'Service added', service_name });
  } catch (err) {
    console.error('[DETECTION] Add service error:', err.message);
    res.status(500).json({ error: 'Failed to add service' });
  }
});

// ─── /latest-analysis ─────────────────────────────────────────────────────────
// Read-only: returns the most recent AI result n8n stored in ai_attack_analysis.
router.get('/latest-analysis', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ai_attack_analysis ORDER BY timestamp DESC LIMIT 1`
    );
    if (result.rows.length === 0) {
      return res.json({ found: false, message: 'No results yet — click "Start Scan" to trigger n8n analysis.' });
    }
    const row = result.rows[0];
    return res.json({
      found:             true,
      id:                row.id,
      session_id:        row.session_id,
      timestamp:         row.timestamp,
      threat_detected:   row.threat_detected,
      threat_level:      row.threat_level,
      attack_types:      row.attack_types      || [],
      affected_services: row.affected_services || [],
      summary:           row.summary,
      recommendations:   row.recommendations   || [],
      confidence:        row.confidence,
      logs_analyzed:     row.logs_analyzed,
      raw_response:      row.raw_response,
    });
  } catch (err) {
    console.error('[DETECTION] latest-analysis error:', err.message);
    res.status(500).json({ error: 'Failed to fetch latest analysis', details: err.message });
  }
});

// ─── /analysis-history ────────────────────────────────────────────────────────
// Read-only: returns all AI analyses stored by n8n, newest first.
router.get('/analysis-history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const result = await pool.query(
      `SELECT id, session_id, timestamp, threat_detected,
              threat_level, attack_types, affected_services,
              summary, recommendations, confidence, logs_analyzed, raw_response
       FROM ai_attack_analysis
       ORDER BY timestamp DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ count: result.rows.length, records: result.rows });
  } catch (err) {
    console.error('[DETECTION] analysis-history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch analysis history', details: err.message });
  }
});

module.exports = router;
