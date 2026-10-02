const router = require('express').Router();
const axios = require('axios');

const N8N_CHATBOT_URL = process.env.N8N_CHATBOT_URL || 'http://localhost:5678/webhook/cims-chatbot';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

router.get('/health', async (req, res) => {
  const urls = [
    process.env.OLLAMA_URL || 'http://localhost:11434',
    'http://ollama:11434',
    'http://host.docker.internal:11434',
  ];
  const errors = [];
  for (const url of urls) {
    try {
      const resp = await axios.get(`${url}/api/tags`, { timeout: 2000 });
      if (resp.data?.models) {
        return res.json({ ollama: true, models: resp.data.models.length });
      }
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
    }
  }
  console.error('[OLLAMA HEALTH] All URLs failed:', errors.join(' | '));
  res.json({ ollama: false, models: 0, errors });
});

router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    const n8nRes = await axios.post(N8N_CHATBOT_URL, { input: question }, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' },
    });

    const data = n8nRes.data;
    res.json({
      answer: data.output || data.text || data.response || JSON.stringify(data),
      sources: data.sources || [],
    });
  } catch (err) {
    console.error('[CHATBOT PROXY] Error:', err.message);

    if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      return res.json({
        answer: '⚠️ Cannot reach n8n. Make sure `docker compose up -d` is running with n8n on port 5678.',
        sources: [],
      });
    }

    if (err.response?.status === 404) {
      return res.json({
        answer: '⚠️ n8n webhook not found. In your CIMS K8s Monitor workflow, add a Webhook node with path "cims-chatbot" and make the workflow Active.',
        sources: [],
      });
    }

    res.json({
      answer: `Sorry, I encountered an error: ${err.message}`,
      sources: [],
    });
  }
});

module.exports = router;
