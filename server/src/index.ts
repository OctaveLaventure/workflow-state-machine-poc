import express from 'express';
import { createDraft, Draft, drafts } from './entities/Draft';
import { WorkflowInstance } from './workflow/WorkflowInstance';
import { DraftContext, draftWorkflow } from './workflow/definitions/DraftWorkflow';

const app = express();
const port = 3000;

app.use(express.json());

// Helper to rehydrate workflow instance from an entity
const getWorkflowForDraft = (draft: Draft): WorkflowInstance<DraftContext> => {
  const context: DraftContext = { draft };
  // We initialize the workflow with the draft's current status
  return new WorkflowInstance(draftWorkflow, draft.status, context);
};

// API Endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.send('Health Check OK');
});

// Create a new draft
app.post('/api/drafts', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    res.status(400).send({ error: 'Title and content are required' });
    return;
  }
  const draft = createDraft(title, content);
  res.send(draft);
});

// List all drafts
app.get('/api/drafts', (req, res) => {
  res.send(Array.from(drafts.values()));
});

// Get a draft state
app.get('/api/drafts/:id', (req, res) => {
  const draft = drafts.get(req.params.id);
  if (!draft) {
    res.status(404).send({ error: 'Draft not found' });
    return;
  }
  res.send(draft);
});

// Trigger a workflow event
app.post('/api/drafts/:id/transition', async (req, res) => {
  const { event } = req.body;
  const draft = drafts.get(req.params.id);
  
  if (!draft) {
    res.status(404).send({ error: 'Draft not found' });
    return;
  }

  if (!event) {
    res.status(400).send({ error: 'Event is required' });
    return;
  }




  // the interesting part:
  const workflow = getWorkflowForDraft(draft);
  const success = await workflow.trigger(event);
  //




  if (success) {
    // Persist the new state back to the entity
    draft.status = workflow.getCurrentState();
    res.send({ success: true, draft });
  } else {
    res.status(400).send({ success: false, message: 'Transition invalid or conditions failed', currentStatus: draft.status });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
