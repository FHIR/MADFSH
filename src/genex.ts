import * as fs from 'fs';
import { RuntimeSettings } from './config/settings';
import path from 'path';
import { ProfileDetail } from './elementDetails';
import * as util from './util';
import { logger } from './logger';

function readFiles(dir: string, filelist: string[] = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = readFiles(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  });
  return filelist;
}

export function generateExample(
  settings: RuntimeSettings,
  profileDetails: ProfileDetail[]
): string {
  if (!settings.exampleInputFolder) {
    return 'No examples available.';
  }

  let md = '';
  const files = readFiles(path.join(settings.inputRoot, settings.exampleInputFolder));
  let measureURL = '';
  let exampleNo = 1;
  const exampleOutputDirectory = path.join(settings.outputRoot, settings.exampleOutputFolder);

  if (!fs.existsSync(exampleOutputDirectory)) {
    fs.mkdirSync(exampleOutputDirectory);
    console.log(`Directory "${exampleOutputDirectory}" created successfully.`);
  } else {
    fs.readdirSync(exampleOutputDirectory).forEach(file => {
      fs.unlinkSync(path.join(exampleOutputDirectory, file));
    });
  }

  files.forEach(f => {
    if (f.includes('.json')) {
      logger.info('Loading Example files: ' + f);
      const bundle = JSON.parse(fs.readFileSync(f, 'utf-8')) as fhir4.Bundle;

      bundle.entry?.forEach(entry => {
        if (entry.resource?.resourceType === 'MeasureReport') {
          if (measureURL != entry.resource?.measure) {
            if (measureURL != '') {
              md += '</tbody></table>';
            }

            measureURL = entry.resource?.measure;
            md += '\n### Measure: ' + measureURL.replace('https://madie.cms.gov/Measure/', '');

            md +=
              '\n<table class="grid">' +
              '<thead>' +
              '<tr>' +
              '<th><strong>#</strong></th>' +
              '<th><strong>Complete Bundle</strong></th>' +
              '<th><strong>Individual Instances</strong></th>' +
              '</tr>' +
              '</thead>' +
              '<tbody>';
          }
        }
      });
      md += '\n\n<tr><td>' + exampleNo + '</td><td>';
      md += '<a href="Bundle-' + bundle.id + '.html">Example-Bundle-' + bundle.id + '</a></td><td>';

      bundle.entry?.forEach(entry => {
        if (entry.resource?.resourceType != 'MeasureReport') {
          const example = entry.resource as fhir4.DomainResource;
          const exampleName = 'Example-' + example.resourceType + '-' + example.id;

          md +=
            '\n- <a href="' +
            example.resourceType +
            '-' +
            example.id +
            '.html">' +
            exampleName +
            '</a>';

          profileDetails.forEach(pd => {
            if (example.meta) {
              if (example.meta.profile) {
                if (pd.getParentProfileUrl() === example.meta.profile[0]) {
                  const sd: fhir4.StructureDefinition = pd.getParentProfileDefinition();
                  example.meta.profile[0] =
                    'http://hl7.org/fhir/us/' +
                    settings.projectName.toLowerCase() +
                    '/StructureDefinition/' +
                    pd.getStructureDefId();
                  md +=
                    ' Base profile: <a href="StructureDefinition-' +
                    pd.getStructureDefId() +
                    '.html">' +
                    settings.projectName +
                    sd.name +
                    '</a>';
                }
              }
            }
          });

          md += '<br>';

          example.extension?.push({
            url: `http://hl7.org/fhir/us/${settings.projectName.toLowerCase()}/StructureDefinition/used-by-measure`,
            valueString: measureURL
          });

          util.createFile(
            settings.outputRoot + settings.exampleOutputFolder + exampleName + '.json',
            JSON.stringify(example, null, 2)
          );
        }
      });
      md += '</td></tr>';

      util.createFile(
        path.join(exampleOutputDirectory, 'Bundle-' + bundle.id + '.json'),
        JSON.stringify(bundle, null, 2)
      );

      exampleNo++;
    }
  });

  return md;
}
