"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTool = void 0;
class BaseTool {
    name;
    description;
    parameters;
    required;
    constructor(definition) {
        this.name = definition.name;
        this.description = definition.description;
        this.parameters = definition.parameters;
        this.required = definition.required || [];
    }
    validateArgs(args) {
        for (const requiredParam of this.required) {
            if (!(requiredParam in args)) {
                throw new Error(`Missing required parameter: ${requiredParam}`);
            }
        }
        for (const [param, value] of Object.entries(args)) {
            if (!(param in this.parameters)) {
                throw new Error(`Unknown parameter: ${param}`);
            }
            const paramDef = this.parameters[param];
            if (paramDef.type && typeof value !== paramDef.type && value !== null && value !== undefined) {
                throw new Error(`Invalid type for parameter ${param}: expected ${paramDef.type}, got ${typeof value}`);
            }
        }
    }
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            parameters: this.parameters,
            required: this.required,
        };
    }
}
exports.BaseTool = BaseTool;
//# sourceMappingURL=base.js.map