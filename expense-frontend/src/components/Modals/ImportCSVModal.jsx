import { useState } from "react";
import axios from "axios";
import { serverEndpoint } from "../../config/appConfig";

function ImportCSVModal({ isOpen, setIsOpen, group, refreshExpenses }) {
  const groupId = group?.id || group?._id;

  const [step, setStep] = useState(1); // 1: Upload, 2: Review, 3: Success
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobData, setJobData] = useState(null); // contains id, anomalies
  const [editingAnomalyId, setEditingAnomalyId] = useState(null);
  
  // Local edit states for the active anomaly row
  const [editFields, setEditFields] = useState({
    date: "",
    description: "",
    amount: "",
    currency: "INR",
    paid_by: "",
    split_type: "equal",
    split_with: "",
    split_details: "",
    notes: "",
    is_settlement: false
  });
  const [editError, setEditError] = useState("");
  const [savingRowId, setSavingRowId] = useState(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setLoading(false);
    setError("");
    setJobData(null);
    setEditingAnomalyId(null);
    setEditError("");
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file first");
      return;
    }

    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `${serverEndpoint}/groups/${groupId}/expenses/import-csv`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );
      setJobData(res.data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload and validate CSV file.");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (anomaly) => {
    setEditingAnomalyId(anomaly.id);
    const data = anomaly.resolved_data || anomaly.raw_data || {};
    setEditFields({
      date: data.date || "",
      description: data.description || data.item || "",
      amount: data.amount || "",
      currency: data.currency || "INR",
      paid_by: data.paid_by || "",
      split_type: data.split_type || "equal",
      split_with: data.split_with || "",
      split_details: data.split_details || "",
      notes: data.notes || "",
      is_settlement: data.is_settlement || false
    });
    setEditError("");
  };

  const handleSaveAnomaly = async (anomalyId) => {
    setSavingRowId(anomalyId);
    setEditError("");
    try {
      const res = await axios.patch(
        `${serverEndpoint}/groups/${groupId}/expenses/import-csv/anomalies/${anomalyId}`,
        {
          status: "approved",
          resolved_data: editFields
        }
      );
      
      // Update anomaly in local jobData state
      setJobData((prev) => {
        const updatedAnomalies = prev.anomalies.map((an) =>
          an.id === anomalyId ? res.data : an
        );
        return { ...prev, anomalies: updatedAnomalies };
      });
      setEditingAnomalyId(null);
    } catch (err) {
      // Backend returns validation errors in description or response message
      const errors = err.response?.data?.errors;
      if (errors) {
        const formattedErr = Object.entries(errors)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        setEditError(formattedErr);
      } else {
        setEditError(err.response?.data?.message || "Failed to update row data");
      }
    } finally {
      setSavingRowId(null);
    }
  };

  const handleSkipAnomaly = async (anomalyId, currentStatus) => {
    const targetStatus = currentStatus === "ignored" ? "pending" : "ignored";
    try {
      const res = await axios.patch(
        `${serverEndpoint}/groups/${groupId}/expenses/import-csv/anomalies/${anomalyId}`,
        {
          status: targetStatus
        }
      );
      
      setJobData((prev) => {
        const updatedAnomalies = prev.anomalies.map((an) =>
          an.id === anomalyId ? res.data : an
        );
        return { ...prev, anomalies: updatedAnomalies };
      });
    } catch (err) {
      setError("Failed to skip row");
    }
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setError("");
    try {
      await axios.post(
        `${serverEndpoint}/groups/${groupId}/expenses/import-csv/${jobData.id}/confirm`
      );
      setStep(3);
      refreshExpenses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process import job.");
    } finally {
      setLoading(false);
    }
  };

  // Derived variables for Step 2 UI
  const totalRowsCount = jobData?.anomalies?.length || 0;
  const pendingCount = jobData?.anomalies?.filter((a) => a.status === "pending").length || 0;
  const ignoredCount = jobData?.anomalies?.filter((a) => a.status === "ignored").length || 0;
  const approvedCount = totalRowsCount - pendingCount - ignoredCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="fixed inset-0" onClick={reset} />

      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-850 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="bi bi-filetype-csv text-yellow-500" />
              <span>Import Expenses CSV</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {step === 1 && "Select or drag a CSV file to parse transactions"}
              {step === 2 && `Job #${jobData?.id} validation results`}
              {step === 3 && "Expenses successfully imported!"}
            </p>
          </div>
          <button
            onClick={() => {
              reset();
              setIsOpen(false);
            }}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* STEPPER STATUS SUB-BAR */}
        <div className="bg-slate-950 px-6 py-2.5 border-b border-slate-850 shrink-0 flex gap-6 text-[11px] font-bold text-slate-500">
          <div className={`flex items-center gap-1.5 ${step === 1 ? "text-yellow-500" : ""}`}>
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-800 text-[10px]">1</span>
            <span>Upload File</span>
          </div>
          <div className={`flex items-center gap-1.5 ${step === 2 ? "text-yellow-500" : ""}`}>
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-800 text-[10px]">2</span>
            <span>Review & Resolve ({pendingCount} pending)</span>
          </div>
          <div className={`flex items-center gap-1.5 ${step === 3 ? "text-yellow-500" : ""}`}>
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-800 text-[10px]">3</span>
            <span>Success</span>
          </div>
        </div>

        {/* BODY (Scrollable area) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-[300px]">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 mb-5 animate-in slide-in-from-top-1 duration-150">
              <i className="bi bi-exclamation-triangle-fill mr-2" />
              {error}
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-950/30 hover:bg-slate-950/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500 mb-4 border border-yellow-500/20">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {file ? file.name : "Choose CSV file"}
                </h4>
                <p className="text-xs text-slate-500 text-center max-w-sm">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB - Ready to upload`
                    : "Drag and drop your spreadsheet here, or click to browse. Only .csv files are supported."}
                </p>
              </div>

              {/* Sample format hint */}
              <div className="rounded-xl border border-slate-850 bg-slate-950 p-4">
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Expected CSV Headers
                </h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono text-slate-400">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="pb-1.5 pr-4 text-white">date</th>
                        <th className="pb-1.5 pr-4 text-white">description</th>
                        <th className="pb-1.5 pr-4 text-white">paid_by</th>
                        <th className="pb-1.5 pr-4 text-white">amount</th>
                        <th className="pb-1.5 pr-4 text-white">split_type</th>
                        <th className="pb-1.5 pr-4 text-white">split_with</th>
                        <th className="pb-1.5 pr-4 text-white">split_details</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="pt-1.5 pr-4">2026-06-15</td>
                        <td className="pt-1.5 pr-4">Pizza Dinner</td>
                        <td className="pt-1.5 pr-4">alice@example.com</td>
                        <td className="pt-1.5 pr-4">1200</td>
                        <td className="pt-1.5 pr-4">equal</td>
                        <td className="pt-1.5 pr-4">alice@example.com;bob@example.com</td>
                        <td className="pt-1.5 pr-4">-</td>
                      </tr>
                      <tr>
                        <td className="pt-1 pr-4">2026-06-16</td>
                        <td className="pt-1 pr-4">Taxi Ride</td>
                        <td className="pt-1 pr-4">bob@example.com</td>
                        <td className="pt-1 pr-4">300</td>
                        <td className="pt-1 pr-4">unequal</td>
                        <td className="pt-1 pr-4">alice@example.com;bob@example.com</td>
                        <td className="pt-1 pr-4">alice@example.com:200;bob@example.com:100</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW ANOMALIES AND ROWS */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Stats overview */}
              <div className="grid grid-cols-4 gap-3 bg-slate-950 border border-slate-850 p-4 rounded-xl shrink-0 text-center">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Total Rows</p>
                  <p className="text-lg font-extrabold text-white mt-0.5">{totalRowsCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Valid & Ready</p>
                  <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{approvedCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Errors Pending</p>
                  <p className="text-lg font-extrabold text-red-400 mt-0.5">{pendingCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Skipped</p>
                  <p className="text-lg font-extrabold text-slate-400 mt-0.5">{ignoredCount}</p>
                </div>
              </div>

              {/* Rows List */}
              <div className="space-y-3">
                {jobData?.anomalies?.map((anomaly) => {
                  const isEditing = editingAnomalyId === anomaly.id;
                  const rowData = anomaly.resolved_data || anomaly.raw_data || {};
                  
                  let badgeColor = "bg-red-500/10 border-red-500/20 text-red-400";
                  let badgeText = "Error";
                  let rowBorder = "border-red-900/35 hover:border-red-900/50";
                  
                  let errorDetails = null;
                  if (anomaly.status === "pending" && anomaly.description) {
                    try {
                      errorDetails = JSON.parse(anomaly.description);
                    } catch (e) {
                      errorDetails = anomaly.description;
                    }
                  }

                  if (anomaly.status === "approved") {
                    if (anomaly.anomaly_type === "settlement" || rowData.is_settlement) {
                      badgeColor = "bg-blue-500/10 border-blue-500/20 text-blue-400";
                      badgeText = "Settlement";
                      rowBorder = "border-blue-900/30 hover:border-blue-900/40";
                    } else if (anomaly.anomaly_type === "missing_currency") {
                      badgeColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                      badgeText = "Ready: Fixed Currency";
                      rowBorder = "border-slate-800 hover:border-slate-750";
                    } else {
                      badgeColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                      badgeText = "Ready";
                      rowBorder = "border-slate-800 hover:border-slate-750";
                    }
                  } else if (anomaly.status === "ignored") {
                    badgeColor = "bg-slate-800 border-slate-700 text-slate-400";
                    badgeText = "Skipped";
                    rowBorder = "border-slate-800 opacity-60";
                  } else if (anomaly.status === "pending") {
                    if (errorDetails && errorDetails.duplicate) {
                      badgeColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                      badgeText = "Duplicate?";
                      rowBorder = "border-amber-900/30 hover:border-amber-900/40";
                    }
                  }

                  return (
                    <div
                      key={anomaly.id}
                      className={`rounded-xl border bg-slate-900/40 p-4 transition-all duration-150 ${rowBorder}`}
                    >
                      {/* Read mode header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-950 px-2 py-0.5 border border-slate-850 rounded">
                              Row #{anomaly.row_index}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${badgeColor}`}>
                              {badgeText}
                            </span>
                            <h4 className="text-sm font-bold text-white truncate max-w-sm">
                              {rowData.description || "(No Description)"}
                            </h4>
                          </div>
                          
                          {/* Sub-info list */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                            <span>
                              <span className="text-slate-500">Amount:</span>{" "}
                              <strong className="text-yellow-500 font-bold">
                                {rowData.amount ? `${rowData.amount} ${rowData.currency || "INR"}` : "-"}
                              </strong>
                            </span>
                            <span>
                              <span className="text-slate-500">Paid By:</span> {rowData.paid_by || "-"}
                            </span>
                            <span>
                              <span className="text-slate-500">Date:</span> {rowData.date || "-"}
                            </span>
                            <span>
                              <span className="text-slate-500">Split:</span> {rowData.split_type || "equal"}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-end border-t md:border-t-0 border-slate-850 pt-3.5 md:pt-0">
                            <button
                              onClick={() => startEditing(anomaly)}
                              className="rounded-lg bg-slate-800 border border-slate-750 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors"
                            >
                              <i className="bi bi-pencil mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleSkipAnomaly(anomaly.id, anomaly.status)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                                anomaly.status === "ignored"
                                  ? "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
                                  : "bg-transparent border-slate-850 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              {anomaly.status === "ignored" ? "Keep Row" : "Skip Row"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Display validation errors in read-mode if they exist */}
                      {anomaly.status === "pending" && !isEditing && errorDetails && (
                        <div className="mt-3.5 rounded-lg bg-red-950/20 border border-red-900/30 p-3 text-xs text-red-400/90 font-medium">
                          <p className="font-bold text-red-400 mb-1">Validation Errors:</p>
                          <ul className="list-disc pl-4 space-y-1">
                            {typeof errorDetails === "object" ? (
                              Object.entries(errorDetails).map(([field, msg]) => (
                                <li key={field}>
                                  <span className="font-bold capitalize">{field.replace("_", " ")}</span>: {msg}
                                </li>
                              ))
                            ) : (
                              <li>{errorDetails}</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* INLINE EDIT FORM */}
                      {isEditing && (
                        <div className="mt-4 border-t border-slate-850 pt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                          {editError && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2">
                              {editError}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                              <input
                                type="text"
                                value={editFields.description}
                                onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Date</label>
                              <input
                                type="text"
                                placeholder="YYYY-MM-DD"
                                value={editFields.date}
                                onChange={(e) => setEditFields({ ...editFields, date: e.target.value })}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Paid By (Payer Email)</label>
                              <input
                                type="email"
                                value={editFields.paid_by}
                                onChange={(e) => setEditFields({ ...editFields, paid_by: e.target.value })}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editFields.amount}
                                onChange={(e) => setEditFields({ ...editFields, amount: e.target.value })}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Currency</label>
                              <input
                                type="text"
                                value={editFields.currency}
                                onChange={(e) => setEditFields({ ...editFields, currency: e.target.value })}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Split Type</label>
                              <select
                                value={editFields.split_type}
                                onChange={(e) => setEditFields({ ...editFields, split_type: e.target.value })}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                              >
                                <option value="equal">equal</option>
                                <option value="unequal">unequal</option>
                                <option value="percentage">percentage</option>
                                <option value="share">share</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Split With (Semicolon separated emails)</label>
                              <input
                                type="text"
                                placeholder="E.g. member1@email.com;member2@email.com"
                                value={editFields.split_with}
                                onChange={(e) => setEditFields({ ...editFields, split_with: e.target.value })}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Split Details (Format: email:value;email:value)</label>
                              <input
                                type="text"
                                placeholder="E.g. member1@email.com:500;member2@email.com:700"
                                value={editFields.split_details}
                                onChange={(e) => setEditFields({ ...editFields, split_details: e.target.value })}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 py-1.5 bg-slate-950/45 p-3 rounded-lg border border-slate-850/65">
                            <input
                              type="checkbox"
                              id={`is-settlement-${anomaly.id}`}
                              checked={editFields.is_settlement}
                              onChange={(e) => setEditFields({ ...editFields, is_settlement: e.target.checked })}
                              className="rounded border-slate-800 bg-slate-950 text-yellow-500 focus:ring-yellow-500 h-4 w-4 cursor-pointer accent-yellow-500"
                            />
                            <label htmlFor={`is-settlement-${anomaly.id}`} className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                              Import as a debt settlement / repayment instead of an expense
                            </label>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Notes</label>
                            <textarea
                              rows={2}
                              value={editFields.notes}
                              onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })}
                              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none resize-none"
                            />
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingAnomalyId(null)}
                              className="rounded-lg bg-slate-800 hover:bg-slate-750 px-3.5 py-1.5 text-xs font-bold text-slate-300 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={savingRowId === anomaly.id}
                              onClick={() => handleSaveAnomaly(anomaly.id)}
                              className="rounded-lg bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-800/40 px-3.5 py-1.5 text-xs font-black text-slate-950 transition-colors"
                            >
                              {savingRowId === anomaly.id ? "Validating..." : "Validate & Save"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-10 text-center max-w-sm mx-auto">
              <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 mb-4 animate-in zoom-in-75 duration-200">
                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Import Successful!</h3>
              <p className="text-sm text-slate-400 mb-6">
                All transactions have been successfully recorded in this group. Balances and members have been updated.
              </p>
              <button
                onClick={() => {
                  reset();
                  setIsOpen(false);
                }}
                className="w-full rounded-xl bg-yellow-500 hover:bg-yellow-600 px-5 py-3 text-sm font-black text-slate-950 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {step < 3 && (
          <div className="flex justify-between items-center gap-3 px-6 pb-6 pt-4 border-t border-slate-850 shrink-0 bg-slate-900">
            {step === 2 && (
              <button
                onClick={reset}
                className="rounded-xl bg-slate-800 hover:bg-slate-750 px-5 py-2.5 text-sm font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Back to Upload
              </button>
            )}

            <div className="ml-auto flex gap-2">
              <button
                onClick={() => {
                  reset();
                  setIsOpen(false);
                }}
                className="rounded-xl bg-transparent hover:bg-slate-800 px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>

              {step === 1 && (
                <button
                  disabled={loading || !file}
                  onClick={handleUpload}
                  className="rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-800/40 px-5 py-2.5 text-sm font-black text-slate-950 transition-all cursor-pointer"
                >
                  {loading ? "Parsing File..." : "Upload & Validate"}
                </button>
              )}

              {step === 2 && (
                <button
                  disabled={loading || pendingCount > 0}
                  onClick={handleConfirmImport}
                  className="rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-800/40 px-5 py-2.5 text-sm font-black text-slate-950 transition-all cursor-pointer"
                >
                  {loading
                    ? "Importing..."
                    : pendingCount > 0
                    ? `Resolve Errors (${pendingCount})`
                    : `Confirm Import (${approvedCount} rows)`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportCSVModal;
