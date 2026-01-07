import express from 'express';
import { createDraft, Draft, drafts } from './entities/Draft';
import { saveWorkflowSchema, WorkflowSchema, workflowSchemas } from './entities/WorkflowSchema';
import { WorkflowDefinition } from './workflow/WorkflowDefinition';
import { WorkflowInstance } from './workflow/WorkflowInstance';
import { DraftContext, draftWorkflow } from './workflow/definitions/DraftWorkflow';

const app = express();
const port = 3000;

app.use(express.json());

const buildWorkflowFromSchema = (schema: WorkflowSchema): WorkflowDefinition<DraftContext> => {
  const definition = new WorkflowDefinition<DraftContext>(schema.initialState);
  schema.states.forEach((state) => definition.addState(state));
  schema.transitions.forEach((t) => definition.addTransition(t.from, t.to, t.event));
  return definition;
};

// Helper to rehydrate workflow instance from an entity
const getWorkflowForDraft = (draft: Draft): WorkflowInstance<DraftContext> => {
  const context: DraftContext = { draft };
  
  let definition = draftWorkflow;
  if (draft.workflowId) {
    const schema = workflowSchemas.get(draft.workflowId);
    if (schema) {
      definition = buildWorkflowFromSchema(schema);
    }
  }

  // We initialize the workflow with the draft's current status
  return new WorkflowInstance(definition, draft.status, context);
};

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
  
  const workflow = getWorkflowForDraft(draft);
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
    const workflow = getWorkflowForDraft(draft);
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

  const workflow = getWorkflowForDraft(draft);
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
  const workflow = getWorkflowForDraft(draft);
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
