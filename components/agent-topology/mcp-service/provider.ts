import type { McpServer, McpTool } from './types';
import { normalizeUrl } from './export';

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listTools(server: McpServer): Promise<McpTool[]> {
    const url = normalizeUrl(server.url);

    await sleep(300);

    if (url.includes('tools.langchain.com')) {
        throw new Error('tools/list not found (404)');
    }

    const common = {
        mcp_server_name: server.name,
        mcp_server_url: url,
    };

    return [
        {
            ...common,
            name: 'read_url_content',
            display_name: 'read_url_content',
            description: 'Read the content of a URL and return text.',
            input_schema: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Target URL' },
                },
                required: ['url'],
            },
        },
        {
            ...common,
            name: 'extract_images_from_url',
            display_name: 'extract_images_from_url',
            description: 'Extract image URLs from a webpage URL.',
            input_schema: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Target URL' },
                },
                required: ['url'],
            },
        },
        {
            ...common,
            name: 'search_web',
            display_name: 'search_web',
            description: 'Search the web with a query string.',
            input_schema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query' },
                },
                required: ['query'],
            },
        },
    ];
}
