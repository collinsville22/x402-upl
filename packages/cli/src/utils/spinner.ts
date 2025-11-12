import ora, { Ora } from 'ora';
import chalk from 'chalk';

let currentSpinner: Ora | null = null;

export function startSpinner(text: string): Ora {
  if (currentSpinner) {
    currentSpinner.stop();
  }

  currentSpinner = ora({
    text,
    color: 'cyan',
  }).start();

  return currentSpinner;
}

export function succeedSpinner(text: string): void {
  if (currentSpinner) {
    currentSpinner.succeed(text);
    currentSpinner = null;
  }
}

export function failSpinner(text: string): void {
  if (currentSpinner) {
    currentSpinner.fail(text);
    currentSpinner = null;
  }
}

export function stopSpinner(): void {
  if (currentSpinner) {
    currentSpinner.stop();
    currentSpinner = null;
  }
}

export function logSuccess(message: string): void {
  stopSpinner();
}

export function logError(message: string): void {
  stopSpinner();
}

export function logInfo(message: string): void {
  stopSpinner();
}

export function logWarning(message: string): void {
  stopSpinner();
}
