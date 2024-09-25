import commander from 'commander';
import path from 'path';
import { logger } from './common/logger';
import { resolve } from 'path';
import * as fs from 'fs';
import {
  Settings,
  settingsToRuntime,
  loadSettingsFile
} from './config/settings';
import { identifyAndLoadDependencyPackages } from './config/fhirPackages';
import { loadMeasureBundle } from './analysis/loadMeasures';
import { reorgDataRequirementWithMeasure } from './analysis/aggregateRequirements';
import { fetchValueSetAndCodeDetails } from './analysis/terminologyDetails';
import { prepareElementDetails } from './analysis/elementDetails';
import { generateFSH } from './generation/generateFSH';
import { generateMarkdown } from './generation/generateNarrative';
import { generateExample } from './generation/generateExamples';
import { createFile } from './common/util';
import { initMADFSHProject } from './scripts/projectTemplate';

const VERSION = '0.5.0';

// Settings are hard coded for now, later to be implemented as CLI params or config.yaml
const program = new commander.Command();

// option for specifying a narrative description mapping
program
  .option(
    '-n, --narrative-file <path>',
    'Relative path to a JSON file of element path descriptions. Otherwise uses default mapping from US-Core profiles,'
  )
  .option('-a, --apikey [value]', 'nlm api key for fetching vsac value set details')
  .option('-lu, --loincuser [value]', 'loinc username for fetching loinc code details')
  .option('-lp, --loincpassword [value]', 'loinc password for fetching loinc code details')
  .option(
    '-oidr, --outputintermediatedatareqjson',
    'flag to output intermediate data requirements to file aggr-data-require.json'
  )
  .option('-c, --config-file [filepath]', 'path to configuration file')
  .parseAsync(process.argv);
let { narrativeFile } = program.opts();

if (narrativeFile) {
  // use specified narrative description mapping
  narrativeFile = resolve(__dirname, 'narrative-mappings', narrativeFile);
} else {
  // use default narrative mapping
  narrativeFile = resolve(__dirname, 'narrative-mappings', 'default-narrative-mapping.json');
}

program
  .command('update-mapping')
  .argument('<file-path>', 'Relative path to a mapping file')
  .argument('<profile-name>', 'Profile that the element belongs to')
  .argument('<elem-path>', 'Element path to add description for')
  .argument(
    '<description>',
    'Desired element path description (Description MUST be provided in quotes)'
  )
  .action((filePath, profileName, elemPath, description) => {
    const absolutePath = resolve(__dirname, 'narrative-mappings', filePath);
    let currentMapping: Record<string, Record<string, string>>;
    // if filePath does not exist, create it by copying the default mapping
    if (!fs.existsSync(absolutePath)) {
      // read mapping from default file
      currentMapping = JSON.parse(fs.readFileSync(narrativeFile, 'utf-8'));
      // write contents of default mapping to new file
    } else {
      currentMapping = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
    }
    // add the mapping of element path and description to the mapping file
    if (!currentMapping[profileName]) {
      currentMapping[profileName] = {};
    }
    currentMapping[profileName][elemPath] = description;
    // write updated contents to file
    fs.writeFileSync(absolutePath, JSON.stringify(currentMapping, null, 2), 'utf-8');
    logger.info(`Successfully wrote output to ${filePath}`);
  });

program
  .command('init-madfsh-project')
  .argument('dir', 'project / directory name for the madfsh project.')
  .action(dir => initMADFSHProject(dir));

