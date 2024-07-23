import * as util from './util';
import path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

const template_root = 'project_template';

export function initMADFSHProject(projectDirName: string) {
    const targetDir = path.join('..', projectDirName);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir);

        const replaceMap = new Map([
            ['<INPUTROOT>', path.join(targetDir, 'madfsh-input')],
            ['<OUTPUTROOT>', targetDir],
            ['<PROJECTNAME>', path.basename(projectDirName)],
            ['<PACKAGE>', `fhir.${path.basename(projectDirName).toLowerCase()}`]
        ]);
        instantiateTemplateFolder(targetDir, template_root, replaceMap);
    } else {
        logger.error(`Target directory ${targetDir} already exists.`);
    }
}

function instantiateTemplateFolder(
    targetDir: string,
    templateFolder: string,
    replaceMap: Map<string, string>
) {
    const templateFolderFiles = fs.readdirSync(templateFolder);
    templateFolderFiles.forEach(filename => {
        const targetFile = path.join(templateFolder, filename);
        if (fs.lstatSync(targetFile).isDirectory()) {
            // create directory and recurse

            const recurseTargetDir = path.join(targetDir, filename);
            fs.mkdirSync(recurseTargetDir);
            instantiateTemplateFolder(
                recurseTargetDir,
                path.join(templateFolder, filename),
                replaceMap
            );
        } else {
            // copy the file over to the target directory
            const templateFileContents = fs.readFileSync(path.join(templateFolder, filename), {
                encoding: 'utf8',
                flag: 'r'
            });
            const targetFile = path.join(targetDir, filename);
            util.createInstantiatedTemplateFile(targetFile, templateFileContents, replaceMap);
        }
    });
}
