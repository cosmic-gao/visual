import React from 'react';
import { AgentTopology, type TopologyConfig } from '../components/agent-topology';

export const meta = {
    label: 'Topology',
    icon: 'Home',
    order: 1,
    menu: true,
}

/**
 * Demo page for Agent Topology component
 */
export default function TopologyDemo() {
    // Example configuration matching the reference design
    const config: TopologyConfig = {
        nodes: [
            {
                id: 'triggers-1',
                type: 'TRIGGERS',
                data: {
                    label: 'TRIGGERS',
                    triggers: [
                        {
                            id: 'trigger-1',
                            schedule: 'At 08:00 AM, every day'
                        }
                    ]
                },
                position: { x: 80, y: 60 }
            },
            {
                id: 'agent-1',
                type: 'AGENT',
                data: {
                    label: 'AGENT',
                    title: 'Daily Calendar Brief',
                    description: 'Reviews your calendar and sends you a brief',
                    instructions: `Daily Calendar Brief

You are a personal calendar assistant that provides a helpful morning brief of the user's day....`
                },
                position: { x: 80, y: 300 }
            },
            {
                id: 'toolbox-1',
                type: 'TOOLBOX',
                data: {
                    label: 'TOOLBOX',
                    mcpEnabled: true,
                    tools: [
                        {
                            id: 'tool-1',
                            name: 'Read ...',
                            source: 'Agent B...',
                            status: 'review'
                        },
                        {
                            id: 'tool-2',
                            name: 'Extract Images From URL',
                            source: 'Agent Builder',
                            status: 'active'
                        }
                    ]
                },
                position: { x: 560, y: 60 }
            },
            {
                id: 'subagents-1',
                type: 'SUB-AGENTS',
                data: {
                    label: 'SUB-AGENTS',
                    subAgents: [
                        {
                            id: 'sub-1',
                            name: 'Sub-agent 1'
                        }
                    ]
                },
                position: { x: 560, y: 340 }
            },
            {
                id: 'skills-1',
                type: 'SKILLS',
                data: {
                    label: 'SKILLS',
                    skills: [
                        {
                            id: 'skill-1',
                            name: 'new-skill'
                        }
                    ]
                },
                position: { x: 560, y: 620 }
            }
        ],
        edges: [
            {
                id: 'e-triggers-agent',
                source: 'triggers-1',
                target: 'agent-1',
                type: 'dashed'
            },
            {
                id: 'e-agent-toolbox',
                source: 'agent-1',
                target: 'toolbox-1',
                type: 'dashed'
            },
            {
                id: 'e-agent-subagents',
                source: 'agent-1',
                target: 'subagents-1',
                type: 'dashed'
            },
            {
                id: 'e-agent-skills',
                source: 'agent-1',
                target: 'skills-1',
                type: 'dashed'
            }
        ],
        layout: {
            type: 'manual'
        }
    };

    return (
        <div className="w-full h-screen bg-gray-50">

            <div className="w-full h-[calc(100vh-100px)]">
                <AgentTopology
                    config={config}
                    fitView
                    interactive
                    onNodeClick={(node) => {
                        console.log('Node clicked:', node);
                    }}
                />
            </div>
        </div>
    );
}
