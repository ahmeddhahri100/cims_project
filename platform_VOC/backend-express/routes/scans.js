const router = require('express').Router();
const axios = require('axios');

const scans = new Map();

let scanCounter = 1;

router.post('/', async (req, res) => {
    const { target, scan_type, intensity } = req.body;

    if (!target) {
        return res.status(400).json({ error: 'Target is required' });
    }

    const scanId = `scan_${String(scanCounter++).padStart(5, '0')}`;
    
    const scan = {
        id: scanId,
        target,
        scan_type: scan_type || 'basic',
        intensity: intensity || 'normal',
        status: 'pending',
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        results: null
    };

    scans.set(scanId, scan);

    console.log(`[SCAN] Created scan ${scanId} for target: ${target}`);

    // Trigger n8n workflow for the scan
    try {
        const n8nUrl = process.env.N8N_URL || 'http://localhost:5678';
        console.log(`[SCAN] Triggering n8n workflow at ${n8nUrl}/webhook/k8s-scan`);
        
        // Don't await if we want it to be asynchronous, but here we can just fire and forget
        axios.post(`${n8nUrl}/webhook/k8s-scan`, {
            scanId,
            target,
            scan_type: scan.scan_type,
            intensity: scan.intensity
        }).catch(err => {
            console.error(`[SCAN] Failed to trigger n8n:`, err.message);
            const failedScan = scans.get(scanId);
            if (failedScan) {
                failedScan.status = 'failed';
                failedScan.completed_at = new Date().toISOString();
                failedScan.results = { error: 'Failed to contact n8n scanner' };
                scans.set(scanId, failedScan);
            }
        });

        // Optimistically set to running
        const scanData = scans.get(scanId);
        scanData.status = 'running';
        scanData.started_at = new Date().toISOString();
        scans.set(scanId, scanData);

        res.status(201).json({
            message: `Scan initiated for ${target}`,
            scan_id: scanId,
            status: 'running',
            target
        });
    } catch (error) {
        console.error(`[SCAN] Error:`, error.message);
        res.status(500).json({ error: 'Failed to initiate scan workflow' });
    }
});

router.get('/', (req, res) => {
    const scanList = Array.from(scans.values()).reverse().slice(0, 50);
    res.json(scanList);
});

router.get('/:scanId', (req, res) => {
    const { scanId } = req.params;
    const scan = scans.get(scanId);

    if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(scan);
});

router.put('/:scanId', (req, res) => {
    const { scanId } = req.params;
    const { status, results } = req.body;
    
    const scan = scans.get(scanId);

    if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
    }

    if (status) scan.status = status;
    if (results) scan.results = results;
    
    if (status === 'completed' || status === 'failed') {
        scan.completed_at = new Date().toISOString();
    }

    scans.set(scanId, scan);

    res.json({ message: 'Scan updated', scan });
});

router.delete('/:scanId', (req, res) => {
    const { scanId } = req.params;
    const scan = scans.get(scanId);

    if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
    }

    scan.status = 'cancelled';
    scan.cancelled_at = new Date().toISOString();
    scans.set(scanId, scan);

    res.json({ message: 'Scan cancelled', scan_id: scanId });
});

module.exports = router;