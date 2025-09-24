const { createFile, createInstantiatedTemplateFile, getMeasureListString, getMeasureListStringFromExt } = require('../../src/common/util.ts');
const fs = require('fs');
const mock = require('mock-fs');

describe('Tests for the createFile function.', () => {
    beforeEach(() => {
        mock({
            'test-path': {
                'empty-dir': {/** empty directory */}
            }
        });
    });

    afterEach(() => {
        mock.restore();
    });

    test('Test initial condition - testFile should not exist.', () => {
        expect(fs.existsSync('test-path/empty-dir/testFile')).toBe(false);
    });

    test('Test that the file exists after running createFile.', () => {
        createFile('test-path/empty-dir/testFile', 'test content');
        expect(fs.existsSync('test-path/empty-dir/testFile')).toBe(true);
    });

    test('Test that the contents of a file written using createFile are correct.', () => {
        createFile('test-path/empty-dir/testFile', 'test content');
        const fileContent = fs.readFileSync('test-path/empty-dir/testFile', 'utf8');
        expect(fileContent).toBe('test content');
    });
});

describe('Tests for the createInstantiatedTemplateFile function.', () => {
    beforeEach(() => {
        mock({
            'test-path': {
                'empty-dir': {/** empty directory */}
            }
        });
    });

    afterEach(() => {
        mock.restore();
    });

    test('Test that the contents of a file created using createInstantiatedTemplateFile are correct.', () => {
        const fileName = 'test-path/empty-dir/testFile';
        const originalContents = 'replace me';
        const replaceMap = new Map([['replace me', 'replaced content']]);
        createInstantiatedTemplateFile(fileName, originalContents, replaceMap);
        const fileContent = fs.readFileSync(fileName, 'utf8');
        expect(fileContent).toBe('replaced content');
    });
});

describe('Tests for the getMeasureListString function.', () => {
    let measures: string[];
    let mockSettings: any;
    
    beforeEach(() => {
        measures = ['measure1', 'measure2'];
        mockSettings = {
            projectName: 'Test',
            measureLink: new Map([
              ['measure1', { name: 'Measure One', identifier: 'M1', keyURL: 'http://example.com/m1', definitionURL: 'http://example.com/m1' }],
              ['measure2', { name: 'Measure Two', identifier: 'M2', keyURL: 'http://example.com/m1', definitionURL: 'http://example.com/m2' }]
            ])
          };
    });

    afterEach(() => {
        mock.restore();
    });

    test('Test getMeasureListString with default values.', () => {
        const measureListString = getMeasureListString(measures, mockSettings);
        expect(measureListString).toBe(
            "<a href='http://example.com/m1' target='_blank'>Measure One (M1)</a>, <a href='http://example.com/m2' target='_blank'>Measure Two (M2)</a>"
        );
    });

    test('Test getMeasureListString with custom delimiter.', () => {
        const measureListString = getMeasureListString(measures, mockSettings, ' $ ');
        expect(measureListString).toBe(
            "<a href='http://example.com/m1' target='_blank'>Measure One (M1)</a> $ <a href='http://example.com/m2' target='_blank'>Measure Two (M2)</a>"
        );
    });

    test('Test getMeasureListString with custom prefix.', () => {
        const measureListString = getMeasureListString(measures, mockSettings, undefined, 'test_prefix ');
        expect(measureListString).toBe(
            "test_prefix <a href='http://example.com/m1' target='_blank'>Measure One (M1)</a>, <a href='http://example.com/m2' target='_blank'>Measure Two (M2)</a>"
        );
    });

    test('Test getMeasureListString with Markdown style links.', () => {
        const measureListString = getMeasureListString(measures, mockSettings, undefined, undefined, true);
        expect(measureListString).toBe(
            "[Measure One (M1)](http://example.com/m1), [Measure Two (M2)](http://example.com/m2)"
        );
    });

    test('Test getMeasureListString with nameOnly nameStyle.', () => {
        const measureListString = getMeasureListString(measures, mockSettings, undefined, undefined, undefined, 'nameOnly');
        expect(measureListString).toBe(
            "<a href='http://example.com/m1' target='_blank'>Measure One</a>, <a href='http://example.com/m2' target='_blank'>Measure Two</a>"
        );
    });

    test('Test getMeasureListString with identifierOnly nameStyle.', () => {
        const measureListString = getMeasureListString(measures, mockSettings, undefined, undefined, undefined, 'identifierOnly');
        expect(measureListString).toBe(
            "<a href='http://example.com/m1' target='_blank'>M1</a>, <a href='http://example.com/m2' target='_blank'>M2</a>"
        );
    });

    test('Test handling of empty measure list.', () => {
        measures = [];
        const measureListString = getMeasureListString(measures, mockSettings);
        expect(measureListString).toBe('');
    });

    test('Test handling of unfound measure.', () => {
        measures = ['measure3']
        const measureListString = getMeasureListString(measures, mockSettings);
        expect(measureListString).toBe('measure3');
    });

    test('Test handling of measure with no URL.', () => {
        measures = ['measure3']
        mockSettings = {
            projectName: 'Test',
            measureLink: new Map([
              ['measure3', { name: 'Measure Three', identifier: 'M3' }]
            ])
        };
        const measureListString = getMeasureListString(measures, mockSettings);
        expect(measureListString).toBe('Measure Three (M3)');
    });
});

describe('Tests for the getMeasureListStringFromExt function.', () => {
    //Because getMeasureListString is in the same module, it wasn't possible to mock, and is used within this test. 
    test('Test that measures with valid measureExtensionURLs are passed to getMeasureListString.', () => {
        const mockSettings = {
            projectName: 'Test',
            measureLink: new Map([
              ['measure1', { name: 'Measure One', identifier: 'M1', keyURL: 'http://example.com/m1', definitionURL: 'http://example.com/m1' }]
            ]),
            measureExtensionURL: 'http://example.com/measure1',
        };

        const mockExtensions = [
            { url: 'http://example.com/other', valueString: 'measureNull' },
            { url: 'http://example.com/measure1', valueString: 'measure1' },
          ];

        const measureString = getMeasureListStringFromExt(mockExtensions, mockSettings);
        expect(measureString).toBe("<a href='http://example.com/m1' target='_blank'>Measure One (M1)</a>");
    });
});