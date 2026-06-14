import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { serverEndpoint } from "../../config/appConfig";
import { useSelector } from "react-redux";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function SettleUpModal({ isOpen, setIsOpen, group, balances, refreshExpenses }) {
  const user = useSelector((state) => state.userDetails);
  const [membersState, setMembersState] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const members = useMemo(() => {
    return (balances || [])
      .filter((m) => m.email !== user?.email && m.amount > 0)
      .map((m) => ({ email: m.email, max: round2(m.amount) }));
  }, [balances, user?.email]);

  useEffect(() => {
    if (isOpen) {
      setMembersState(
        members.map((m) => ({
          ...m,
          amount: round2(m.max),
          selected: true,
          inputRaw: String(round2(m.max))
        }))
      );
      setNote("");
    }
  }, [isOpen, members]);

  const toggleMember = (email) =>
    setMembersState((prev) =>
      prev.map((m) => (m.email === email ? { ...m, selected: !m.selected } : m))
    );

  const handleFocus = (email) => {
    setMembersState((prev) =>
      prev.map((m) => (m.email === email ? { ...m, inputRaw: "" } : m))
    );
  };

  const handleAmountChange = (email, value) => {
    setMembersState((prev) =>
      prev.map((m) => {
        if (m.email !== email) return m;
        const raw = value.replace(/[^0-9.]/g, "");
        let num = parseFloat(raw);
        if (isNaN(num)) num = 0;
        return { ...m, inputRaw: raw, amount: round2(Math.min(num, m.max)) };
      })
    );
  };

  const handleBlur = (email) => {
    setMembersState((prev) =>
      prev.map((m) => {
        if (m.email !== email) return m;
        const num = parseFloat(m.inputRaw);
        const clamped = isNaN(num) ? 0 : round2(Math.min(num, m.max));
        return { ...m, amount: clamped, inputRaw: String(clamped) };
      })
    );
  };

  const totalPaying = round2(
    membersState
      .filter((m) => m.selected)
      .reduce((s, m) => s + Number(m.amount || 0), 0)
  );

  const handleSubmit = async () => {
    const settlements = membersState.filter((m) => m.selected && m.amount > 0);
    if (!settlements.length) return;
    setLoading(true);
    const groupId = group.id || group._id;
    try {
      await Promise.all(
        settlements.map((m) =>
          axios.post(
            `${serverEndpoint}/groups/${groupId}/settlements`,
            {
              fromUserEmail: user.email,
              toUserEmail: m.email,
              amount: round2(m.amount),
              currency: "INR",
              note
            }
          )
        )
      );
      setIsOpen(false);
      refreshExpenses();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getName = (email) => {
    const name = email.split("@")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={() => setIsOpen(false)} />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl z-10 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-850">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Settle Up</h3>
              <p className="text-xs text-slate-400 mt-0.5">Record payments to members you owe</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {membersState.length === 0 ? (
            <div className="text-center py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto mb-3">
                <i className="bi bi-check2-circle text-2xl" />
              </div>
              <h4 className="text-sm font-bold text-white">All settled up</h4>
              <p className="text-xs text-slate-400 mt-1">You don't owe anyone in this group.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Member rows */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {membersState.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center gap-3 rounded-xl bg-slate-950 border border-slate-850 p-3"
                  >
                    {/* Checkbox */}
                    <div
                      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
                        member.selected
                          ? "bg-violet-600 border-violet-650 text-white"
                          : "bg-transparent border-slate-700"
                      }`}
                      onClick={() => toggleMember(member.email)}
                    >
                      {member.selected && <i className="bi bi-check text-xs" />}
                    </div>

                    {/* Avatar */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/10 text-xs font-bold text-violet-400">
                      {member.email[0].toUpperCase()}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {getName(member.email)}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Owe ₹{member.max.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Amount Input */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-slate-500">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={member.max}
                        disabled={!member.selected}
                        value={member.inputRaw ?? member.amount}
                        onFocus={() => handleFocus(member.email)}
                        onChange={(e) => handleAmountChange(member.email, e.target.value)}
                        onBlur={() => handleBlur(member.email)}
                        className="bg-transparent border-none border-b border-slate-800 focus:border-violet-500 text-right font-extrabold text-sm text-yellow-500 w-16 p-0 outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note (optional)</label>
                <input
                  type="text"
                  placeholder="E.g. Paid via UPI"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Total Paying Summary */}
              <div className="flex justify-between items-center bg-slate-950 rounded-xl px-4 py-3 border border-slate-850 mt-1">
                <span className="text-xs text-slate-400 font-medium">Total Paying</span>
                <span className="text-lg font-black text-yellow-500 tracking-tight">
                  ₹{totalPaying.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {membersState.length > 0 && (
          <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-slate-850">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-750 px-4 py-3 text-sm font-bold text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || totalPaying === 0}
              className="flex-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-800/40 px-4 py-3 text-sm font-black text-slate-950 transition-all cursor-pointer"
            >
              {loading ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettleUpModal;
