import React, { useState, useMemo } from "react";
import { useEditor } from "../hooks/editor/EditorProvider";
import { Button } from "@sofia/ui";

const wrapHtmlForIframe = (html) => {
  if (!html) return "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><p>Vide</p></body></html>";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_parent"></head><body>${html}</body></html>`;
};

const HistoryPanel = () => {
  const {
    isHistoryPanelOpen,
    pageVersions,
    isLoadingVersions,
    closeHistory,
    restoreVersion,
    compareMode,
    setCompareMode,
    compareSelected,
    setCompareSelected,
    compareResult,
    isLoadingCompare,
    compareError,
    compareVersions,
    closeCompare,
  } = useEditor();

  const [localError, setLocalError] = useState("");

  const sortedVersions = useMemo(() => {
    return [...pageVersions].sort((a, b) => b.versionNumber - a.versionNumber);
  }, [pageVersions]);

  const handleToggleCompare = (versionNumber) => {
    setLocalError("");
    setCompareSelected((prev) => {
      if (prev.includes(versionNumber)) {
        return prev.filter((v) => v !== versionNumber);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, versionNumber];
    });
  };

  const handleRunCompare = async () => {
    if (compareSelected.length !== 2) return;
    const [from, to] = compareSelected.sort((a, b) => a - b);
    await compareVersions(from, to);
  };

  const handleClose = () => {
    if (compareMode) {
      closeCompare();
    } else {
      closeHistory();
    }
  };

  if (!isHistoryPanelOpen) return null;

  const isCompareActive = compareMode && compareResult;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/30 md:items-start md:justify-end">
      <div className="mt-16 ml-auto h-full w-full max-w-2xl bg-white shadow-xl border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 p-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {isCompareActive ? "Comparaison des versions" : "Historique des versions"}
            </h3>
            <p className="text-sm text-slate-500">
              {isCompareActive
                ? "Rendu cÃ´te Ã  cÃ´te de deux versions"
                : compareMode
                  ? "SÃ©lectionnez exactement 2 versions Ã  comparer"
                  : "Restaurer une version prÃ©cÃ©dente de la page"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isCompareActive && (
              <Button
                onClick={() => {
                  setCompareMode((prev) => !prev);
                  setCompareSelected([]);
                  setCompareResult(null);
                  setLocalError("");
                }}
                className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold transition ${
                  compareMode
                    ? "bg-slate-900 text-white hover:bg-slate-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {compareMode ? "Annuler comparaison" : "ðŸ” Comparer"}
              </Button>
            )}
            {isCompareActive && (
              <Button
                onClick={closeCompare}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                â† Retour liste
              </Button>
            )}
            <Button
              onClick={handleClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="Fermer historique"
            >
              âœ•
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoadingVersions && <p className="text-sm text-slate-600">Chargement...</p>}

          {!isLoadingVersions && pageVersions.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Aucune version enregistrÃ©e pour l'instant.
            </div>
          )}

          {isCompareActive && compareResult && (
            <div className="flex flex-col gap-4">
              {(localError || compareError) && (
                <p className="text-sm text-red-600">{localError || compareError}</p>
              )}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex flex-col border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between bg-slate-50 p-3 border-b border-slate-200">
                    <div>
                      <span className="text-sm font-semibold text-slate-900">
                        Version {compareResult.from?.versionNumber}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        {compareResult.from?.createdAt ? new Date(compareResult.from.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <Button
                      onClick={() => restoreVersion(compareResult.from.versionNumber)}
                      className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                    >
                      Restaurer
                    </Button>
                  </div>
                  <iframe
                    title={`Version ${compareResult.from?.versionNumber}`}
                    srcDoc={wrapHtmlForIframe(compareResult.from?.html)}
                    className="w-full h-[70vh] border-0 bg-white"
                    sandbox="allow-same-origin"
                  />
                </div>
                <div className="flex-1 flex flex-col border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between bg-slate-50 p-3 border-b border-slate-200">
                    <div>
                      <span className="text-sm font-semibold text-slate-900">
                        Version {compareResult.to?.versionNumber}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        {compareResult.to?.createdAt ? new Date(compareResult.to.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <Button
                      onClick={() => restoreVersion(compareResult.to.versionNumber)}
                      className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                    >
                      Restaurer
                    </Button>
                  </div>
                  <iframe
                    title={`Version ${compareResult.to?.versionNumber}`}
                    srcDoc={wrapHtmlForIframe(compareResult.to?.html)}
                    className="w-full h-[70vh] border-0 bg-white"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}

          {!isCompareActive && !isLoadingVersions && pageVersions.length > 0 && (
            <>
              {(localError) && <p className="text-sm text-red-600 mb-3">{localError}</p>}
              <ul className="space-y-3">
                {sortedVersions.map((v) => {
                  const isSelected = compareSelected.includes(v.versionNumber);
                  const disabled = compareMode && !isSelected && compareSelected.length >= 2;
                  return (
                    <li
                      key={v.versionNumber}
                      className={`rounded-2xl border p-4 shadow-sm ${
                        isSelected ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"
                      } ${disabled ? "opacity-50" : ""}`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          {compareMode && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={disabled}
                              onChange={() => handleToggleCompare(v.versionNumber)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-900">Version {v.versionNumber}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(v.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {!compareMode && (
                          <Button
                            onClick={() => restoreVersion(v.versionNumber)}
                            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                          >
                            Restaurer
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {compareMode && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-600">
                    {compareSelected.length === 0
                      ? "SÃ©lectionnez exactement 2 versions Ã  comparer"
                      : compareSelected.length === 1
                        ? "1 version sÃ©lectionnÃ©e â€” encore 1 Ã  choisir"
                        : "2 versions sÃ©lectionnÃ©es â€” prÃªt Ã  comparer"}
                  </p>
                  <Button
                    onClick={handleRunCompare}
                    disabled={compareSelected.length !== 2 || isLoadingCompare}
                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingCompare ? "Chargement..." : "Comparer"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;

