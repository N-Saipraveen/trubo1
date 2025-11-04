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
  const { graphData, theme } = useStore();
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
          background: node.type === 'table' || node.type === 'collection'
            ? theme === 'dark' ? '#1e293b' : '#f1f5f9'
            : theme === 'dark' ? '#334155' : '#e2e8f0',
          border: '2px solid',
          borderColor: node.type === 'table' || node.type === 'collection'
            ? theme === 'dark' ? '#3b82f6' : '#2563eb'
            : theme === 'dark' ? '#64748b' : '#94a3b8',
          borderRadius: '8px',
          padding: '0',
          minWidth: '150px',
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
        color: theme === 'dark' ? '#64748b' : '#94a3b8',
      },
      style: {
        stroke: theme === 'dark' ? '#64748b' : '#94a3b8',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: theme === 'dark' ? '#e2e8f0' : '#1e293b',
        fontSize: 12,
      },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [graphData, theme, setNodes, setEdges]);

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
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle>Schema Visualization</CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-80px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className={theme === 'dark' ? 'dark' : 'light'}
        >
          <Controls />
          <Background />
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
