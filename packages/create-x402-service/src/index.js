#!/usr/bin/env node
import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import validatePackageName from 'validate-npm-package-name';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const program = new Command();
program
    .name('create-x402-service')
    .description('Create a new x402 service with best practices')
    .version('1.0.0')
    .argument('[project-name]', 'Name of the project')
    .option('-t, --template <template>', 'Template to use (express, fastify, nextjs)')
    .option('--no-install', 'Skip dependency installation')
    .option('--no-git', 'Skip git initialization')
    .action(async (projectName, options) => {
    console.log(chalk.bold.cyan('\n🚀 Create x402 Service\n'));
    let config;
    if (projectName && options.template) {
        const validation = validatePackageName(projectName);
        if (!validation.validForNewPackages) {
            console.error(chalk.red('Invalid project name:'), validation.errors?.join(', '));
            process.exit(1);
        }
        config = {
            name: projectName,
            template: options.template,
            typescript: true,
            installDeps: options.install !== false,
            initGit: options.git !== false,
            examples: true,
        };
    }
    else {
        const answers = await prompts([
            {
                type: 'text',
                name: 'name',
                message: 'Project name:',
                initial: projectName || 'my-x402-service',
                validate: (value) => {
                    const validation = validatePackageName(value);
                    if (!validation.validForNewPackages) {
                        return validation.errors?.[0] || 'Invalid package name';
                    }
                    return true;
                },
            },
            {
                type: 'select',
                name: 'template',
                message: 'Select a template:',
                choices: [
                    { title: 'Express (Node.js HTTP server)', value: 'express' },
                    { title: 'Fastify (High-performance server)', value: 'fastify' },
                    { title: 'Next.js (Full-stack React)', value: 'nextjs' },
                ],
            },
            {
                type: 'confirm',
                name: 'typescript',
                message: 'Use TypeScript?',
                initial: true,
            },
            {
                type: 'confirm',
                name: 'examples',
                message: 'Include example endpoints?',
                initial: true,
            },
            {
                type: 'confirm',
                name: 'installDeps',
                message: 'Install dependencies?',
                initial: true,
            },
            {
                type: 'confirm',
                name: 'initGit',
                message: 'Initialize git repository?',
                initial: true,
            },
        ]);
        if (!answers.name) {
            console.log(chalk.yellow('\nProject creation cancelled'));
            process.exit(0);
        }
        config = answers;
    }
    await createProject(config);
});
async function createProject(config) {
    const targetDir = path.join(process.cwd(), config.name);
    if (fs.existsSync(targetDir)) {
        console.error(chalk.red(`\nDirectory ${config.name} already exists`));
        process.exit(1);
    }
    const spinner = ora('Creating project structure').start();
    try {
        fs.mkdirSync(targetDir, { recursive: true });
        const templateDir = path.join(__dirname, '..', 'templates', config.template);
        if (!fs.existsSync(templateDir)) {
            throw new Error(`Template ${config.template} not found`);
        }
        fs.copySync(templateDir, targetDir);
        const packageJsonPath = path.join(targetDir, 'package.json');
        const packageJson = fs.readJsonSync(packageJsonPath);
        packageJson.name = config.name;
        fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
        if (!config.examples) {
            const examplesPath = path.join(targetDir, 'src', 'examples');
            if (fs.existsSync(examplesPath)) {
                fs.removeSync(examplesPath);
            }
        }
        spinner.succeed('Project structure created');
        if (config.installDeps) {
            spinner.start('Installing dependencies');
            try {
                execSync('npm install', {
                    cwd: targetDir,
                    stdio: 'ignore',
                });
                spinner.succeed('Dependencies installed');
            }
            catch (error) {
                spinner.fail('Failed to install dependencies');
                console.log(chalk.yellow('Run npm install manually'));
            }
        }
        if (config.initGit) {
            spinner.start('Initializing git repository');
            try {
                execSync('git init', {
                    cwd: targetDir,
                    stdio: 'ignore',
                });
                execSync('git add -A', {
                    cwd: targetDir,
                    stdio: 'ignore',
                });
                execSync('git commit -m "Initial commit from create-x402-service"', {
                    cwd: targetDir,
                    stdio: 'ignore',
                });
                spinner.succeed('Git repository initialized');
            }
            catch (error) {
                spinner.warn('Git initialization skipped');
            }
        }
        console.log(chalk.green.bold('\n✨ Success! Created'), chalk.cyan(config.name));
        console.log(chalk.gray(`\nInside that directory, you can run:\n`));
        console.log(chalk.cyan('  npm run dev'));
        console.log('    Start development server\n');
        console.log(chalk.cyan('  npm run build'));
        console.log('    Build for production\n');
        console.log(chalk.cyan('  npm start'));
        console.log('    Start production server\n');
        console.log(chalk.gray('We suggest that you begin by typing:\n'));
        console.log(chalk.cyan(`  cd ${config.name}`));
        console.log(chalk.cyan('  npm run dev\n'));
        console.log(chalk.gray('Documentation: https://docs.x402.network'));
        console.log(chalk.gray('GitHub: https://github.com/x402-upl/x402\n'));
    }
    catch (error) {
        spinner.fail('Project creation failed');
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
}
program.parse();
//# sourceMappingURL=index.js.map