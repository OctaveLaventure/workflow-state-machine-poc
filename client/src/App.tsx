import { useEffect, useState } from 'react';
import './App.css';

interface Draft {
  id: string;
  title: string;
  content: string;
  status: string;
}

function App() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const fetchDrafts = async () => {
    try {
      const res = await fetch('/api/drafts');
      const data = await res.json();
      setDrafts(data);
    } catch (error) {
      console.error('Failed to fetch drafts', error);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const createDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const newDraft = await res.json();
      setDrafts([...drafts, newDraft]);
      setTitle('');
      setContent('');
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
        setDrafts(drafts.map((d) => (d.id === draftId ? data.draft : d)));
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
          <button type="submit">Create Draft</button>
        </form>
      </div>

      <div className="drafts-list">
        <h2>Your Drafts</h2>
        {drafts.length === 0 ? <p>No drafts found.</p> : null}
        
        {drafts.map((draft) => (
          <div key={draft.id} className="draft-card">
            <div className="draft-header">
              <h3>{draft.title}</h3>
              <span className={`status-badge status-${draft.status}`}>
                {draft.status}
              </span>
            </div>
            <p>{draft.content}</p>
            
            <div className="actions">
              <h4>Actions:</h4>
              <div className="buttons">
                {/* 
                  Hardcoded actions based on the workflow definition. 
                  In a real app, we might ask the backend for "available transitions".
                */}
                <button onClick={() => triggerTransition(draft.id, 'SUBMIT')}>
                  Submit for Review
                </button>
                <button onClick={() => triggerTransition(draft.id, 'APPROVE')}>
                  Approve
                </button>
                <button onClick={() => triggerTransition(draft.id, 'REJECT')}>
                  Reject
                </button>
                <button onClick={() => triggerTransition(draft.id, 'RESUBMIT')}>
                  Resubmit
                </button>
                <button onClick={() => triggerTransition(draft.id, 'RESET')}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
