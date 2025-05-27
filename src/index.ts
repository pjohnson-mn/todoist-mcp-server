#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { server } from './clients.js';
import { config, log } from './utils/helpers.js';
import express from 'express';
import cors from 'cors';
import './prompts.js';
import './tools.js';

export async function main() {
    if (!config.API_KEY || config.API_KEY.length === 0) {
        log('Missing required configuration: API_KEY');
        process.exit(1);
    }

    try {
        // Check if we should run in SSE mode or stdio mode
        const useSSE = process.argv.includes('--sse') || process.env.MCP_SSE === 'true';
        const port = process.env.PORT || 3000;

        if (useSSE) {
            // Set up Express server for SSE
            const app = express();
            
            // Enable CORS for cross-origin requests
            app.use(cors({
                origin: true,
                credentials: true
            }));

            // Health check endpoint
            app.get('/health', (req, res) => {
                res.json({ status: 'ok', timestamp: new Date().toISOString() });
            });

            // SSE endpoint for MCP
            app.get('/sse', async (req, res) => {
                log('SSE connection attempt from:', req.ip);
                
                try {
                    const transport = new SSEServerTransport('/sse', res);
                    await server.connect(transport);
                    log('SSE client connected');
                } catch (error) {
                    log('SSE connection error:', error);
                    res.status(500).json({ error: 'Failed to establish SSE connection' });
                }
            });

            // Start HTTP server
            app.listen(port, () => {
                log(`MCP Server running in SSE mode on port ${port}`);
                log(`SSE endpoint available at: http://localhost:${port}/sse`);
                log(`Health check available at: http://localhost:${port}/health`);
            });

        } else {
            // Original stdio mode
            const transport = new StdioServerTransport();
            await server.connect(transport);
            process.stdin.resume();
            log('Server connected and running in stdio mode');
        }

    } catch (error) {
        log('Fatal error:', error);
        process.exit(1);
    }
}

main().then();
