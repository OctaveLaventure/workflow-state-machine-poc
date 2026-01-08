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
import Modal from 'react-modal';

import '@xyflow/react/dist/style.css';

// Modal styling
const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #555',
  },
  overlay: {
      backgroundColor: 'rgba(0,0,0,0.5)'
  }
};

Modal.setAppElement('#root');

// Types for Actions
interface ActionConfig {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
  mode: 'sync' | 'async';
}

interface ConditionConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

interface ActionDefinition {
    type: string;
    label: string;
}

const AVAILABLE_ACTIONS: ActionDefinition[] = [
    { type: 'log', label: 'Console Log' },
    { type: 'logDelayed', label: 'Delayed Log (2s)' }
];

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
  
  // Modal State
  const [modalIsOpen, setIsOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{id: string, type: 'node' | 'edge'} | null>(null);
  const [tempActions, setTempActions] = useState<ActionConfig[]>([]);
  const [tempConditions, setTempConditions] = useState<ConditionConfig[]>([]);

  // Open modal when element is clicked
  const onElementClick = (_: React.MouseEvent, element: Node | Edge) => {
      const type = 'source' in element ? 'edge' : 'node';
      setSelectedElement({ id: element.id, type });
      
      const actions = element.data?.actions as ActionConfig[] || [];
      const conditions = element.data?.conditions as ConditionConfig[] || [];
      
      setTempActions(actions);
      setTempConditions(conditions);
      setIsOpen(true);
  };

  const addAction = () => {
      setTempActions([...tempActions, { type: 'log', mode: 'sync', params: { message: 'Hello' } }]);
  };

  const addCondition = () => {
      setTempConditions([...tempConditions, { field: 'draft.title', operator: 'eq', value: '' }]);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateAction = (index: number, field: keyof ActionConfig | 'params.message', value: any) => {
      const newActions = [...tempActions];
      if (field === 'params.message') {
          newActions[index].params = { ...newActions[index].params, message: value };
      } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          newActions[index][field] = value;
      }
      setTempActions(newActions);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateCondition = (index: number, field: keyof ConditionConfig, value: any) => {
      const newConditions = [...tempConditions];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      newConditions[index][field] = value;
      setTempConditions(newConditions);
  };

  const saveConfiguration = () => {
      if (!selectedElement) return;

      if (selectedElement.type === 'node') {
          setNodes((nds) => nds.map(n => 
              n.id === selectedElement.id 
                  ? { ...n, data: { ...n.data, actions: tempActions } } 
                  : n
          ));
      } else {
          setEdges((eds) => eds.map(e => 
              e.id === selectedElement.id 
                  ? { 
                      ...e, 
                      data: { ...e.data, actions: tempActions, conditions: tempConditions }, 
                      label: `${(e.label as string).split(' ')[0]}${tempActions.length ? ' ⚡' : ''}${tempConditions.length ? ' 🔒' : ''}` 
                    } 
                  : e
          ));
      }
      setIsOpen(false);
  };

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

    // Use a simpler 'onEnter' mapping for nodes in this PoC
    // In a real app we would split enter/exit
    const states = nodes.map(n => ({
        name: n.id,
        onEnter: n.data.actions as ActionConfig[] || []
    }));

    const transitions = edges.map(e => ({
      from: e.source,
      to: e.target,
      event: (e.label as string).split(' ')[0] || 'EVENT',
      actions: e.data?.actions as ActionConfig[],
      conditions: e.data?.conditions as ConditionConfig[]
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
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setIsOpen(false)}
        style={customStyles}
        contentLabel="Configure Element"
      >
        <h2>Configure {selectedElement?.type}: {selectedElement?.id}</h2>
        
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <h3>Actions</h3>
            {tempActions.map((action, idx) => (
                <div key={`action-${idx}`} style={{ border: '1px solid #555', padding: '10px', marginBottom: '10px' }}>
                    <div style={{display: 'flex', gap: '5px', marginBottom: '5px'}}>
                      <select 
                          value={action.type} 
                          onChange={(e) => updateAction(idx, 'type', e.target.value)}
                      >
                          {AVAILABLE_ACTIONS.map(opt => <option key={opt.type} value={opt.type}>{opt.label}</option>)}
                      </select>
                      
                      <select 
                          value={action.mode}
                          onChange={(e) => updateAction(idx, 'mode', e.target.value)}
                      >
                          <option value="sync">Sync</option>
                          <option value="async">Async</option>
                      </select>
                   </div>
                    <input 
                        type="text" 
                        value={action.params?.message || ''} 
                        onChange={(e) => updateAction(idx, 'params.message', e.target.value)}
                        placeholder="Log Message" 
                        style={{width: '90%'}}
                    />
                     <button onClick={() => setTempActions(tempActions.filter((_, i) => i !== idx))} style={{float: 'right', padding: '2px 5px'}}>x</button>
                </div>
            ))}
            <button onClick={addAction}>+ Add Action</button>

            {selectedElement?.type === 'edge' && (
                <>
                    <hr style={{margin: '20px 0', borderColor: '#444'}}/>
                    <h3>Conditions (Guards)</h3>
                    {tempConditions.map((cond, idx) => (
                        <div key={`cond-${idx}`} style={{ border: '1px solid #774444', padding: '10px', marginBottom: '10px' }}>
                            <input 
                                type="text" 
                                value={cond.field} 
                                onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                                placeholder="Field (e.g. draft.title)" 
                                style={{marginRight: '5px', width: '120px'}}
                            />
                             <select 
                                value={cond.operator} 
                                onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                                style={{marginRight: '5px'}}
                            >
                                <option value="eq">Equals (=)</option>
                                <option value="neq">Not Equals (!=)</option>
                                <option value="contains">Contains</option>
                                <option value="gt">Greater (&gt;)</option>
                                <option value="lt">Less (&lt;)</option>
                            </select>
                            <input 
                                type="text" 
                                value={cond.value} 
                                onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                                placeholder="Value" 
                                style={{width: '80px'}}
                            />
                             <button onClick={() => setTempConditions(tempConditions.filter((_, i) => i !== idx))} style={{float: 'right', padding: '2px 5px'}}>x</button>
                        </div>
                    ))}
                    <button onClick={addCondition}>+ Add Condition</button>
                </>
            )}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button onClick={saveConfiguration}>Save Configuration</button>
            <button onClick={() => setIsOpen(false)}>Cancel</button>
        </div>
      </Modal>

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
        <span style={{fontSize: '0.8rem', color: '#aaa'}}>Click nodes/edges to configure actions</span>
        <button onClick={saveWorkflow} className="primary">Save Workflow</button>
      </div>
      
      <div style={{ flex: 1, border: '1px solid #555', borderRadius: '8px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onElementClick}
          onEdgeClick={onElementClick}
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
