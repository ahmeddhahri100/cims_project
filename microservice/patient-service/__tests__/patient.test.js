// Basic test file for patient service
const request = require('supertest');
const express = require('express');
const app = express();

// Mock route for testing
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

describe('Patient Service Health Check', () => {
  it('should return status OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});