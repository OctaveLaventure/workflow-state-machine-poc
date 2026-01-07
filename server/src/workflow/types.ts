export type State = string;
export type Event = string;

export interface Context {
  [key: string]: any;
}

export type ConditionValidator<TContext extends Context = Context> = (
  context: TContext
) => boolean | Promise<boolean>;

export type SideEffect<TContext extends Context = Context> = (
  context: TContext
) => void | Promise<void>;

export interface Transition<TContext extends Context = Context> {
  from: State;
  to: State;
  event: Event;
  conditions?: ConditionValidator<TContext>[];
  onTransition?: SideEffect<TContext>[];
}

export interface StateDefinition<TContext extends Context = Context> {
  name: State;
  onEnter?: SideEffect<TContext>[];
  onExit?: SideEffect<TContext>[];
}

export interface MachineDefinition<TContext extends Context = Context> {
  getInitialState(): State;
  getTransition(
    currentState: State,
    event: Event
  ): Transition<TContext> | undefined;
  getStateDefinition(state: State): StateDefinition<TContext> | undefined;
}
