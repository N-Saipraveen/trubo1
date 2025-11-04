import { useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useStore } from '@/store/useStore';

const nodeTypes = {
  // You can define custom node types here
};

export function SchemaVisualizer() {
  const { graphData } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!graphData || !graphData.nodes || !graphData.edges) {
      return;
    }

    // Convert graph data to ReactFlow format
    const flowNodes: Node[] = graphData.nodes.map((node: any, index: number) => {
      const position = calculateNodePosition(index, graphData.nodes.length);

      return {
        id: node.id,
        type: 'default',
        position,
        data: {
          label: (
            <div className="px-4 py-2">
              <div className="font-semibold">{node.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{node.type}</div>
            </div>
          )
        },
        style: {
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '2px solid',
          borderColor: node.type === 'table' || node.type === 'collection'
            ? '#3b82f6'
            : '#94a3b8',
          borderRadius: '16px',
          padding: '0',
          minWidth: '180px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
        },
      };
    });

    const flowEdges: Edge[] = graphData.edges.map((edge: any) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type === 'nested' ? 'step' : 'smoothstep',
      animated: edge.type === 'reference',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#3b82f6',
      },
      style: {
        stroke: edge.type === 'reference' ? '#8b5cf6' : '#3b82f6',
        strokeWidth: 2.5,
      },
      labelStyle: {
        fill: '#1e293b',
        fontSize: 12,
        fontWeight: 600,
      },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [graphData, setNodes, setEdges]);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schema Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No schema data to visualize. Convert a schema first.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] glass-card border-2 border-white/40">
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Schema Visualization
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-80px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className="rounded-b-2xl"
        >
          <Controls className="glass-card" />
          <Background color="#e0e7ff" gap={16} />
        </ReactFlow>
      </CardContent>
    </Card>
  );
}

function calculateNodePosition(index: number, total: number): { x: number; y: number } {
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;

  return {
    x: col * 250,
    y: row * 150,
  };
}
