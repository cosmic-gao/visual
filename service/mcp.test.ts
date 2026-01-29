import { createConfig, createToolKey, normalizeUrl } from '../components/agent-topology/mcp-service/export.ts';

Deno.test('normalizeUrl trims trailing slash', () => {
    if (normalizeUrl('https://example.com/') !== 'https://example.com') {
        throw new Error('normalizeUrl should trim trailing slash');
    }
});

Deno.test('createToolKey normalizes url', () => {
    const key = createToolKey({ mcp_server_url: 'https://example.com/', name: 'read' });
    if (key !== 'https://example.com::read') {
        throw new Error('createToolKey should use normalized url');
    }
});

Deno.test('createConfig builds interrupt_config keys', () => {
    const config = createConfig([
        {
            name: 'read_url_content',
            display_name: 'read_url_content',
            mcp_server_url: 'https://example.com/',
            mcp_server_name: 'Agent Builder',
        },
    ]);

    const key = 'https://example.com::read_url_content::Agent Builder';
    if (config.interrupt_config[key] !== true) {
        throw new Error('interrupt_config key mismatch');
    }
    if (config.tools.length !== 1) {
        throw new Error('tools length mismatch');
    }
});
