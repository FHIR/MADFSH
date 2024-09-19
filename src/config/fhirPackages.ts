import { logger } from '../logger';
import * as fs from 'fs';
import path from 'path';
import { FHIRDefinitions, fpl } from 'fhir-package-loader';
import YAML from 'yaml';
import {RuntimeSettings} from './settings';

export async function identifyAndLoadDependencyPackages(settings: RuntimeSettings) {
  const sushiConfigPath = findSushiConfig(settings.outputRoot);
  if (sushiConfigPath) {
    const dependencyList = extractIGDependenciesFromSushiConfig(sushiConfigPath);
    const fhirDefinitions = await loadPackages(dependencyList);
    if (fhirDefinitions) {
      settings.fhirDefinitions = fhirDefinitions;
    } else {
      logger.error('failed to load dependency IGs');
    }
  }
}

function findSushiConfig(outputRoot: string): string | undefined {
  const configPath = [
    path.join(outputRoot, 'sushi-config.yaml'),
    path.join(outputRoot, 'sushi-config.yml')
  ].find(fs.existsSync);
  if (configPath) {
    // The config already exists, so return it
    const pathToReturn = path.resolve(configPath);
    logger.info(`Using sushi configuration file: ${pathToReturn}`);
    return pathToReturn;
  } else {
    logger.warn(`No sushi-config.yaml file found at output root '${outputRoot}'`);
    return undefined;
  }
}

function extractIGDependenciesFromSushiConfig(sushiConfigPath: string): string[] {
  const dependencyList: string[] = [];

  const configYaml = fs.readFileSync(sushiConfigPath, 'utf8');
  try {
    const parsed = YAML.parse(configYaml);

    // core FHIR version
    switch (parsed.fhirVersion) {
      case '4.0.1':
        dependencyList.push('hl7.fhir.r4.core@4.0.1');
        break;
      case undefined:
        logger.warn('no FHIR core version found to include in dependencies');
        break;
      default:
        logger.warn('unsupported FHIR version: ' + parsed.fhirVersion);
    }

    // dependency IGs
    const sushiDependencies = Object.entries(parsed.dependencies);
    if (sushiDependencies.length === 0) {
      logger.warn('no ig dependencies found in sushi-config file');
    }
    sushiDependencies.forEach(([key, dependency]: [string, any]) =>
      dependencyList.push(`${key}@${dependency.version}`)
    );
  } catch (error) {
    logger.error(`Error parsing configuration: ${error}.`);
  }

  return dependencyList;
}

async function loadPackages(packageList: string[]) {
  let loadedDefinitions: FHIRDefinitions | undefined = undefined;
  if (packageList.length < 1) {
    // only the default
    logger.warn('No packages found to load!');
  }

  await fpl(packageList)
    .then(results => {
      // handle results
      results.errors.forEach(oneErr => {
        logger.error(oneErr);
      });
      results.warnings.forEach(oneWarning => {
        logger.warn(oneWarning);
      });
      results.failedPackages.forEach(onePackage => {
        logger.warn("Package didn't load: " + onePackage);
      });

      logger.info('loaded: ' + results.defs.size());
      loadedDefinitions = results.defs;
    })
    .catch(err => {
      logger.error('package loading failed: ' + err);
    });

  return loadedDefinitions;
}
