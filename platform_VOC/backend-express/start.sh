#!/bin/bash
kill $(lsof -ti :8000) 2>/dev/null
sleep 1
node server.js