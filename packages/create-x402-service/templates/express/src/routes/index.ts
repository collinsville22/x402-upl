import { Express } from 'express';
import { exampleRoutes } from './examples.js';

export function registerRoutes(app: Express): void {
  exampleRoutes(app);
}
