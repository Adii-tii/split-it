import { useSelector } from "react-redux";

function ExpenseDetailsModal({ expense, isOpen, onClose }) {
  const user = useSelector((state) => state.userDetails);

  if (!isOpen || !expense) return null;

  const money = (val) => Number(val || 0).toFixed(2);

  const splits = expense.splits || [];
  const paidBy = expense.paidBy || [];

  const createdBy =
    expense.createdByEmail ||
    expense.createdBy?.email ||
    "Unknown";

  const myShare = splits.find((s) => s.email === user.email)?.share || 0;
  const myPaid = paidBy.find((p) => p.email === user.email)?.amount || 0;
  const myBalance = myPaid - myShare;

  const getStatusText = () => {
    if (myBalance > 0) return `You will receive ₹${money(myBalance)}`;
    if (myBalance < 0) return `You owe ₹${money(Math.abs(myBalance))}`;
    return "No dues";
  };

  const getStatusColor = () => {
    if (myBalance > 0) return "text-emerald-400";
    if (myBalance < 0) return "text-red-400";
    return "text-slate-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl z-10 animate-in fade-in zoom-in duration-200">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-850">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white truncate">
                {expense.title || expense.description}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(expense.createdAt || expense.created_at).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Created by{" "}
                <span className="font-semibold text-slate-200">
                  {createdBy === user.email ? "You" : createdBy}
                </span>
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-yellow-500 tracking-tight">
                ₹{money(expense.amount)}
              </p>
              <p className={`text-xs font-bold mt-1 ${getStatusColor()}`}>
                {getStatusText()}
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="px-6 py-5 space-y-5">
          {/* PAID BY */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
              Paid by
            </span>
            <div className="space-y-2">
              {paidBy.map((p) => (
                <div key={p.email} className="flex justify-between items-center bg-slate-950/45 px-3 py-2 rounded-xl border border-slate-850">
                  <span className="text-sm text-slate-300 font-medium">
                    {p.email === user.email ? "You" : p.email}
                  </span>
                  <span className="text-sm text-white font-extrabold">
                    ₹{money(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SPLITS */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
              Split details
            </span>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {splits.map((s) => (
                <div key={s.email} className="flex justify-between items-center bg-slate-950/45 px-3 py-2 rounded-xl border border-slate-850">
                  <span className="text-sm text-slate-300 font-medium">
                    {s.email === user.email ? "You" : s.email}
                  </span>
                  <span className="text-sm text-yellow-500 font-extrabold">
                    ₹{money(s.share)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* NOTES */}
          {expense.notes && (
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-855 text-sm text-slate-300">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Notes</span>
              {expense.notes}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-6 pb-6 pt-2 border-t border-slate-850">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-750 px-4 py-2 text-sm font-bold text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExpenseDetailsModal;
