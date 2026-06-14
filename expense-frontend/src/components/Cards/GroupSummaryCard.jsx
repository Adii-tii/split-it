import React from "react";

function GroupSummaryCards({ myBalance = 0, userOwes = 0, userIsOwed = 0, balances = [], memberEmails = [], totalSpent = 0 }) {
  const formatMoney = (value) =>
    `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const visibleMembers = memberEmails.slice(0, 3);
  const extraMembers = Math.max(memberEmails.length - 3, 0);

  return (
    <div className="grid gap-6 md:grid-cols-3 mt-4">
      {/* Total Spent Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/90 to-violet-850 p-5 shadow-lg border border-violet-500/20">
        <div className="absolute right-2 bottom-0 translate-y-3 translate-x-1 opacity-10 text-slate-900 pointer-events-none">
          <svg className="h-24 w-24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M1.92.506a.5.5 0 0 1 .434.14L3 1.293l.646-.647a.5.5 0 0 1 .708 0L5 1.293l.646-.647a.5.5 0 0 1 .708 0L7 1.293l.646-.647a.5.5 0 0 1 .708 0L9 1.293l.646-.647a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .801.13l.5 1A.5.5 0 0 1 15 2v13h-1V2.118l-.137-.274-.51.51a.5.5 0 0 1-.707 0L12 1.707l-.646.647a.5.5 0 0 1-.708 0L10 1.707l-.646.647a.5.5 0 0 1-.708 0L8 1.707l-.646.647a.5.5 0 0 1-.708 0L6 1.707l-.646.647a.5.5 0 0 1-.708 0L4 1.707l-.646.647a.5.5 0 0 1-.708 0l-.51-.51L2 2.118V15H1V2a.5.5 0 0 1 .059-.237l.5-1a.5.5 0 0 1 .361-.257zM5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 3a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z" />
          </svg>
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase text-violet-200">Total Spent</span>
        <h3 className="text-2xl font-black text-white mt-1">{formatMoney(totalSpent)}</h3>
        <p className="text-xs text-violet-200 mt-2 flex items-center gap-1.5 font-medium">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>Active timeline track</span>
        </p>
      </div>

      {/* You are owed Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">You Are Owed</span>
          <h3 className="text-2xl font-black text-violet-300 mt-1">{formatMoney(Math.max(userIsOwed, 0))}</h3>
        </div>
        
        {/* Avatars */}
        <div className="flex items-center mt-3">
          {visibleMembers.map((email, idx) => (
            <div
              key={idx}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600/20 text-[9px] font-bold text-violet-400 border-2 border-slate-900 -ml-1.5 first:ml-0"
            >
              {email[0].toUpperCase()}
            </div>
          ))}
          {extraMembers > 0 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-slate-400 border-2 border-slate-900 -ml-1.5">
              +{extraMembers}
            </div>
          )}
        </div>
      </div>

      {/* Pending Settle-Ups Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-5 shadow-lg border border-yellow-500/20">
        <div className="absolute right-2 bottom-0 translate-y-3 translate-x-1 opacity-5 text-yellow-600 pointer-events-none">
          <svg className="h-24 w-24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase text-yellow-600">People You Owe</span>
        <h3 className="text-2xl font-black text-yellow-500 mt-1">{balances.length}</h3>
        <p className="text-xs text-yellow-600 mt-2 font-semibold">
          {balances.length > 0 ? (
            <span className="flex items-center gap-1">
              <span>{balances.length} pending debt balances</span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          ) : (
            "All settled up!"
          )}
        </p>
      </div>
    </div>
  );
}

export default GroupSummaryCards;
