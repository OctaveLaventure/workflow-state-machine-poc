import express from 'express';
import { createDraft, drafts } from './entities/Draft';
import { saveWorkflowSchema, workflowSchemas } from './entities/WorkflowSchema';
import { WorkflowFactory } from './workflow/WorkflowFactory';
import { DraftContext, draftWorkflow } from './workflow/definitions/DraftWorkflow';

const app = express();
const port = 3000;

app.use(express.json());

// API Endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.send('Health Check OK');
});

// Create a new draft
app.post('/api/drafts', (req, res) => {
  const { title, content, workflowId } = req.body;
  if (!title || !content) {
    res.status(400).send({ error: 'Title and content are required' });
    return;
  }

  let initialStatus = 'CREATED';
  if (workflowId) {  
    const schema = workflowSchemas.get(workflowId);
    if (!schema) {
      res.status(400).send({ error: 'Invalid workflow ID' });
      return;
    }
    initialStatus = schema.initialState;
  }

  const draft = createDraft(title, content, workflowId, initialStatus);
  
  const ctx: DraftContext = { draft };
  const schema = workflowId ? workflowSchemas.get(workflowId) : undefined;
  
  const workflow = WorkflowFactory.createInstance(schema, draftWorkflow, draft.status, ctx);
  const allowedEvents = workflow.getAvailableEvents();

  res.send({ ...draft, allowedEvents });
});

// Save a new workflow definition
app.post('/api/workflows', (req, res) => {
  const { name, initialState, states, transitions } = req.body;
  
  if (!name || !initialState || !states || !transitions) {
    res.status(400).send({ error: 'Invalid workflow definition' });
    return;
  }

  const schema = saveWorkflowSchema({
    name,
    initialState,
    states,
    transitions
  });
  
  console.log(`Saved workflow schema: ${schema.id} (${schema.name})`);
  res.send(schema);
});

// List all workflows
app.get('/api/workflows', (req, res) => {
  res.send(Array.from(workflowSchemas.values()));
});

// List all drafts
app.get('/api/drafts', (req, res) => {
  const allDrafts = Array.from(drafts.values()).map(draft => {
    const ctx: DraftContext = { draft };
    const schema = draft.workflowId ? workflowSchemas.get(draft.workflowId) : undefined;
    const workflow = WorkflowFactory.createInstance(schema, draftWorkflow, draft.status, ctx);
    return {
      ...draft,
      allowedEvents: workflow.getAvailableEvents()
    };
  });
  res.send(allDrafts);
});

// Get a draft state
app.get('/api/drafts/:id', (req, res) => {
  const draft = drafts.get(req.params.id);
  if (!draft) {
    res.status(404).send({ error: 'Draft not found' });
    return;
  }

  const ctx: DraftContext = { draft };
  const schema = draft.workflowId ? workflowSchemas.get(draft.workflowId) : undefined;
  const workflow = WorkflowFactory.createInstance(schema, draftWorkflow, draft.status, ctx);
  const allowedEvents = workflow.getAvailableEvents();

  res.send({ ...draft, allowedEvents });
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
  const ctx: DraftContext = { draft };
  const schema = draft.workflowId ? workflowSchemas.get(draft.workflowId) : undefined;
  const workflow = WorkflowFactory.createInstance(schema, draftWorkflow, draft.status, ctx);
  const success = await workflow.trigger(event);

  if (success) {
    // Persist the new state back to the entity
    draft.status = workflow.getCurrentState();
    const allowedEvents = workflow.getAvailableEvents();
    res.send({ success: true, draft, allowedEvents });
  } else {
    res.status(400).send({ success: false, message: 'Transition invalid or conditions failed', currentStatus: draft.status });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
