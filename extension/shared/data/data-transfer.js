// Compatibility facade for the ordered core/data/transfer providers.
var RhythiaX = RhythiaX || {};

RhythiaX.DATA_EXPORT_TYPE = 'rhythiax-data-export';
RhythiaX.DATA_EXPORT_VERSION = 1;
RhythiaX.createDataExport = function (records, options) { return RhythiaX.DataTransferApi.createExport(records, options); };
RhythiaX.validateDataExport = function (input) { return RhythiaX.DataTransferApi.validateExport(input); };
RhythiaX.mergeDataExportRecords = function (existing, imported) { return RhythiaX.DataTransferApi.mergeRecords(existing, imported); };
RhythiaX.validateDataRecordIdentity = function (current, candidate) { return RhythiaX.DataTransferApi.validateRecordIdentity(current, candidate); };
RhythiaX.getDataExportPreview = function (input) { return RhythiaX.DataTransferApi.getPreview(input); };
RhythiaX.importDataExport = function (input, options) { return RhythiaX.DataTransferApi.importExport(input, options); };
