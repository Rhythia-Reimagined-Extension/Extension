# Data and Backups

## Local extension data

Rhythia Reimagined stores its extension data locally in the browser. Depending
on the features used, this includes settings, local history, calculated
statistics, profile and score data used by the extension, progression and rank
tracking data, comparison data, and backup configuration.

This data remains on the device until it is deleted through the extension or
browser, or until browser extension data is cleared. It is not uploaded or
synchronized by the extension.

The extension reads the official Rhythia session value from browser local
storage only when needed for an authenticated Rhythia API request. The value is
used transiently and is not retained by the extension.

## Export, import, and clipboard

Exports are created locally on the device. Imports use a file the user chooses
and may add or replace local extension data. Copy actions write the selected
information to the system clipboard only when initiated by the user. Handle
exports, imports, and clipboard contents as private information.

## Optional backups

Backups are disabled by default. When enabled, manual, automatic, and recovery
backups are written only to the folder selected by the user. The extension does
not upload, synchronize, or share those files.

Backups can contain the local data described above. They remain in the selected
folder until removed by the user or by retention settings configured in the
extension. Choose a protected folder and remove backups that are no longer
needed.

## Before clearing or removing data

1. Export local data or create a backup if you may want to restore it later.
2. Confirm that the export or backup is stored in a location you can access.
3. Delete local extension data through the extension or browser when desired.
4. Remove backup files separately if you no longer want to retain them.

Clearing local data or deleting backups does not remove information held by
Rhythia or Capo Games. See the [Privacy Policy](PRIVACY.md) for the full data
handling disclosure.
