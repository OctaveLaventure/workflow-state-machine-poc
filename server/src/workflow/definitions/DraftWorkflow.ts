import { Draft } from '../../entities/Draft';
import { WorkflowDefinition } from '../WorkflowDefinition';
import { Context } from '../types';

// example of how to define a workflow manually without a schema

// Extend context to include our specific entity
export interface DraftContext extends Context {
  draft: Draft;
}

const draftWorkflow = new WorkflowDefinition<DraftContext>('CREATED');

// Define States
draftWorkflow
  .addState('CREATED', {
    onEnter: [
      (ctx) => console.log(`[Draft ${ctx.draft.id}] Entered CREATED state.`),
    ],
  })
  .addState('IN_REVIEW', {
    onEnter: [
      (ctx) =>
        console.log(`[Draft ${ctx.draft.id}] is now UNDER REVIEW. Alerting editors...`),
    ],
  })
  .addState('APPROVED', {
    onEnter: [
      (ctx) => console.log(`[Draft ${ctx.draft.id}] has been APPROVED!`),
    ],
  })
  .addState('REJECTED', {
    onEnter: [
      (ctx) =>
        console.log(`[Draft ${ctx.draft.id}] was REJECTED. Needs changes.`),
    ],
  });

// Define Transitions
draftWorkflow
  .addTransition('CREATED', 'IN_REVIEW', 'SUBMIT', {
    conditions: [
      (ctx) => {
        const isValid = ctx.draft.content.length > 10;
        if (!isValid) console.log('Validation Failed: Content too short.');
        return isValid;
      },
    ],
  })
  .addTransition('IN_REVIEW', 'APPROVED', 'APPROVE')
  .addTransition('IN_REVIEW', 'REJECTED', 'REJECT')
  .addTransition('REJECTED', 'IN_REVIEW', 'RESUBMIT') // Can resubmit after rejection
  .addTransition('APPROVED', 'CREATED', 'RESET'); // Just for fun/testing

export { draftWorkflow };
