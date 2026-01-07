import { useEffect, useState } from 'react';
import './App.css';
import WorkflowBuilder from './WorkflowBuilder';

interface Draft {
  id: string;
  title: string;
  content: string;
  status: string;
  workflowId?: string;
  allowedEvents?: string[];
}

interface Workflow {
  id: string;
  name: string;
}

function App() {
  const [view, setView] = useState<'drafts' | 'builder'>('drafts');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');

  const fetchDrafts = async () => {
    try {
      const res = await fetch('/api/drafts');
      const data = await res.json();
      setDrafts(data);
    } catch (error) {
      console.error('Failed to fetch drafts', error);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to fetch workflows', error);
    }
  };

  useEffect(() => {
    fetchDrafts();
    fetchWorkflows();
  }, []);

  const createDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    try {
      const payload: { title: string; content: string; workflowId?: string } = { title, content };
      if (selectedWorkflowId) {
        payload.workflowId = selectedWorkflowId;
      }

      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const newDraft = await res.json();
      setDrafts([...drafts, newDraft]);
      setTitle('');
      setContent('');
      setSelectedWorkflowId('');
    } catch (error) {
      console.error('Failed to create draft', error);
    }
  };

  const triggerTransition = async (draftId: string, event: string) => {
    try {
      const res = await fetch(`/api/drafts/${draftId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      const data = await res.json();
      if (data.success) {
        setDrafts(drafts.map((d) => (d.id === draftId ? { ...data.draft, allowedEvents: data.allowedEvents } : d)));
      } else {
        alert(`Transition failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to trigger transition', error);
    }
  };

  return (
    <div className="container">
      <h1>Workflow Demo</h1>

      <div className="tabs">
        <button 
          className={view === 'drafts' ? 'active' : ''} 
          onClick={() => setView('drafts')}
        >
          Manage Drafts
        </button>
        <button 
          className={view === 'builder' ? 'active' : ''} 
          onClick={() => setView('builder')}
        >
          Workflow Builder
        </button>
      </div>

      {view === 'builder' ? (
        <WorkflowBuilder />
      ) : (
        <>
          <div className="card">
            <h2>Create New Draft</h2>
            <form onSubmit={createDraft} className="form">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                placeholder="Content (must be > 10 chars for validation)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <select 
                value={selectedWorkflowId} 
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Default Workflow</option>
                {workflows.map(wf => (
                  <option key={wf.id} value={wf.id}>{wf.name}</option>
                ))}
              </select>
              <button type="submit">Create Draft</button>
            </form>
          </div>

          <div className="drafts-list">
            <h2>Your Drafts</h2>
            {drafts.length === 0 ? <p>No drafts found.</p> : null}
            
            {drafts.map((draft) => (
              <div key={draft.id} className="draft-card">
                <div className="draft-header">
                  <div>
                    <h3 style={{margin: '0 0 5px 0'}}>{draft.title}</h3>
                    <small style={{color: '#888'}}>
                        Workflow: {draft.workflowId ? workflows.find(w => w.id === draft.workflowId)?.name : 'Default'}
                    </small>
                  </div>
                  <span className={`status-badge status-${draft.status}`}>
                    {draft.status}
                  </span>
                </div>
                <p>{draft.content}</p>
                
                <div className="actions">
                  <h4>Actions:</h4>
                  <div className="buttons">
                    {draft.allowedEvents && draft.allowedEvents.length > 0 ? (
                      draft.allowedEvents.map((event) => (
                        <button key={event} onClick={() => triggerTransition(draft.id, event)}>
                          {event}
                        </button>
                      ))
                    ) : (
                      <p>No actions available</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
