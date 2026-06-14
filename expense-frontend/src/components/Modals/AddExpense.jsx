import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { serverEndpoint } from "../../config/appConfig";

const round2 = (num) =>
  Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const isClose = (a, b) => Math.abs(a - b) < 0.01;

const CATEGORIES = [
  { name: "Food", icon: "bi-cup-hot" },
  { name: "Travel", icon: "bi-airplane" },
  { name: "Shopping", icon: "bi-bag" },
  { name: "Bills", icon: "bi-receipt" },
  { name: "Entertainment", icon: "bi-film" },
  { name: "Health", icon: "bi-heart-pulse" },
  { name: "Other", icon: "bi-three-dots" }
];

const STEPS = ["Details", "Paid By", "Split", "Preview"];

function AddExpense({ setIsOpen, isOpen, group, refreshExpenses }) {
  const groupMembers = group?.memberEmail || [];

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [category, setCategory] = useState("Food");
  const [customCategory, setCustomCategory] = useState("");

  const [participants, setParticipants] = useState([]);
  const [payments, setPayments] = useState({});
  const [splits, setSplits] = useState({});
  
  // splitType can be: "equal", "unequal", "percentage", "share"
  const [splitType, setSplitType] = useState("equal");
  const [customType, setCustomType] = useState("unequal"); // unequal, percentage, share

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ── RESET ── */
  const reset = () => {
    setStep(1);
    setTitle("");
    setAmount("");
    setCategory("Food");
    setCustomCategory("");
    setParticipants([]);
    setPayments({});
    setSplits({});
    setSplitType("equal");
    setCustomType("unequal");
    setError("");
  };

  /* ── INIT ── */
  useEffect(() => {
    if (!isOpen) return;
    setParticipants(groupMembers);
    const pay = {}, split = {};
    groupMembers.forEach((e) => {
      pay[e] = 0;
      split[e] = 0;
    });
    setPayments(pay);
    setSplits(split);
  }, [isOpen, groupMembers]);

  /* ── SYNC ── */
  useEffect(() => {
    setPayments((prev) => {
      const next = {};
      participants.forEach((p) => (next[p] = prev[p] || 0));
      return next;
    });
    setSplits((prev) => {
      const next = {};
      participants.forEach((p) => (next[p] = prev[p] || 0));
      return next;
    });
  }, [participants]);

  /* ── DERIVED ── */
  const numAmount = round2(amount);
  const finalCategory =
    category === "Other" && customCategory.trim()
      ? customCategory.trim()
      : category;

  const equalShare = useMemo(() => {
    if (!participants.length || !numAmount) return 0;
    return round2(numAmount / participants.length);
  }, [participants, numAmount]);

  useEffect(() => {
    if (splitType !== "equal") return;
    setSplits(() => {
      const updated = {};
      participants.forEach((p) => {
        updated[p] = equalShare;
      });
      return updated;
    });
  }, [equalShare, splitType, participants]);

  const totalPaid = round2(
    Object.values(payments).reduce((a, b) => a + Number(b || 0), 0)
  );
  
  const totalSplit = useMemo(() => {
    return round2(Object.values(splits).reduce((a, b) => a + Number(b || 0), 0));
  }, [splits]);

  // Total shares sum for ratio calculating
  const totalShares = useMemo(() => {
    if (splitType !== "share") return 0;
    return Object.values(splits).reduce((a, b) => a + Number(b || 0), 0);
  }, [splits, splitType]);

  const handleCustomTypeChange = (type) => {
    setCustomType(type);
    setSplitType(type);
    // Reset splits inputs to 0
    const cleared = {};
    participants.forEach((p) => (cleared[p] = 0));
    setSplits(cleared);
  };

  /* ── VALIDATE ── */
  const validateStep = (target) => {
    if (target === 2) {
      if (!title.trim()) return "Expense title required";
      if (!numAmount || numAmount <= 0) return "Enter valid amount";
      if (category === "Other" && !customCategory.trim())
        return "Enter custom category";
    }
    if (target === 3) {
      if (!participants.length) return "Select at least one participant";
      if (!isClose(totalPaid, numAmount))
        return `Paid total (₹${totalPaid.toFixed(2)}) must equal expense amount ₹${numAmount.toFixed(2)}`;
    }
    if (target === 4) {
      if (splitType === "unequal" && !isClose(totalSplit, numAmount)) {
        return `Split total (₹${totalSplit.toFixed(2)}) must equal ₹${numAmount.toFixed(2)}`;
      }
      if (splitType === "percentage" && !isClose(totalSplit, 100)) {
        return `Percentages sum (${totalSplit}%) must equal exactly 100%`;
      }
      if (splitType === "share" && totalSplit <= 0) {
        return `Total shares must be greater than 0`;
      }
    }
    return null;
  };

  /* ── SUBMIT ── */
  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const groupId = group.id || group._id;
    try {
      const calculatedSplits = participants.map((email) => {
        let share = 0;
        let share_value = Number(splits[email] || 0);

        if (splitType === "equal") {
          share = equalShare;
          share_value = equalShare;
        } else if (splitType === "unequal") {
          share = round2(splits[email] || 0);
          share_value = round2(splits[email] || 0);
        } else if (splitType === "percentage") {
          share = round2((Number(splits[email] || 0) / 100) * numAmount);
          share_value = round2(splits[email] || 0);
        } else if (splitType === "share") {
          share = totalShares > 0 ? round2((Number(splits[email] || 0) / totalShares) * numAmount) : 0;
          share_value = round2(splits[email] || 0);
        }

        return {
          email,
          share,
          share_value,
          remaining: share
        };
      });

      await axios.post(
        `${serverEndpoint}/groups/${groupId}/expenses`,
        {
          title,
          category: finalCategory,
          currency,
          amount: numAmount,
          splitType,
          paidBy: participants.map((email) => ({
            email,
            amount: round2(payments[email])
          })),
          splits: calculatedSplits
        }
      );
      reset();
      setIsOpen(false);
      refreshExpenses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create expense");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const err = validateStep(step + 1);
    if (err) return setError(err);
    setError("");
    setStep((s) => s + 1);
  };

  const toggleParticipant = (email) => {
    setParticipants((prev) =>
      prev.includes(email) ? prev.filter((p) => p !== email) : [...prev, email]
    );
  };

  const getName = (email) => {
    const name = email.split("@")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={() => {
          reset();
          setIsOpen(false);
        }}
      />
      
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl z-10 animate-in fade-in zoom-in duration-200">
        {/* HEADER */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-850">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Add Expense</h3>
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

          {/* Steps Indicator */}
          <div className="flex gap-2">
            {STEPS.map((label, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={label} className="flex-1">
                  <div
                    className={`h-1 rounded-full mb-1.5 transition-all duration-305 ${
                      isDone
                        ? "bg-violet-500 opacity-60"
                        : isActive
                        ? "bg-violet-500 opacity-100"
                        : "bg-slate-800 opacity-40"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold ${
                      isActive ? "text-violet-400" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* BODY */}
        <div className="px-6 py-6 min-h-[280px]">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2.5 mb-5 animate-in slide-in-from-top-1 duration-200">
              {error}
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  placeholder="What's this expense for?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white focus:border-violet-500 focus:outline-none transition-colors"
                  >
                    <option>INR</option>
                    <option>USD</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.name;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => setCategory(cat.name)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
                            : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <i className={`bi ${cat.icon}`} />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {category === "Other" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Category</label>
                  <input
                    type="text"
                    placeholder="E.g. Services"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition-colors"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Paid By */}
          {step === 2 && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Select participants and enter paid amount
              </span>

              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {groupMembers.map((email) => {
                  const included = participants.includes(email);
                  return (
                    <div
                      key={email}
                      onClick={() => toggleParticipant(email)}
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all duration-150 ${
                        included
                          ? "bg-slate-950 border-violet-500/20"
                          : "bg-transparent border-transparent hover:bg-slate-950/45"
                      }`}
                    >
                      {/* Custom check */}
                      <div
                        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                          included
                            ? "bg-violet-600 border-violet-650 text-white"
                            : "bg-transparent border-slate-700"
                        }`}
                      >
                        {included && <i className="bi bi-check text-xs" />}
                      </div>

                      {/* Avatar */}
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/10 text-xs font-bold text-violet-400">
                        {email[0].toUpperCase()}
                      </div>

                      {/* Name */}
                      <span className="flex-1 text-sm font-semibold text-slate-200 truncate">
                        {getName(email)}
                      </span>

                      {/* Paid input */}
                      {included && (
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-xs text-slate-500">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={payments[email] || ""}
                            onChange={(e) =>
                              setPayments((prev) => ({
                                ...prev,
                                [email]: e.target.value
                              }))
                            }
                            className="bg-transparent border-none border-b border-slate-800 focus:border-violet-500 text-right font-extrabold text-sm text-yellow-500 w-16 p-0 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Paid indicator */}
              <div className="flex justify-between items-center bg-slate-950 rounded-xl px-4 py-3 border border-slate-850">
                <span className="text-xs text-slate-400 font-medium">Total Paid</span>
                <span
                  className={`text-sm font-extrabold ${
                    isClose(totalPaid, numAmount) ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  ₹{totalPaid.toFixed(2)}{" "}
                  <span className="text-slate-500 font-normal">
                    / ₹{numAmount.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Split */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-850">
                <button
                  onClick={() => setSplitType("equal")}
                  className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all cursor-pointer ${
                    splitType === "equal"
                      ? "bg-violet-600/15 text-violet-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Split Equally
                </button>
                <button
                  onClick={() => handleCustomTypeChange(customType)}
                  className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all cursor-pointer ${
                    splitType !== "equal"
                      ? "bg-violet-600/15 text-violet-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Custom Split
                </button>
              </div>

              {splitType === "equal" ? (
                <div className="flex flex-col items-center justify-center py-8 bg-slate-950 rounded-2xl border border-slate-850/80">
                  <span className="text-xs text-slate-500 font-medium">Each person owes</span>
                  <span className="text-3xl font-black text-yellow-500 mt-2 tracking-tight">
                    ₹{equalShare.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold mt-1">
                    Owed by {participants.length}{" "}
                    {participants.length === 1 ? "participant" : "participants"}
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Custom Split Sub-selector */}
                  <div className="flex gap-2 rounded-lg bg-slate-950 p-1 border border-slate-850/60">
                    {[
                      { type: "unequal", label: "Amounts" },
                      { type: "percentage", label: "Percentages" },
                      { type: "share", label: "Shares" }
                    ].map((mode) => (
                      <button
                        key={mode.type}
                        onClick={() => handleCustomTypeChange(mode.type)}
                        className={`flex-1 rounded py-1.5 text-center text-[11px] font-bold transition-all cursor-pointer ${
                          splitType === mode.type
                            ? "bg-slate-900 border border-slate-800 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {participants.map((email) => {
                      let computedVal = 0;
                      if (splitType === "percentage") {
                        computedVal = (Number(splits[email] || 0) / 100) * numAmount;
                      } else if (splitType === "share") {
                        computedVal = totalShares > 0 ? (Number(splits[email] || 0) / totalShares) * numAmount : 0;
                      }

                      return (
                        <div
                          key={email}
                          className="flex items-center gap-3 rounded-xl bg-slate-955 border border-slate-850/60 p-3"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/10 text-xs font-bold text-violet-400">
                            {email[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-200 truncate">
                              {getName(email)}
                            </p>
                            {splitType !== "unequal" && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Share: ₹{computedVal.toFixed(2)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {splitType === "unequal" && <span className="text-xs text-slate-500">₹</span>}
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0"
                              value={splits[email] || ""}
                              onChange={(e) =>
                                setSplits((prev) => ({
                                  ...prev,
                                  [email]: e.target.value
                                }))
                              }
                              className="bg-transparent border-none border-b border-slate-800 focus:border-violet-500 text-right font-extrabold text-sm text-yellow-500 w-16 p-0 outline-none"
                            />
                            {splitType === "percentage" && <span className="text-xs text-slate-500">%</span>}
                            {splitType === "share" && <span className="text-xs text-slate-500">x</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center bg-slate-950 rounded-xl px-4 py-3 border border-slate-850">
                    <span className="text-xs text-slate-400 font-medium">
                      {splitType === "unequal" && "Split Sum"}
                      {splitType === "percentage" && "Percentages Sum"}
                      {splitType === "share" && "Total Shares"}
                    </span>
                    <span
                      className={`text-sm font-extrabold ${
                        (splitType === "unequal" && isClose(totalSplit, numAmount)) ||
                        (splitType === "percentage" && isClose(totalSplit, 100)) ||
                        (splitType === "share" && totalSplit > 0)
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {splitType === "unequal" && (
                        <>
                          ₹{totalSplit.toFixed(2)}{" "}
                          <span className="text-slate-500 font-normal">
                            / ₹{numAmount.toFixed(2)}
                          </span>
                        </>
                      )}
                      {splitType === "percentage" && (
                        <>
                          {totalSplit.toFixed(1)}%{" "}
                          <span className="text-slate-500 font-normal">/ 100%</span>
                        </>
                      )}
                      {splitType === "share" && <>{totalSplit} shares</>}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Preview */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Summary Hero */}
              <div className="text-center py-4 bg-slate-950 rounded-2xl border border-slate-850/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {finalCategory}
                </span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  {title}
                </h4>
                <h2 className="text-3xl font-black text-yellow-500 mt-2 tracking-tight">
                  ₹{numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  <span className="text-xs font-semibold text-slate-400 ml-1.5">
                    {currency}
                  </span>
                </h2>
              </div>

              {/* Paid By summary */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Paid By
                </span>
                <div className="space-y-1.5">
                  {participants
                    .filter((e) => round2(payments[e]) > 0)
                    .map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-850/40 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600/10 text-[10px] font-bold text-violet-400">
                            {email[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-200">
                            {getName(email)}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-white">
                          ₹{round2(payments[email]).toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Split Summary */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Split Share ({splitType})
                </span>
                <div className="space-y-1.5">
                  {participants.map((email) => {
                    let share = 0;
                    if (splitType === "equal") {
                      share = equalShare;
                    } else if (splitType === "unequal") {
                      share = round2(splits[email] || 0);
                    } else if (splitType === "percentage") {
                      share = round2((Number(splits[email] || 0) / 100) * numAmount);
                    } else if (splitType === "share") {
                      share = totalShares > 0 ? round2((Number(splits[email] || 0) / totalShares) * numAmount) : 0;
                    }

                    return (
                      <div
                        key={email}
                        className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-850/40 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600/10 text-[10px] font-bold text-violet-400">
                            {email[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-200">
                            {getName(email)}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-yellow-500">
                          ₹{share.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-slate-850">
          <button
            onClick={() =>
              step === 1 ? (reset(), setIsOpen(false)) : setStep(step - 1)
            }
            className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-750 px-4 py-3 text-sm font-bold text-slate-300 transition-colors cursor-pointer"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            disabled={loading}
            onClick={() => (step < 4 ? handleNext() : handleSubmit())}
            className="flex-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-800/40 px-4 py-3 text-sm font-black text-slate-950 transition-all cursor-pointer"
          >
            {loading
              ? "Saving..."
              : step === 4
              ? "Add Expense"
              : step === 3
              ? "Preview"
              : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddExpense;
