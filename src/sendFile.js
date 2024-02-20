'use strict';

const fs = require('node:fs');
const zlib = require('node:zlib');

/* eslint no-console: "warn" */

module.exports = {
  sendCompressedFile,
  sendCompressedFileByStream,
  removeFile,
};

const compressionTypes = Object.freeze({
  gzip: {
    compress: zlib.gzipSync,
    extension: 'gz',
  },
  deflate: {
    compress: zlib.deflateSync,
    extension: 'dfl',
  },
  br: {
    compress: zlib.brotliCompressSync,
    extension: 'br',
  },
});

const compressionStreamTypes = Object.freeze({
  gzip: {
    compress: zlib.createGzip,
    extension: 'gz',
  },
  deflate: {
    compress: zlib.createDeflate,
    extension: 'dfl',
  },
  br: {
    compress: zlib.createBrotliCompress,
    extension: 'br',
  },
});

/**
 * @callback TyFuncSendComprFile
 * @param {import('node:http').ServerResponse} response
 * @param {string} filePath
 * @param {string} compressionType
 * @returns {import('node:http').ServerResponse} */

/** @type {TyFuncSendComprFile} */
function sendCompressedFile(
  response,
  filePath,
  compressionType,
) {
  if (!fs.existsSync(filePath)) {
    response.statusCode = 404;
    response.statusMessage = 'File not found';
    response.end('File not found');

    return response;
  }

  if (!(compressionType in compressionTypes)) {
    response.removeHeader('Content-Disposition');
    response.removeHeader('Content-Encoding');

    response.statusCode = 400;
    response.statusMessage = 'Unsupported compression type';
    response.end('Unsupported compression type');

    return response;
  }

  response.statusCode = 200;

  const dataBuffer = fs.readFileSync(filePath);
  const compressedDataBuffer
    = compressionTypes[compressionType].compress(dataBuffer);

  return response.end(compressedDataBuffer);
};

/** @type {TyFuncSendComprFile} */
function sendCompressedFileByStream(
  response,
  filePath,
  compressionType,
) {
  if (!fs.existsSync(filePath)) {
    response.statusCode = 404;
    response.statusMessage = 'File not found';
    response.end('File not found');

    return response;
  }

  if (!(compressionType in compressionStreamTypes)) {
    response.removeHeader('Content-Disposition');
    response.removeHeader('Content-Encoding');

    response.statusCode = 400;
    response.statusMessage = 'Unsupported compression type';
    response.end('Unsupported compression type');

    return response;
  }

  response.statusCode = 200;

  const fileStream = fs.createReadStream(filePath);
  const compressStream
    = compressionStreamTypes[compressionType].compress();

  fileStream
    .on('error', (err) => {
      console.info(err);
      response.statusCode = 500;
      response.statusMessage = 'Server error in fileStream';
      response.end('Server error in fileStream');
    })
    .pipe(compressStream)
    .on('error', (err) => {
      console.info(err);
      response.statusCode = 500;
      response.statusMessage = 'Server error in compressStream';
      response.end('Server error in compressStream');
    })
    .pipe(response);

  return response.on('close', () => {
    fileStream.destroy();
    compressStream.destroy();
  });
};

/**
 * @param {string} filePath
 * @param {string} marker
 * @returns {boolean} */
function removeFile(filePath, marker = 'none') {
  try {
    fs.unlinkSync(filePath);

    console.info(`
    Remoted ${filePath}
    \tmarker = ${marker}
    `);

    return true;
  } catch (error) {
    console.info(`
    Can't remoted ${filePath}
    \tmarker = ${marker}
    `);
    console.error(error);

    return false;
  }
}
