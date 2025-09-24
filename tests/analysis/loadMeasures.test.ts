import { loadMeasureBundle, loadMeasureLibraryFromDir } from '../../src/analysis/loadMeasures';
import mockFs from 'mock-fs';
import { logger } from '../../src/common/logger';

jest.mock('../../src/common/logger');

describe('Tests for the loadMeasureBundle function.', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockFs.restore();
  });

  test('Load JSON files with resourceType "Bundle".', () => {
    const directoryPath = '/path/to/directory/';
    const filenames = ['file1.json', 'file2.json'];
    const fileContent = JSON.stringify({ resourceType: 'Bundle' });

    mockFs({
      '/path/to/directory': {
        'file1.json': fileContent,
        'file2.json': fileContent,
      },
    });

    const result = loadMeasureBundle(directoryPath, filenames);

    expect(result).toEqual([
      { fileName: 'file1.json', json: fileContent },
      { fileName: 'file2.json', json: fileContent },
    ]);
    expect(logger.info).toHaveBeenCalledWith('Loaded 2 files');
  });

  test('Skip files that are not JSON or do not have resourceType "Bundle".', () => {
    const directoryPath = '/path/to/directory/';
    const filenames = ['file1.json', 'file2.txt'];
    const fileContent = JSON.stringify({ resourceType: 'NotABundle' });

    mockFs({
      '/path/to/directory': {
        'file1.json': fileContent,
        'file2.txt': 'some text content',
      },
    });

    const result = loadMeasureBundle(directoryPath, filenames);

    expect(result).toEqual([]);
    expect(logger.info).toHaveBeenCalledWith('Loaded 0 files');
  });

  test('Read all files in directory if filenames array is empty.', () => {
    const directoryPath = '/path/to/directory/';
    const fileContent = JSON.stringify({ resourceType: 'Bundle' });

    mockFs({
      '/path/to/directory': {
        'file1.json': fileContent,
        'file2.json': fileContent,
      },
    });

    const result = loadMeasureBundle(directoryPath, []);

    expect(result).toEqual([
      { fileName: 'file1.json', json: fileContent },
      { fileName: 'file2.json', json: fileContent },
    ]);
    expect(logger.info).toHaveBeenCalledWith('Loaded 2 files');
  });
});

describe('Tests for the loadMeasureLibraryFromDir function.', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockFs.restore();
  });

  test('Load JSON files with resourceType "Library".', () => {
    const directoryPath = '/path/to/directory/';
    const filenames = ['file1.json'];
    const fileContent = JSON.stringify({ resourceType: 'Library' });

    mockFs({
      '/path/to/directory': {
        'file1.json': fileContent,
      },
    });

    const result = loadMeasureLibraryFromDir(directoryPath, filenames);

    expect(result).toEqual([{ fileName: 'file1.json', json: fileContent }]);
    expect(logger.info).toHaveBeenCalledWith('Loaded 1 files');
  });

  test('Load Library resources from Bundle files.', () => {
    const directoryPath = '/path/to/directory/';
    const filenames = ['file1.json'];
    const bundleContent = JSON.stringify({
      resourceType: 'Bundle',
      entry: [
        { resource: { resourceType: 'Library', id: 'lib1' } },
        { resource: { resourceType: 'Other' } },
      ],
    });

    mockFs({
      '/path/to/directory': {
        'file1.json': bundleContent,
      },
    });

    const result = loadMeasureLibraryFromDir(directoryPath, filenames);

    expect(result).toEqual([
      { fileName: 'file1.json', json: JSON.stringify({ resourceType: 'Library', id: 'lib1' }) },
    ]);
    expect(logger.info).toHaveBeenCalledWith('Loaded 1 files');
  });

  test('Read all files in directory if filenames array is empty.', () => {
    const directoryPath = '/path/to/directory/';
    const fileContent = JSON.stringify({ resourceType: 'Library' });

    mockFs({
      '/path/to/directory': {
        'file1.json': fileContent,
        'file2.json': fileContent,
      },
    });

    const result = loadMeasureLibraryFromDir(directoryPath, []);

    expect(result).toEqual([
      { fileName: 'file1.json', json: fileContent },
      { fileName: 'file2.json', json: fileContent },
    ]);
    expect(logger.info).toHaveBeenCalledWith('Loaded 2 files');
  });
});
