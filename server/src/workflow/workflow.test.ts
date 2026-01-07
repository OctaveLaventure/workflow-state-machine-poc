import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowDefinition } from './WorkflowDefinition';
import { WorkflowInstance } from './WorkflowInstance';
import { Context } from './types';

// Define a test context
interface TestEntity {
  id: string;
  value: number;
}

interface TestContext extends Context {
  entity: TestEntity;
}

describe('Workflow Engine', () => {
  let definition: WorkflowDefinition<TestContext>;
  let entity: TestEntity;
  let context: TestContext;

  // Mock side effects
  const onEnterReview = vi.fn();
  const onExitCreated = vi.fn();
  const onTransitionToPublished = vi.fn();

  beforeEach(() => {
    // Reset mocks
    onEnterReview.mockClear();
    onExitCreated.mockClear();
    onTransitionToPublished.mockClear();

    // 1. Setup Definition
    definition = new WorkflowDefinition<TestContext>('CREATED');

    definition
      .addState('CREATED', {
        onExit: [async () => onExitCreated()],
      })
      .addState('IN_REVIEW', {
        onEnter: [async () => onEnterReview()],
      })
      .addState('PUBLISHED')
      .addState('ARCHIVED');

    // Mapped transitions:
    // CREATED -> IN_REVIEW (requires value > 0)
    // IN_REVIEW -> PUBLISHED
    // IN_REVIEW -> CREATED (Reject)
    // PUBLISHED -> ARCHIVED

    definition.addTransition('CREATED', 'IN_REVIEW', 'SUBMIT', {
      conditions: [
        (ctx) => ctx.entity.value > 0
      ]
    });

    definition.addTransition('IN_REVIEW', 'PUBLISHED', 'APPROVE', {
      onTransition: [async () => onTransitionToPublished()]
    });

    definition.addTransition('IN_REVIEW', 'CREATED', 'REJECT');
    
    // 2. Setup Context
    entity = { id: '123', value: 10 };
    context = { entity };
  });

  it('should initialize with the initial state', () => {
    const workflow = new WorkflowInstance(definition, undefined, context);
    expect(workflow.getCurrentState()).toBe('CREATED');
  });

  it('should transition successfully when conditions are met', async () => {
    const workflow = new WorkflowInstance(definition, 'CREATED', context);
    
    const result = await workflow.trigger('SUBMIT');
    
    expect(result).toBe(true);
    expect(workflow.getCurrentState()).toBe('IN_REVIEW');
    
    // Check side effects
    expect(onExitCreated).toHaveBeenCalled();
    expect(onEnterReview).toHaveBeenCalled();
  });

  it('should block transition when conditions are NOT met', async () => {
    // Set invalid value
    context.entity.value = 0;
    const workflow = new WorkflowInstance(definition, 'CREATED', context);
    
    const result = await workflow.trigger('SUBMIT');
    
    expect(result).toBe(false);
    expect(workflow.getCurrentState()).toBe('CREATED'); // Should remain
    expect(onExitCreated).not.toHaveBeenCalled();
    expect(onEnterReview).not.toHaveBeenCalled();
  });

  it('should fail when no transition matches the event', async () => {
    const workflow = new WorkflowInstance(definition, 'CREATED', context);
    
    const result = await workflow.trigger('UNKNOWN_EVENT');
    
    expect(result).toBe(false);
    expect(workflow.getCurrentState()).toBe('CREATED');
  });

  it('should execute transition side effects', async () => {
    const workflow = new WorkflowInstance(definition, 'IN_REVIEW', context);
    
    const result = await workflow.trigger('APPROVE');
    
    expect(result).toBe(true);
    expect(workflow.getCurrentState()).toBe('PUBLISHED');
    expect(onTransitionToPublished).toHaveBeenCalled();
  });

  it('should handle cycles (rejection loops)', async () => {
    const workflow = new WorkflowInstance(definition, 'IN_REVIEW', context);
    
    // Reject back to CREATED
    await workflow.trigger('REJECT');
    expect(workflow.getCurrentState()).toBe('CREATED');
    
    // Fix and Resubmit
    context.entity.value = 5;
    await workflow.trigger('SUBMIT');
    expect(workflow.getCurrentState()).toBe('IN_REVIEW');
  });
});
