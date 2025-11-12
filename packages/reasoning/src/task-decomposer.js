"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDecomposer = void 0;
class TaskDecomposer {
    async decompose(taskDescription) {
        const tasks = this.analyzeTask(taskDescription);
        const steps = await this.tasksToSteps(tasks);
        const optimizedSteps = this.optimizeExecution(steps);
        const totalCost = optimizedSteps.reduce((sum, step) => sum + step.estimatedCost, 0);
        const totalTime = this.calculateTotalTime(optimizedSteps);
        const graph = this.buildExecutionGraph(optimizedSteps);
        const criticalPath = this.findCriticalPath(optimizedSteps);
        return {
            steps: optimizedSteps,
            totalEstimatedCost: totalCost,
            totalEstimatedTime: totalTime,
            executionGraph: graph,
            criticalPath,
        };
    }
    analyzeTask(description) {
        const keywords = this.extractKeywords(description);
        const tasks = [];
        if (keywords.includes('data') || keywords.includes('blockchain')) {
            tasks.push({
                id: 'task_data',
                description: 'Fetch blockchain data',
                requiredCapabilities: ['blockchain-data', 'historical-data'],
                priority: 1,
                dependencies: [],
                estimatedCost: 0.05,
                estimatedTime: 2000,
            });
        }
        if (keywords.includes('analyze') || keywords.includes('research')) {
            tasks.push({
                id: 'task_analyze',
                description: 'Perform analysis',
                requiredCapabilities: ['ai-analysis', 'research'],
                priority: 2,
                dependencies: keywords.includes('data') ? ['task_data'] : [],
                estimatedCost: 2.5,
                estimatedTime: 5000,
            });
        }
        if (keywords.includes('compute') || keywords.includes('predict')) {
            tasks.push({
                id: 'task_compute',
                description: 'Run computational model',
                requiredCapabilities: ['distributed-compute', 'prediction'],
                priority: 2,
                dependencies: keywords.includes('data') ? ['task_data'] : [],
                estimatedCost: 1.2,
                estimatedTime: 8000,
            });
        }
        if (keywords.includes('generate') || keywords.includes('create') || keywords.includes('presentation')) {
            tasks.push({
                id: 'task_generate',
                description: 'Generate output',
                requiredCapabilities: ['content-generation', 'llm'],
                priority: 3,
                dependencies: tasks.length > 0 ? tasks.map(t => t.id) : [],
                estimatedCost: 0.12,
                estimatedTime: 3000,
            });
        }
        return tasks;
    }
    extractKeywords(text) {
        const lowercaseText = text.toLowerCase();
        const keywords = [];
        const keywordMap = {
            data: ['data', 'blockchain', 'historical', 'dex', 'solana'],
            analyze: ['analyze', 'analysis', 'research', 'study', 'investigate'],
            compute: ['compute', 'calculate', 'predict', 'model', 'forecast'],
            generate: ['generate', 'create', 'make', 'produce', 'build', 'presentation'],
        };
        for (const [category, terms] of Object.entries(keywordMap)) {
            if (terms.some(term => lowercaseText.includes(term))) {
                keywords.push(category);
            }
        }
        return keywords;
    }
    async tasksToSteps(tasks) {
        const steps = [];
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            steps.push({
                id: `step_${i + 1}`,
                action: task.description,
                params: {},
                estimatedCost: task.estimatedCost || 0,
                estimatedTime: task.estimatedTime || 0,
                dependencies: task.dependencies,
                parallelizable: task.dependencies.length === 0 || this.canParallelize(task, tasks),
                outputKey: `output_${i + 1}`,
            });
        }
        return steps;
    }
    canParallelize(task, allTasks) {
        const dependencyTasks = allTasks.filter(t => task.dependencies.includes(t.id));
        if (dependencyTasks.length === 0) {
            return true;
        }
        const samePriority = allTasks.filter(t => t.priority === task.priority && !task.dependencies.includes(t.id));
        return samePriority.length > 0;
    }
    optimizeExecution(steps) {
        const optimized = [...steps];
        for (let i = 0; i < optimized.length; i++) {
            const step = optimized[i];
            const dependencySteps = step.dependencies
                .map(depId => optimized.find(s => s.id === depId))
                .filter((s) => s !== undefined);
            if (dependencySteps.length > 0) {
                const latestDependency = Math.max(...dependencySteps.map(s => s.estimatedTime));
                step.estimatedTime = Math.max(step.estimatedTime, latestDependency);
            }
        }
        return optimized;
    }
    calculateTotalTime(steps) {
        const levelTimes = new Map();
        const calculateLevel = (step, visited = new Set()) => {
            if (visited.has(step.id))
                return 0;
            visited.add(step.id);
            if (step.dependencies.length === 0)
                return 0;
            const dependencyLevels = step.dependencies
                .map(depId => steps.find(s => s.id === depId))
                .filter((s) => s !== undefined)
                .map(s => calculateLevel(s, visited));
            return Math.max(...dependencyLevels, 0) + 1;
        };
        for (const step of steps) {
            const level = calculateLevel(step);
            const currentTime = levelTimes.get(level) || 0;
            levelTimes.set(level, Math.max(currentTime, step.estimatedTime));
        }
        return Array.from(levelTimes.values()).reduce((sum, time) => sum + time, 0);
    }
    buildExecutionGraph(steps) {
        const graph = [];
        for (const step of steps) {
            if (step.dependencies.length === 0) {
                graph.push(step.id);
            }
            else {
                const deps = step.dependencies.join(' || ');
                graph.push(`(${deps}) → ${step.id}`);
            }
        }
        return graph.join(' → ');
    }
    findCriticalPath(steps) {
        const endSteps = steps.filter(step => !steps.some(s => s.dependencies.includes(step.id)));
        if (endSteps.length === 0)
            return [];
        let longestPath = [];
        let maxTime = 0;
        for (const endStep of endSteps) {
            const path = this.findLongestPath(endStep, steps);
            const pathTime = path.reduce((sum, stepId) => {
                const step = steps.find(s => s.id === stepId);
                return sum + (step?.estimatedTime || 0);
            }, 0);
            if (pathTime > maxTime) {
                maxTime = pathTime;
                longestPath = path;
            }
        }
        return longestPath;
    }
    findLongestPath(step, allSteps) {
        if (step.dependencies.length === 0) {
            return [step.id];
        }
        let longestDependencyPath = [];
        let maxLength = 0;
        for (const depId of step.dependencies) {
            const depStep = allSteps.find(s => s.id === depId);
            if (!depStep)
                continue;
            const path = this.findLongestPath(depStep, allSteps);
            if (path.length > maxLength) {
                maxLength = path.length;
                longestDependencyPath = path;
            }
        }
        return [...longestDependencyPath, step.id];
    }
}
exports.TaskDecomposer = TaskDecomposer;
//# sourceMappingURL=task-decomposer.js.map