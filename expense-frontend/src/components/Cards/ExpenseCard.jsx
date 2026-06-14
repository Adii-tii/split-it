import { useSelector } from "react-redux";

function ExpenseCard({ expense, onClick }) {
  const user = useSelector((state) => state.userDetails);
  if (!user || !expense) return null;

  /* ===== CATEGORY ICON MAP ===== */
  const CATEGORY_ICONS = {
    Food: "bi-cup-hot",
    Travel: "bi-airplane",
    Shopping: "bi-bag",
    Bills: "bi-receipt",
    Entertainment: "bi-film",
    Health: "bi-heart-pulse",
    Other: "bi-three-dots"
  };

  const categoryIcon = CATEGORY_ICONS[expense.category] || "bi-tag";

  /* ===== DATA ===== */
  const splits = expense.splits || [];
  const paidBy = expense.paidBy || [];
  const mySplit = splits.find((s) => s.email === user.email);

  const myShare = Number(mySplit?.share || 0);
  const myRemaining = Number(mySplit?.remaining ?? myShare);
  const currentPaid = Number(paidBy.find((p) => p.email === user.email)?.amount || 0);

  const balance = currentPaid - myShare;

  /* ===== STATUS ===== */
  let type = "settled";
  let displayAmount = 0;
  let color = "#A1A1AA";

  if (balance > 0) {
    type = "lent";
    displayAmount = balance;
    color = "#10B981";
  } else if (myRemaining > 0) {
    type = "borrowed";
    displayAmount = myRemaining;
    color = "#FFFFFF";
  }

  /* ===== PARTICIPANTS ===== */
  const participants = [...new Map(
    [...splits, ...paidBy].map((p) => [p.email, p])
  ).values()];

  const getInitial = (email) => email?.[0]?.toUpperCase() || "?";

  /* ===== DATE ===== */
  const dateObj = new Date(expense.createdAt || expense.created_at);
  const day = dateObj.toLocaleDateString("en-IN", { day: "2-digit" });
  const month = dateObj.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();

  return (
    <div className="flex gap-3">
      {/* DATE COLUMN */}
      <div className="flex flex-col items-center justify-center w-[56px] shrink-0">
        <div className="text-[32px] font-black text-slate-400 leading-[30px]">
          {day}
        </div>
        <div className="text-[11px] text-slate-400 tracking-[1.2px] font-bold">
          {month}
        </div>
      </div>

      {/* CARD */}
      <div
        onClick={() => onClick?.(expense)}
        className="flex-1 flex bg-slate-900 rounded-[14px] border-none overflow-hidden cursor-pointer"
      >
        {/* ICON PANEL */}
        <div className="w-[60px] bg-violet-850 flex items-center justify-center shrink-0">
          <i className={`bi ${categoryIcon} text-[28px] text-violet-400`} />
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-[8px_12px] min-w-0">
          <div className="flex justify-between items-start">
            {/* LEFT SIDE */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="text-sm font-semibold text-white truncate">
                {expense.title || expense.description}
              </div>
              {expense.notes && (
                <div className="text-[11px] text-slate-400 mt-[5.5px] truncate">
                  {expense.notes}
                </div>
              )}
            </div>

            {/* RIGHT FINANCIAL BLOCK */}
            <div className="text-right min-w-[95px] shrink-0">
              {type !== "settled" ? (
                <div
                  className="text-base font-medium"
                  style={{ color }}
                >
                  ₹{displayAmount.toFixed(2)}
                </div>
              ) : (
                <div className="text-xs font-medium text-slate-400">
                  Settled
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-between items-center mt-2.5">
            {/* PARTICIPANTS */}
            <div className="flex">
              {participants.slice(0, 4).map((p, i) => (
                <div
                  key={p.email}
                  title={p.email}
                  className="w-5 h-5 rounded-full bg-violet-850 text-violet-400 flex items-center justify-center text-[8px] font-bold border-[2.5px] border-slate-900"
                  style={{ marginLeft: i ? "-5px" : 0 }}
                >
                  {getInitial(p.email)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpenseCard;
