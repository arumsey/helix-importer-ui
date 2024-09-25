const importStatus = {};

const resetImportStatus = () => {
  importStatus.startTime = 0;
  importStatus.imported = 0;
  importStatus.total = 0;
  importStatus.urls = [];
  importStatus.rows = [];
  importStatus.extraCols = [];
};

const ImportStatus = {
  getStatus: () => importStatus,
  reset: resetImportStatus,
  merge: (status = {}) => {
    Object.entries(status).forEach(([key, value]) => {
      importStatus[key] = value;
    });
  },
  addExtraCols: (key) => {
    if (!importStatus.extraCols.includes(key)) {
      importStatus.extraCols.push(key);
    }
  },
  addRow: (row) => {
    importStatus.rows.push(row);
  },
  incrementImported: () => {
    importStatus.imported += 1;
  },
};

export default ImportStatus;
