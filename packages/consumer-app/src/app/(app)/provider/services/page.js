'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServicesPage;
const link_1 = __importDefault(require("next/link"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
function ServicesPage() {
    return (<div className="space-y-6">
      <div className="flex items-center justify-between border-b border-x402-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">My Services</h1>
          <p className="mt-1 text-x402-text-secondary">
            Manage your registered services
          </p>
        </div>
        <link_1.default href="/provider/services/new">
          <Button_1.Button variant="primary">Register New Service</Button_1.Button>
        </link_1.default>
      </div>

      <Card_1.Card className="p-12">
        <div className="text-center">
          <p className="text-lg font-medium text-white">No services registered yet</p>
          <p className="mt-1 text-sm text-x402-text-tertiary">
            Register your first service to start earning
          </p>
        </div>
      </Card_1.Card>
    </div>);
}
//# sourceMappingURL=page.js.map