program
  .name('madie2fsh')
  .summary('Measure Set to FSH Converter')
  .description(
    'Converts a set of measures into FHIR profiles encoded in FHIR Shorthand (FSH) using the data requirements of those measures.'
  )
  .usage('[command] [options]')
  .action(async () => {
    logger.info('******************************************');
    logger.info('*      Measure Set to FSH Converter      *');
    logger.info('******************************************');
    logger.info(`Version: ${VERSION}`);
    logger.info(path.join(__dirname, "locale"))

    const options = program.opts();
    let executionDetailsString = `VERSION: ${VERSION}\nRun At: ${new Date().toISOString()}`;

    let settings: Settings | undefined = undefined;
    if (options.configFile) {
      settings = loadSettingsFile(options.configFile);
      executionDetailsString += `\nConfigFile: ${options.configFile}`;
    } else {
      settings = loadSettingsFile('default-config.json');
    }

    // override settings file with command-line arguments into
    if (options.apikey) {
      settings.nlmApiKey = options.apikey;
      executionDetailsString += '\nNLM API Key: ******';
    }
    if (options.loincpassword && options.loincuser) {
      settings.loincCredentials = {
        username: options.loincuser,
        password: options.loincpassword
      };
      executionDetailsString += '\nLOINC User: ******';
      executionDetailsString += '\nLOINC Password: ******';
    }
    if (options.outputintermediatedatareqjson) {
      settings.createDataReqJSON = true;
    }

    const runtimeSettings = settingsToRuntime(settings);

    // export the latest execution invocation - for update tracking
    createFile(`${runtimeSettings.outputRoot}madfsh_invocation.txt`, executionDetailsString);

    logger.info('');
    logger.info('*******************************************************');
    logger.info('Loading IG Dependencies');
    logger.info('*******************************************************');
    logger.info('');
    await identifyAndLoadDependencyPackages(runtimeSettings);

    logger.info('');
    logger.info('*******************************************************');
    logger.info('Loading Measures');
    logger.info('*******************************************************');
    logger.info('');

    const bundles = loadMeasureBundle(
      runtimeSettings.inputRoot,
      runtimeSettings.inputFileList
    );

    logger.info('');
    logger.info('*******************************************************');
    logger.info('Aggregating Data Requirements Across Measures');
    logger.info('*******************************************************');
    logger.info('');

    const dr = reorgDataRequirementWithMeasure(bundles, runtimeSettings);
    if (runtimeSettings.createDataReqJSON)
      createFile('aggr-data-require.json', JSON.stringify(dr, null, 2));

    logger.info('');
    logger.info('*******************************************************');
    logger.info('Gathering Value Sets');
    logger.info('*******************************************************');
    logger.info('');

    await fetchValueSetAndCodeDetails(dr, runtimeSettings);

    logger.info('');
    logger.info('*******************************************************');
    logger.info('Loading Profiles and Identifying Elements');
    logger.info('*******************************************************');
    logger.info('');

    const profileDetails = await prepareElementDetails(dr, runtimeSettings, narrativeFile);

    logger.info('');
    logger.info('*******************************************************');
    logger.info('Generating FSH');
    logger.info('*******************************************************');
    logger.info('');

    createFile(
      `${runtimeSettings.outputRoot}input/fsh/profiles.fsh`,
      generateFSH(profileDetails, runtimeSettings)
    );

    logger.info('');
    logger.info('*******************************************************');
    logger.info('Generating Markdown Files');
    logger.info('*******************************************************');
    logger.info('');

    // clear existing markdown files
    const mdDirectory = path.join(runtimeSettings.outputRoot, 'input', 'pagecontent');
    fs.readdirSync(mdDirectory).forEach(file => {
      if (file.startsWith('StructureDefinition-')) {
        fs.unlinkSync(path.join(mdDirectory, file));
      }
    });

    const createdFileMap = new Map();
    generateMarkdown(profileDetails, runtimeSettings).forEach(md => {
      const filename = `${runtimeSettings.outputRoot}input/pagecontent/StructureDefinition-${md.name}.md`;
      if (!createdFileMap.has(filename)) {
        createFile(filename, md.markdownContents);
        createdFileMap.set(filename, '');
      } else {
        logger.error(`Duplicate file ${filename}`);
      }
    });

    logger.info('');
    logger.info('*******************************************************');
    logger.info('Generating Examples');
    logger.info('*******************************************************');
    logger.info('');

    if (runtimeSettings.exampleMarkdownFile) {
      createFile(
        path.join(
          runtimeSettings.outputRoot,
          'input',
          'pagecontent',
          runtimeSettings.exampleMarkdownFile
        ),
        generateExample(runtimeSettings, profileDetails)
      );
    } else {
      logger.info('No examples.');
    }

    logger.info('');
    logger.info('*******************************************************');
    logger.info('Total # of Loaded Bundles: ' + bundles.length);
    logger.info('Total # of Loaded data requirement entries: ' + dr.length);
    logger.info('Total # of Profiles created: ' + profileDetails.length);
    logger.info('*******************************************************');
  });

program.parse();
