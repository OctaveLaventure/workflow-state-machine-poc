import { StateMachine } from './StateMachine';
import { Context } from './types';

export class WorkflowInstance<TContext extends Context = Context> extends StateMachine<TContext> {
}
