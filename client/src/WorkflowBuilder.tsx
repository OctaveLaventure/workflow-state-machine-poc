import type { Connection, Edge, Node } from '@xyflow/react';
import {
    addEdge,
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    ReactFlow,
    useEdgesState,
    useNodesState
} from '@xyflow/react';
import { useCallback, useState } from 'react';

import '@xyflow/react/dist/style.css';

const initialNodes: Node[] = [
  { id: 'CREATED', position: { x: 0, y: 0 }, data: { label: 'CREATED' }, type: 'input' },
  { id: 'IN_REVIEW', position: { x: 0, y: 100 }, data: { label: 'IN_REVIEW' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'CREATED', target: 'IN_REVIEW', label: 'SUBMIT' },
];

export default function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeName, setNodeName] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, label: edgeLabel || 'Transition' }, eds)),
    [setEdges, edgeLabel]
  );

  const addNode = () => {
    if (!nodeName) return;
    const newNode: Node = {
      id: nodeName.toUpperCase(),
      data: { label: nodeName },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeName('');
  };

  const saveWorkflow = async () => {
    const workflowName = prompt('Enter a name for this workflow:', 'My Custom Workflow');
    if (!workflowName) return;

    const states = nodes.map(n => n.id);
    const transitions = edges.map(e => ({
      from: e.source,
      to: e.target,
      event: e.label || 'EVENT'
    }));

    const definition = {
      name: workflowName,
      initialState: nodes.find(n => n.type === 'input')?.id || nodes[0]?.id,
      states,
      transitions
    };

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(definition),
      });
      const data = await res.json();
      alert(`Workflow saved! ID: ${data.id}`);
    } catch (error) {
      console.error('Failed to save workflow', error);
      alert('Failed to save workflow');
    }
  };

  return (
    <div style={{ width: '100%', height: '600px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="toolbar">
        <input 
          placeholder="New State Name" 
          value={nodeName} 
          onChange={(e) => setNodeName(e.target.value)} 
        />
        <button onClick={addNode}>Add State</button>
        <span style={{width: '20px'}}></span>
        <input 
          placeholder="Next Transition Label" 
          value={edgeLabel} 
          onChange={(e) => setEdgeLabel(e.target.value)} 
        />
        <span style={{fontSize: '0.8rem'}}>(Set before connecting)</span>
        <span style={{flex: 1}}></span>
        <button onClick={saveWorkflow} className="primary">Save Workflow</button>
      </div>
      
      <div style={{ flex: 1, border: '1px solid #555', borderRadius: '8px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
