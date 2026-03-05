import { createInterface } from 'readline';

export interface MCPTool {
    name: string;
    description: string;
    inputSchema: any;
    handler: (args: any) => Promise<any>;
}

export class MCPServer {
    private tools: Map<string, MCPTool> = new Map();

    public registerTool(tool: MCPTool) {
        this.tools.set(tool.name, tool);
    }

    public start() {
        const rl = createInterface({
            input: process.stdin,
            terminal: false
        });

        rl.on('line', async (line) => {
            try {
                const request = JSON.parse(line);
                if (request.method === 'initialize') {
                    this.sendResponse(request.id, {
                        protocolVersion: "2024-11-05",
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: "hybrid-rcp-mcp",
                            version: "0.6.2"
                        }
                    });
                } else if (request.method === 'tools/list') {
                    this.sendResponse(request.id, {
                        tools: Array.from(this.tools.values()).map(t => ({
                            name: t.name,
                            description: t.description,
                            inputSchema: t.inputSchema
                        }))
                    });
                } else if (request.method === 'tools/call') {
                    const tool = this.tools.get(request.params.name);
                    if (tool) {
                        try {
                            const result = await tool.handler(request.params.arguments);
                            this.sendResponse(request.id, result);
                        } catch (err: any) {
                            this.sendError(request.id, -32000, err.message);
                        }
                    } else {
                        this.sendError(request.id, -32601, "Tool not found");
                    }
                }
            } catch (e) {
                // Ignore parse errors or invalid protocol messages
            }
        });
    }

    private sendResponse(id: any, result: any) {
        process.stdout.write(JSON.stringify({
            jsonrpc: "2.0",
            id,
            result
        }) + "\n");
    }

    private sendError(id: any, code: number, message: string) {
        process.stdout.write(JSON.stringify({
            jsonrpc: "2.0",
            id,
            error: { code, message }
        }) + "\n");
    }
}
