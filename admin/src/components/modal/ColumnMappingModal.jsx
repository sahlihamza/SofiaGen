import { Modal, ModalBody, Select } from "@windmill/react-ui";
import React from "react";
import { FiAlertCircle, FiX } from "react-icons/fi";
import { IconButton, SecondaryButton } from "@sofia/ui";

//internal import
import { DEFAULTABLE_FIELDS, IMPORT_FIELDS } from "@/hooks/useProductFilter";
import { Button } from "@sofia/ui";

// Column mapping screen, shown right after a file is picked and before anything
// is imported. It lists every column found in the file with a sample of what it
// actually holds, the field it was auto-matched to, and a dropdown to correct
// that match or ignore the column entirely.
//
// Auto-detection only pre-fills this table â€” nothing is imported until the user
// confirms, so a column can never land in the wrong field unnoticed.
const ColumnMappingModal = ({
  isOpen,
  columns = [],
  rowCount = 0,
  errors = [],
  defaults = {},
  onChangeField,
  onChangeDefault,
  onReset,
  onClose,
  onRun,
}) => {
  if (!isOpen) return null;

  const mappedCount = columns.filter((c) => c.field).length;

  // A default only makes sense for a field no column feeds; once a column is
  // mapped to it, that column wins and the default is hidden.
  const mappedFields = new Set(
    columns.filter((c) => c.field).map((c) => c.field)
  );
  const availableDefaults = DEFAULTABLE_FIELDS.filter(
    (f) => !mappedFields.has(f.value)
  );

  return (
    // Windmill spreads the props over its own class, so this className replaces
    // the theme base outright: everything the window needs is spelled out here,
    // `custom-modal` included â€” that is the class hiding the close button
    // Windmill renders on its own, above ours.
    //
    // No height is set here. Windmill wraps the children in a focus-lock div of
    // its own, so a flex column started on this element would stop at that
    // wrapper and the content would simply overflow behind `overflow-hidden` â€”
    // which is what was cutting the footer buttons off. The cap lives on the
    // scrolling section instead, leaving the window as tall as its content:
    // small for a four-column file, and never taller than header + 60vh +
    // footer, so the buttons stay on screen whatever the file holds.
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full overflow-hidden bg-white rounded-lg dark:bg-gray-800 sm:m-4 !max-w-4xl custom-modal"
    >
      <ModalBody className="!m-0">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              Column mapping
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {columns.length} column(s) found in the file, {mappedCount} mapped
              â€” {rowCount} row(s) ready to import.

            </p>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 rounded-md hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 focus:outline-none"
          >
            <FiX size={20} />
          </IconButton>
        </div>

        {/* The one scrolling area of the window, and the only thing carrying a
            height limit â€” the header above and the buttons below sit outside

            it, so they are never scrolled away nor clipped. 60vh normally; the
            calc takes over on a short screen, where 60vh plus the header and
            the footer would not fit and the buttons would go off screen. */}
        <div className="px-6 py-4 max-h-[min(60vh,calc(100vh-14rem))] overflow-y-auto">
          {errors.length > 0 && (
            <div className="flex items-start gap-2 p-3 mb-4 text-sm text-red-600 rounded-md bg-red-50 dark:bg-gray-700">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <ul className="space-y-1">
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Deliberately no overflow of its own: a second scroll box here
              would capture the wheel and, being its own scroll container, would
              anchor the sticky header below to a box that never scrolls. */}
          <div className="rounded-md border border-gray-100 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                <tr className="text-left text-gray-500 dark:text-gray-300">
                  <th className="px-3 py-2 font-medium">Column in the file</th>
                  <th className="px-3 py-2 font-medium">Example value</th>
                  <th className="px-3 py-2 font-medium w-64">Product field</th>
                </tr>
              </thead>
              <tbody>
                {columns.map(({ header, sample, field }) => (
                  <tr
                    key={header}
                    className="border-t border-gray-100 dark:border-gray-700"
                  >
                    <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200 align-middle">
                      {header}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 align-middle">
                      <span className="block max-w-xs truncate" title={sample}>
                        {sample || "â€”"}

                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {/* `!h-9`: the theme's select base is h-12, which wins
                          over a plain h-9 and blows the row height up. */}
                      <Select
                        className="!h-9 text-sm"
                        value={field}
                        onChange={(e) => onChangeField(header, e.target.value)}
                      >
                        <option value="">Do not import</option>
                        {IMPORT_FIELDS.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Columns left on â€œDo not importâ€ are ignored. Rows are matched on SKU:

            an existing SKU updates that product, anything else creates a new one.
          </p>

          {availableDefaults.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Default values
              </h4>
              <p className="mt-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
                For fields the file has no column for. The chosen value is
                applied to every imported row; leave on â€œNo defaultâ€ to skip.

              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {availableDefaults.map(({ value, label, options }) => (
                  <label
                    key={value}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {label}
                    </span>
                    <Select
                      className="!h-9 text-sm w-40"
                      value={defaults[value] ?? ""}
                      onChange={(e) => onChangeDefault(value, e.target.value)}
                    >
                      <option value="">No default</option>
                      {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* The outline layout carries `w-full mr-3 h-12` from the theme, so the
            Cancel button needs w-auto/!mr-0 back on desktop and the primary one
            needs h-12 to line up with it. Both go full width when stacked. */}
        <div className="flex flex-col-reverse gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <SecondaryButton
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-gray-500 hover:text-emerald-600 hover:underline underline-offset-2 dark:text-gray-400 focus:outline-none"
          >
            Reset to detected
          </SecondaryButton>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <Button
              layout="outline"
              onClick={onClose}
              className="w-full sm:w-auto sm:min-w-[7rem] !mr-0"
            >
              Cancel
            </Button>
            <Button
              onClick={onRun}
              disabled={errors.length > 0}
              className="w-full h-12 sm:w-auto sm:min-w-[9rem]"
            >
              Run the import
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default ColumnMappingModal;
