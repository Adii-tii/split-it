import React from "react";

function GroupSummaryCards({ myBalance = 0, userOwes = 0, userIsOwed = 0, balances = [], memberEmails = [], totalSpent = 0, onSettle }) {
  const formatMoney = (value) =>
    `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const visibleMembers = memberEmails.slice(0, 3);
  const extraMembers = Math.max(memberEmails.length - 3, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3 mt-4">
      {/* CARD 1: TOTAL SPENT (Purple solid background) */}
      <div
        className="relative overflow-hidden p-[18px_22px] min-h-[120px] rounded-[20px] bg-[#8E54FF]"
        style={{ cursor: "default" }}
      >
        {/* Background SVG Receipt icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="80"
          fill="rgba(40, 13, 95, 0.08)"
          className="bi bi-receipt absolute right-[-5px] bottom-[-10px] pointer-events-none"
          viewBox="0 0 16 16"
        >
          <path d="M1.92.506a.5.5 0 0 1 .434.14L3 1.293l.646-.647a.5.5 0 0 1 .708 0L5 1.293l.646-.647a.5.5 0 0 1 .708 0L7 1.293l.646-.647a.5.5 0 0 1 .708 0L9 1.293l.646-.647a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .801.13l.5 1A.5.5 0 0 1 15 2v13h-1V2.118l-.137-.274-.51.51a.5.5 0 0 1-.707 0L12 1.707l-.646.647a.5.5 0 0 1-.708 0L10 1.707l-.646.647a.5.5 0 0 1-.708 0L8 1.707l-.646.647a.5.5 0 0 1-.708 0L6 1.707l-.646.647a.5.5 0 0 1-.708 0L4 1.707l-.646.647a.5.5 0 0 1-.708 0l-.51-.51L2 2.118V15H1V2a.5.5 0 0 1 .059-.237l.5-1a.5.5 0 0 1 .361-.257zM5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 3a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z" />
        </svg>

        <div>
          <div className="text-[11px] text-[#280D5F] font-bold tracking-[1px] uppercase">
            TOTAL SPENT
          </div>

          <div className="text-[32px] text-[#280D5F] font-black mt-1 tracking-[-0.8px] leading-[1.1]">
            {formatMoney(totalSpent)}
          </div>

          <div className="text-xs text-[#4B2896] mt-1.5 font-semibold flex items-center gap-1">
            <i className="bi bi-arrow-up-right font-bold text-[13px]" />
            <span>Active timeline track</span>
          </div>
        </div>
      </div>

      {/* CARD 2: YOU ARE OWED (Dark background with border) */}
      <div className="relative overflow-hidden p-[18px_22px] min-h-[120px] rounded-[20px] bg-slate-900 border border-slate-800">
        <div>
          <div className="text-[11px] text-[#8A8A93] font-bold tracking-[1px] uppercase">
            YOU ARE OWED
          </div>

          <div className="text-[32px] text-[#DFD6FF] font-black mt-1 tracking-[-0.8px] leading-[1.1]">
            {formatMoney(Math.max(userIsOwed, 0))}
          </div>

          {/* Avatars */}
          <div className="flex items-center mt-2.5">
            {visibleMembers.map((email, idx) => (
              <div
                key={idx}
                className="rounded-full flex items-center justify-center font-bold text-white border-2 border-slate-900"
                style={{
                  width: "24px",
                  height: "24px",
                  fontSize: "9px",
                  marginLeft: idx === 0 ? 0 : "-5px",
                  background: "#9D5CFF"
                }}
              >
                {email[0].toUpperCase()}
              </div>
            ))}
            {extraMembers > 0 && (
              <div
                className="rounded-full flex items-center justify-center font-bold border-2 border-slate-900 bg-[#39393B] text-slate-400"
                style={{
                  width: "24px",
                  height: "24px",
                  fontSize: "9px",
                  marginLeft: "-5px"
                }}
              >
                +{extraMembers}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CARD 3: PENDING SETTLE-UPS (Yellow solid background) */}
      <div
        onClick={balances.length > 0 ? onSettle : undefined}
        className={`relative overflow-hidden p-[18px_22px] min-h-[120px] rounded-[20px] bg-[#FFD02F] ${
          balances.length > 0 ? "cursor-pointer" : "cursor-default"
        }`}
      >
        {/* Background SVG Warning Exclamation icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="80"
          fill="rgba(77, 58, 0, 0.08)"
          className="bi fill-current absolute right-[-5px] bottom-[-10px] pointer-events-none"
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>

        <div>
          <div className="text-[11px] text-[#4D3A00] font-bold tracking-[1px] uppercase">
            PENDING SETTLE-UPS
          </div>

          <div className="text-[32px] text-[#1E1600] font-black mt-1 tracking-[-0.8px] leading-[1.1]">
            {balances.length}
          </div>

          <div className="text-xs text-[#4D3A00] mt-2.5 font-semibold flex items-center gap-1">
            {balances.length > 0 ? (
              <>
                <span>Review Requests</span>
                <i className="bi bi-arrow-right text-[11px]" />
              </>
            ) : (
              "All Settled"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupSummaryCards;
