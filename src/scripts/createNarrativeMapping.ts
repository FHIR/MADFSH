import fs from 'fs';
import path from 'path';
import { logger } from '../logger';

const mapping: Record<string, Record<string, string>> = {};
const directoryPath = path.join(__dirname, '../../us-core-descriptions/');
const fileNames = fs.readdirSync(directoryPath);
fileNames.forEach(file => {
    const profileName = file.split('descriptions-')[1].replace('.json', '');
    //eslint-disable-next-line @typescript-eslint/no-var-requires
    const descriptions = require(
        path.resolve(path.join(__dirname, '../../us-core-descriptions/', file))
    ) as Record<string, string>;
    mapping[profileName] = descriptions;
});

const outputPath = path.resolve(
    path.join(__dirname, '../narrative-mappings/default-narrative-mapping.json')
);
fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2), 'utf8');
logger.info(`Wrote output to ${outputPath}`);
