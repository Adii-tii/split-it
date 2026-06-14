import { useSelector } from "react-redux";

function TransactionCard({ settlement }) {
  const user = useSelector((state) => state.userDetails);
  if (!settlement || !user) return null;

  const fromEmail = settlement.fromUserEmail || settlement.fromUser?.email || "";
  const toEmail = settlement.toUserEmail || settlement.toUser?.email || "";

  const isSender = fromEmail === user.email;
  const isReceiver = toEmail === user.email;

  const GREEN = "#10B981";
  const YELLOW = "#FFD02F";

  const directionIcon = isSender
    ? "bi-arrow-up-right"
    : isReceiver
    ? "bi-arrow-down-right"
    : "bi-arrow-left-right";

  const iconColor = isSender ? YELLOW : isReceiver ? GREEN : "#9D5CFF";

  const dateObj = new Date(settlement.createdAt || settlement.created_at);
  const date = dateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });

  const amountColor = isSender ? YELLOW : isReceiver ? GREEN : "#FFFFFF";

  const directionText = isSender ? (
    <>
      You <span style={{ color: YELLOW }}>paid</span> {toEmail} ₹{settlement.amount}
    </>
  ) : isReceiver ? (
    <>
      You <span style={{ color: GREEN }}>received</span> ₹{settlement.amount} from {fromEmail}
    </>
  ) : (
    "Settlement"
  );

  return (
    <div className="flex gap-3">
      {/* Spacer to align with ExpenseCard's body */}
      <div className="w-[56px] shrink-0" />

      {/* Main card */}
      <div
        className="flex-1 flex justify-between items-center bg-slate-900 border-none rounded-[12px] p-[8px_12px] transition-all min-w-0"
      >
        <div className="flex gap-3 items-center min-w-0">
          {/* Icon */}
          <div
            className="w-[38px] h-[38px] rounded-[8px] bg-violet-850 flex items-center justify-center shrink-0"
          >
            <i
              className={`bi ${directionIcon} text-[14px]`}
              style={{ color: iconColor }}
            />
          </div>

          {/* Text stack */}
          <div className="leading-[1.2] min-w-0">
            {/* Title */}
            <div className="text-sm font-semibold text-white truncate pr-2">
              {directionText}
            </div>

            {/* Note */}
            {settlement.note && (
              <div className="text-xs text-slate-400 mt-1 truncate max-w-[260px]">
                {settlement.note}
              </div>
            )}

            {/* Date */}
            <div className="text-[11px] text-slate-400 mt-1.5 font-bold">
              {date}
            </div>
          </div>
        </div>

        {/* Right amount block */}
        <div className="text-right shrink-0 pl-3 flex flex-col justify-center">
          <div
            className="text-[15px] font-medium"
            style={{ color: amountColor }}
          >
            ₹{Number(settlement.amount || 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-yellow-500 mt-0.5 font-bold">
            Settlement
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionCard;
