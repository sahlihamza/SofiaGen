import { Badge, Modal, ModalBody } from "@windmill/react-ui";
import React from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";
import { IconButton } from "@sofia/ui";

// Final step of the product import: what landed and what did not.
// `report` is { notices: [...], summary: { total, created, updated, skipped },
// rows: [...] } where each row is a skipped one, carrying the file line that
// produced it so the user can go fix that line. `notices` are run-wide problems
// (e.g. categories or brands could not be loaded because of an expired token).
// An import with nothing skipped shows the counters alone.
const ImportReportModal = ({ report, onClose }) => {
  if (!report) return null;

  const { summary, rows = [], notices = [] } = report;

  const tiles = [
    { label: "Rows read", value: summary.total, tone: "neutral" },
    { label: "Created", value: summary.created, tone: "success" },
    { label: "Updated", value: summary.updated, tone: "primary" },
    { label: "Skipped", value: summary.skipped, tone: "danger" },
  ];

  return (
    // Same structure and width as the mapping window it replaces, so the import
    // does not change shape between the two steps: no height on the window
    // itself, a cap on the scrolling section only, and the buttons outside it.
    // See ColumnMappingModal for why the height cannot live up here.
    <Modal
      isOpen={Boolean(report)}
      onClose={onClose}
      className="w-full overflow-hidden bg-white rounded-lg dark:bg-gray-800 sm:m-4 !max-w-4xl custom-modal"
    >
      <ModalBody className="!m-0">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Import report
import { Button } from "@sofia/ui";
          </h3>
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

        <div className="px-6 py-4 max-h-[min(60vh,calc(100vh-14rem))] overflow-y-auto">
          {notices.length > 0 && (
            <div className="flex items-start gap-2 p-3 mb-4 text-sm text-amber-700 rounded-md bg-amber-50 dark:bg-gray-700 dark:text-amber-300">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <ul className="space-y-1">
                {notices.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map(({ label, value, tone }) => (
              <div
                key={label}
                className="p-3 text-center rounded-md bg-gray-50 dark:bg-gray-700"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {label}
                </div>
                <div className="mt-1">
                  <Badge type={tone}>{value ?? 0}</Badge>
                </div>
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Every row was imported. The original products keep any column the
              file left blank.
            </p>
          ) : (
            <>
              <p className="mt-5 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Skipped rows ({rows.length}) â€” fix these lines and import again.
                Everything else was saved.
              </p>
              {/* No scroll box of its own: the section above scrolls, which is
                  also what the sticky header below anchors to. */}
              <div className="rounded-md border border-gray-100 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                    <tr className="text-left text-gray-500 dark:text-gray-300">
                      <th className="px-3 py-2 font-medium">Line</th>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">SKU</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={`${row.line}-${i}`}
                        className="border-t border-gray-100 dark:border-gray-700"
                      >
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                          {row.line ?? "â€”"}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                          {row.productName || "â€”"}
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                          {row.sku || "â€”"}
                        </td>
                        <td className="px-3 py-2 text-red-500">{row.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            onClick={onClose}
            className="w-full h-12 sm:w-auto sm:min-w-[7rem]"
          >
            Close
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default ImportReportModal;
