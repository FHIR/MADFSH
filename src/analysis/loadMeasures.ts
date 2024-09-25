import { logger } from '../common/logger';
import * as fs from 'fs';

export function loadMeasureBundle(
  directoryPath: string,
  filenames: string[]
): { fileName: string; json: string }[] {
  const jsons: { fileName: string; json: string }[] = [];

  logger.info('Loading input FHIR measure library from : ' + directoryPath);
  let fileCnt = 0;

  if (filenames.length > 0) {
    filenames.forEach(oneFile => {
      if (oneFile.includes('.json')) {
        logger.info('Loading file: ' + oneFile);
        const json = fs.readFileSync(directoryPath + oneFile, { encoding: 'utf8', flag: 'r' });
        if (JSON.parse(json).resourceType === 'Bundle') {
          fileCnt++;
          jsons.push({ fileName: oneFile, json: json });
        }
      }
    });
  } else {
    const files = fs.readdirSync(directoryPath);
    files.forEach(function (oneFile) {
      if (oneFile.includes('.json')) {
        if (filenames.includes(oneFile)) {
          const json = fs.readFileSync(directoryPath + oneFile, {
            encoding: 'utf8',
            flag: 'r'
          });
          if (JSON.parse(json).resourceType === 'Bundle') {
            logger.info('Loading file: ' + oneFile);
            fileCnt++;
            jsons.push({ fileName: oneFile, json: json });
          }
        }
      }
    });
  }

  logger.info('Loaded ' + fileCnt + ' files');
  return jsons;
}

export function loadMeasureLibraryFromDir(
  directoryPath: string,
  filenames: string[]
): { fileName: string; json: string }[] {
  const jsons: { fileName: string; json: string }[] = [];
  const files = fs.readdirSync(directoryPath);

  let fileCnt = 0;
  files.forEach(function (f) {
    if (f.includes('.json')) {
      if (filenames.includes(f) || filenames.length == 0) {
        logger.info('Loading file: ' + f);
        fileCnt++;
        const json = fs.readFileSync(directoryPath + f, { encoding: 'utf8', flag: 'r' });
        if (JSON.parse(json).resourceType === 'Library') {
          jsons.push({ fileName: f, json: json });
        }
        if (JSON.parse(json).resourceType === 'Bundle') {
          const entry = JSON.parse(json).entry;
          entry.forEach((e: any) => {
            if (e.resource.resourceType === 'Library')
              jsons.push({ fileName: f, json: JSON.stringify(e.resource) });
          });
        }
      }
    }
  });

  logger.info('Loaded ' + fileCnt + ' files');
  return jsons;
}