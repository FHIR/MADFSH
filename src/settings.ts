import { logger } from './logger';
import * as fs from 'fs';
import path from 'path';
import { FHIRDefinitions, fpl } from 'fhir-package-loader';
import YAML from 'yaml';

const DEFAULT_INPUT_ROOT = 'measure_input/';
const DEFAULT_OUTPUT_ROOT = './';
const DEFAULT_EXAMPLE_OUTPUT = 'input/examples/';
const DEFAULT_MEASURE_LINK_FILE = 'src/narrative-mappings/measure-link.json';

export type ValueSetDetails = {
  url: string;
  name?: string;
  id?: string;
  webLinkUrl?: string;
};
export type CodeDetails = {
  code: string;
  system: string;
  display?: string;
  webLinkUrl?: string;
};

export type ElementDetailsOverride = {
  parentProfileKey: string;
  path: string;
  includeInNarrative: boolean;
};

export type Settings = {
  exampleInputFolder: string;
  exampleOutputFolder: string;
  exampleMarkdownFile: string;
  inputRoot?: string;
  outputRoot?: string;
  inputFileList?: string[];
  projectName: string;
  projectMarkdownNameAndLink: string;
  remoteProfile: boolean;
  profileURLReplace: {
    source: string;
    target: string;
  }[];
  measureExtensionURL: string;
  measureLinkFile: string;
  valueSetDetails: ValueSetDetails[];
  codeDetails: CodeDetails[];
  elementDetailOverrides: ElementDetailsOverride[];
  nlmApiKey?: string;
  loincCredentials?: {
    username: string;
    password: string;
  };
  createDataReqJSON: boolean;
};

export type RuntimeSettings = {
  inputRoot: string;
  outputRoot: string;
  inputFileList: string[];
  projectName: string;
  projectMarkdownNameAndLink: string;
  remoteProfile: boolean;
  profileURLReplace: Map<string, string>;
  measureExtensionURL: string;
  measureLink: Map<
    string,
    {
      name: string;
      identifier: string;
      keyURL: string;
      definitionURL: string;
    }
  >;
  valueSetDetails: Map<string, ValueSetDetails>;
  codeDetails: Map<string, CodeDetails>;
  elementDetailOverrides: Map<string, ElementDetailsOverride>;
  nlmApiKey?: string;
  loincCredentials?: {
    username: string;
    password: string;
  };
  createDataReqJSON: boolean;
  fhirDefinitions: FHIRDefinitions | undefined;
  exampleInputFolder: string;
  exampleOutputFolder: string;
  exampleMarkdownFile: string;
};

export function settingsToRuntime(settings: Settings): RuntimeSettings {
  const inputRoot = settings.inputRoot
    ? `${settings.inputRoot}${settings.inputRoot.endsWith('/') ? '' : '/'}`
    : DEFAULT_INPUT_ROOT;

  return {
    inputRoot: inputRoot,
    outputRoot: settings.outputRoot
      ? `${settings.outputRoot}${settings.outputRoot.endsWith('/') ? '' : '/'}`
      : DEFAULT_OUTPUT_ROOT,
    inputFileList: settings.inputFileList ? settings.inputFileList : [],
    projectName: settings.projectName,
    projectMarkdownNameAndLink: settings.projectMarkdownNameAndLink,
    remoteProfile: settings.remoteProfile,
    profileURLReplace: sourceTargetListToMap(settings.profileURLReplace),
    measureExtensionURL: settings.measureExtensionURL,
    measureLink: loadMeasureLinkToMap(inputRoot, settings.measureLinkFile),
    valueSetDetails: valueSetDetailsToMap(settings),
    codeDetails: codeDetailsToMap(settings),
    elementDetailOverrides: elementDetailsOverridesToMap(settings),
    nlmApiKey: settings.nlmApiKey,
    loincCredentials: settings.loincCredentials,
    createDataReqJSON: settings.createDataReqJSON,
    fhirDefinitions: undefined,
    exampleInputFolder: settings.exampleInputFolder
      ? `${settings.exampleInputFolder}${settings.exampleInputFolder.endsWith('/') ? '' : '/'}`
      : '',
    exampleOutputFolder: settings.exampleOutputFolder
      ? `${settings.exampleOutputFolder}${settings.exampleOutputFolder.endsWith('/') ? '' : '/'}`
      : DEFAULT_EXAMPLE_OUTPUT,
    exampleMarkdownFile: settings.exampleMarkdownFile
  };
}

export function loadSettingsFile(filepath: string): Settings {
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function loadMeasureLinkToMap(inputRoot: string, filepath: string) {
  let list: { name: string; identifier: string; keyURL: string; definitionURL: string }[];
  if (filepath != '') {
    // load from project-specific file
    list = JSON.parse(
      fs.readFileSync(path.join(inputRoot, filepath), { encoding: 'utf8', flag: 'r' })
    );
  } else {
    // load from the default file
    list = JSON.parse(fs.readFileSync(DEFAULT_MEASURE_LINK_FILE, { encoding: 'utf8', flag: 'r' }));
  }

  const map = new Map<
    string,
    { name: string; identifier: string; keyURL: string; definitionURL: string }
  >();
  list?.forEach(entry => {
    if (map.has(entry.keyURL) && entry.keyURL != '') {
      logger.warn('duplicate configuration for keyURL : ' + entry.keyURL);
    } else {
      map.set(entry.keyURL, entry);
    }
  });

  return map;
}

function sourceTargetListToMap(list: { source: string; target: string }[]) {
  const map = new Map<string, string>();
  list.forEach(entry => {
    if (map.has(entry.source)) {
      logger.warn('duplicate configuration for source ' + entry.source);
    } else {
      map.set(entry.source, entry.target);
    }
  });

  return map;
}

function valueSetDetailsToMap(settings: Settings): Map<string, ValueSetDetails> {
  const valueSetDetailMap = new Map<string, ValueSetDetails>();
  settings.valueSetDetails.forEach(valueSetDetail => {
    valueSetDetailMap.set(valueSetDetail.url, valueSetDetail);
  });

  return valueSetDetailMap;
}

function codeDetailsToMap(settings: Settings): Map<string, CodeDetails> {
  const codeDetailMap = new Map<string, CodeDetails>();
  settings.codeDetails.forEach(codeDetail => {
    codeDetailMap.set(`${codeDetail.system}|${codeDetail.code}`, codeDetail);
  });

  return codeDetailMap;
}

function elementDetailsOverridesToMap(settings: Settings): Map<string, ElementDetailsOverride> {
  const elementDetailOverrideMap = new Map<string, ElementDetailsOverride>();
  settings.elementDetailOverrides.forEach(elementDetailOverride => {
    elementDetailOverrideMap.set(
      `${elementDetailOverride.parentProfileKey}|${elementDetailOverride.path}`,
      elementDetailOverride
    );
  });

  return elementDetailOverrideMap;
}

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