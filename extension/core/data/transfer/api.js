// Narrow transfer API. The shared facade installs legacy RhythiaX aliases.
(function () {
  var RhythiaX = self.RhythiaX = self.RhythiaX || {};
  RhythiaX.DataTransferApi = {
    createExport(records, options) { return RhythiaX.DataTransferSerialization.createExport(records, options); },
    validateExport(input) { return RhythiaX.DataTransferValidation.validateExport(input); },
    mergeRecords(existing, imported) { return RhythiaX.DataTransferConflictPolicy.mergeRecords(existing, imported); },
    validateRecordIdentity(current, candidate) { return RhythiaX.DataTransferConflictPolicy.identityErrors(current, candidate); },
    getPreview(input) { return RhythiaX.DataTransferRestoration.getPreview(input); },
    importExport(input, options) { return RhythiaX.DataTransferRestoration.importExport(input, options); },
  };
}());
