import { useSelector } from "react-redux";

function ExpenseCard({ expense, onClick }) {
  const user = useSelector((state) => state.userDetails);
  if (!user || !expense) return null;

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

  const splits = expense.splits || [];
  const paidBy = expense.paidBy || [];

  const mySplit = splits.find((s) => s.email === user.email);
  const myShare = Number(mySplit?.share || 0);
  const myRemaining = Number(mySplit?.remaining ?? myShare);

  const currentPaid = Number(paidBy.find((p) => p.email === user.email)?.amount || 0);
  const balance = currentPaid - myShare;

  let type = "settled";
  let displayAmount = 0;

  if (balance > 0) {
    type = "lent";
    displayAmount = balance;
  } else if (myRemaining > 0) {
    type = "borrowed";
    displayAmount = myRemaining;
  }

  // Get initials for icons
  const getInitial = (email) => email?.[0]?.toUpperCase() || "?";

  // Parse Date
  const dateObj = new Date(expense.createdAt || expense.created_at);
  const day = dateObj.toLocaleDateString("en-IN", { day: "2-digit" });
  const month = dateObj.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();

  return (
    <div className="flex items-center gap-4">
      {/* Date badge */}
      <div className="flex flex-col items-center justify-center w-14 h-14 shrink-0 rounded-xl bg-slate-900 border border-slate-800">
        <span className="text-xl font-extrabold text-white leading-none">{day}</span>
        <span className="text-[10px] font-bold text-slate-400 tracking-wider mt-1">{month}</span>
      </div>

      {/* Main card */}
      <div
        onClick={() => onClick?.(expense)}
        className="flex-1 flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800/80 hover:border-violet-500/50 p-4 transition-all duration-200 cursor-pointer shadow-md"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Category Icon */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 text-violet-400 border border-violet-500/10">
            <i className={`bi ${categoryIcon} text-xl`} />
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{expense.title || expense.description}</h4>
            {expense.notes && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{expense.notes}</p>
            )}
            
            {/* Participants avatars */}
            <div className="flex items-center mt-2">
              {[...new Map([...splits, ...paidBy].map((p) => [p.email, p])).values()]
                .slice(0, 4)
                .map((p, i) => (
                  <div
                    key={p.email}
                    title={p.email}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-[9px] font-bold text-violet-400 border-2 border-slate-900 -ml-1 first:ml-0"
                  >
                    {getInitial(p.email)}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right balance display */}
        <div className="text-right pl-4 shrink-0">
          {type === "lent" && (
            <div>
              <p className="text-xs text-emerald-400 font-semibold">You lent</p>
              <p className="text-base font-extrabold text-emerald-400 mt-0.5">₹{displayAmount.toFixed(2)}</p>
            </div>
          )}
          {type === "borrowed" && (
            <div>
              <p className="text-xs text-slate-400 font-semibold">You borrowed</p>
              <p className="text-base font-extrabold text-slate-200 mt-0.5">₹{displayAmount.toFixed(2)}</p>
            </div>
          )}
          {type === "settled" && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              Settled
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExpenseCard;
