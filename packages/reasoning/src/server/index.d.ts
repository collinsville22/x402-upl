import { WorkflowManager } from '../core/workflow-manager.js';
declare module 'fastify' {
    interface FastifyInstance {
        workflowManager: WorkflowManager;
    }
}
//# sourceMappingURL=index.d.ts.map