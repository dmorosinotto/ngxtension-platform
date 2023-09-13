import {
	Tree,
	addProjectConfiguration,
	formatFiles,
	logger,
	readProjectConfiguration,
	updateJson,
} from '@nx/devkit';
import type { ConvertEntryPointToProjectGeneratorSchema } from './schema';

export async function convertEntryPointToProjectGenerator(
	tree: Tree,
	options: ConvertEntryPointToProjectGeneratorSchema
) {
	const { name, project } = options;
	if (name === 'src') {
		logger.warn(`[local-plugin] entry point "src" is invalid`);
		return;
	}

	const projectConfiguration = readProjectConfiguration(tree, project);

	if (!projectConfiguration) {
		logger.error(`[local-plugin] project ${project} not found`);
		return;
	}

	const entryPointPath = `libs/${project}/${name}`;
	const isExist = tree.exists(entryPointPath);
	if (!isExist) {
		logger.error(`[local-plugin] ${name} not found as an entry point`);
		return;
	}

	const isProjectJsonExist = tree.exists(`${entryPointPath}/project.json`);
	if (isProjectJsonExist) {
		logger.info(`[local-plugin] ${name} entry point is already a Project`);
		return;
	}

	addProjectConfiguration(tree, `${project}/${name}`, {
		root: entryPointPath,
		projectType: 'library',
		sourceRoot: `${entryPointPath}/src`,
		targets: {
			test: {
				executor: '@nx/jest:jest',
				outputs: ['{workspaceRoot}/coverage/{projectRoot}'],
				options: {
					jestConfig: `libs/${project}/jest.config.ts`,
					passWithNoTests: true,
				},
				configurations: {
					ci: {
						ci: true,
						codeCoverage: true,
					},
				},
			},
			lint: {
				executor: '@nx/linter:eslint',
				outputs: ['{options.outputFile}'],
				options: {
					lintFilePatterns: [
						`libs/${project}/${name}/**/*.ts`,
						`libs/${project}/${name}/**/*.html`,
					],
				},
			},
		},
	});

	updateJson(tree, `${projectConfiguration.root}/project.json`, (json) => {
		if (json.targets?.lint?.options?.lintFilePatterns) {
			const entryPointPatternIndex =
				json.targets.lint.options.lintFilePatterns.findIndex(
					(pattern: string) => pattern.includes(entryPointPath)
				);
			if (entryPointPatternIndex > -1) {
				json.targets.lint.options.lintFilePatterns.splice(
					entryPointPatternIndex,
					2
				);
			}
		}
		return json;
	});

	await formatFiles(tree);
}

export default convertEntryPointToProjectGenerator;
