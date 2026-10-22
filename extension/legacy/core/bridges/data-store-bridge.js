// RhythiaX canonical data boundary. Repository ownership remains unchanged.
var RhythiaX = RhythiaX || {};

RhythiaX.DataStoreBridge = {
  whenReady() {
    return Promise.resolve(RhythiaX.dataRepositoryReady);
  },
  getSettings(...args) {
    return RhythiaX.getDataSettings(...args);
  },
  saveSettings(...args) {
    return RhythiaX.saveDataSettings(...args);
  },
  getRecord(...args) {
    return RhythiaX.getDataRecord(...args);
  },
  saveRecord(...args) {
    return RhythiaX.saveDataRecord(...args);
  },
  removeRecord(...args) {
    return RhythiaX.removeDataRecord(...args);
  },
  listRecords(...args) {
    return RhythiaX.listDataRecords(...args);
  },
  clearRecords(...args) {
    return RhythiaX.clearDataRecords(...args);
  },
};
