import { useSelector } from "react-redux";

function TransactionCard({ settlement }) {
  const user = useSelector((state) => state.userDetails);
  if (!settlement || !user) return null;

  const fromEmail = settlement.fromUserEmail || settlement.fromUser?.email || "";
  const toEmail = settlement.toUserEmail || settlement.toUser?.email || "";

  const isSender = fromEmail === user.email;
  const isReceiver = toEmail === user.email;

  const directionIcon = isSender
    ? "bi-arrow-up-right"
    : isReceiver
    ? "bi-arrow-down-right"
    : "bi-arrow-left-right";

  const iconColorClass = isSender
    ? "text-yellow-500"
    : isReceiver
    ? "text-emerald-400"
    : "text-violet-400";

  const dateObj = new Date(settlement.createdAt || settlement.created_at);
  const day = dateObj.toLocaleDateString("en-IN", { day: "2-digit" });
  const month = dateObj.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();

  const directionText = isSender ? (
    <>
      You <span className="text-yellow-500">paid</span> {toEmail}
    </>
  ) : isReceiver ? (
    <>
      You <span className="text-emerald-400">received</span> from {fromEmail}
    </>
  ) : (
    "Settlement"
  );

  return (
    <div className="flex items-center gap-4">
      {/* Date badge */}
      <div className="flex flex-col items-center justify-center w-14 h-14 shrink-0 rounded-xl bg-slate-900 border border-slate-800">
        <span className="text-xl font-extrabold text-white leading-none">{day}</span>
        <span className="text-[10px] font-bold text-slate-400 tracking-wider mt-1">{month}</span>
      </div>

      {/* Main card */}
      <div className="flex-1 flex justify-between items-center bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 shadow-sm">
        <div className="flex gap-3">
          {/* Icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/10 border border-violet-500/10">
            <i className={`bi ${directionIcon} ${iconColorClass}`} />
          </div>

          {/* Text */}
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate max-w-[240px]">{directionText}</p>
            {settlement.note && (
              <p className="text-xs text-slate-400 max-w-[260px] truncate">{settlement.note}</p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 pl-3">
          <p className={`text-sm font-extrabold ${iconColorClass}`}>
            ₹{Number(settlement.amount || 0).toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-500 block mt-0.5">Settlement</span>
        </div>
      </div>
    </div>
  );
}

export default TransactionCard;
