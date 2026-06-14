/**
 * File system protection public API.
 *
 * The implementation is split into validation, monitoring, and middleware
 * modules while preserving the original import path.
 */

import {
    validatePath,
    validateFilename,
    isAllowedExtension,
    scanFileContent,
    validateUploadedFile
} from './fileValidation.js';
import {
    setDbQuery,
    initFileProtectionTable,
    calculateFileHash,
    registerFilesForMonitoring,
    registerCriticalFiles,
    checkFileIntegrity,
    getRecentAlerts,
    startFileMonitoring,
    stopFileMonitoring
} from './fileProtectionMonitor.js';
import {
    uploadProtectionMiddleware,
    pathTraversalProtectionMiddleware
} from './fileProtectionMiddleware.js';

export {
    setDbQuery,
    initFileProtectionTable,
    validatePath,
    validateFilename,
    isAllowedExtension,
    scanFileContent,
    validateUploadedFile,
    calculateFileHash,
    registerFilesForMonitoring,
    registerCriticalFiles,
    checkFileIntegrity,
    getRecentAlerts,
    uploadProtectionMiddleware,
    pathTraversalProtectionMiddleware,
    startFileMonitoring,
    stopFileMonitoring
};

export default {
    setDbQuery,
    initFileProtectionTable,
    validatePath,
    validateFilename,
    isAllowedExtension,
    scanFileContent,
    validateUploadedFile,
    calculateFileHash,
    registerFilesForMonitoring,
    registerCriticalFiles,
    checkFileIntegrity,
    getRecentAlerts,
    uploadProtectionMiddleware,
    pathTraversalProtectionMiddleware,
    startFileMonitoring,
    stopFileMonitoring
};
