import { beforeEach, describe, expect, it } from 'vitest';
import { WorkflowSchema } from '../entities/WorkflowSchema';
import { ActionRegistry } from './ActionRegistry';
import { Context } from './types';
import { WorkflowFactory } from './WorkflowFactory';

describe('Workflow Execution Order', () => {
    // Basic context for testing
    interface TestContext extends Context {
        data: string;
        logs: string[];
    }

    const testSchema: WorkflowSchema = {
        id: 'test-schema',
        name: 'Test Workflow',
        initialState: 'START',
        states: [
            {
                name: 'START',
                onExit: [
                    { type: 'testLog', mode: 'sync', params: { msg: 'Exiting Start' } }
                ]
            },
            {
                name: 'END',
                onEnter: [
                    { type: 'testLog', mode: 'sync', params: { msg: 'Entering End' } }
                ]
            }
        ],
        transitions: [
            {
                from: 'START',
                to: 'END',
                event: 'NEXT',
                conditions: [
                    { field: 'data', operator: 'eq', value: 'valid' }
                ],
                actions: [
                    { type: 'testLog', mode: 'sync', params: { msg: 'Transition Action' } }
                ]
            }
        ]
    };

    beforeEach(() => {
        // Reset and mock the registry for each test
        ActionRegistry['testLog'] = (ctx: any, params: any) => {
            ctx.logs.push(params.msg);
        };
    });

    it('should execute hooks in strict order: exit -> transition -> enter', async () => {
        const context: TestContext = { data: 'valid', logs: [] };
        
        // Create instance
        const workflow = WorkflowFactory.createInstance<TestContext>(
            testSchema,
            undefined,
            'START',
            context
        );

        // Verify initial state
        expect(workflow.getCurrentState()).toBe('START');

        // Trigger transition
        const success = await workflow.trigger('NEXT');

        expect(success).toBe(true);
        expect(workflow.getCurrentState()).toBe('END');

        // Verify strict order:
        // 1. Exit Action from START
        // 2. Transition Action
        // 3. Enter Action from END
        expect(context.logs).toEqual([
            'Exiting Start',
            'Transition Action',
            'Entering End'
        ]);
    });

    it('should block transition if condition fails', async () => {
        const context: TestContext = { data: 'invalid', logs: [] };
        
        const workflow = WorkflowFactory.createInstance<TestContext>(
            testSchema,
            undefined,
            'START',
            context
        );

        const success = await workflow.trigger('NEXT');

        expect(success).toBe(false);
        expect(workflow.getCurrentState()).toBe('START');
        // No logs should be written because transition was blocked
        expect(context.logs).toEqual([]);
    });

    it('should handle async actions without blocking', async () => {
        const asyncSchema: WorkflowSchema = {
            ...testSchema,
            transitions: [
                {
                    from: 'START',
                    to: 'END',
                    event: 'NEXT_ASYNC',
                    actions: [
                        { type: 'testLog', mode: 'sync', params: { msg: 'Sync Action' } },
                        { type: 'testLogAsync', mode: 'async', params: { msg: 'Async Action' } }
                    ]
                }
            ]
        };

        // We use a promise to detect when the async action actually runs
        let asyncResolver: () => void;
        const asyncPromise = new Promise<void>(resolve => asyncResolver = resolve);

        ActionRegistry['testLogAsync'] = async (ctx: any, params: any) => {
           // Simulate delay
           await new Promise(r => setTimeout(r, 10)); 
           ctx.logs.push(params.msg);
           asyncResolver();
        };

        const context: TestContext = { data: 'valid', logs: [] };
        const workflow = WorkflowFactory.createInstance(asyncSchema, undefined, 'START', context);

        await workflow.trigger('NEXT_ASYNC');
        
        // Immediately after trigger, sync actions should be done, but async might not be
        expect(context.logs).toContain('Sync Action');
        expect(workflow.getCurrentState()).toBe('END');

        // Wait for async to finish
        await asyncPromise;
        expect(context.logs).toContain('Async Action');
    });
});
