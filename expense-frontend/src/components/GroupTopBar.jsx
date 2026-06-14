import { useState } from "react";

function GroupTopBar({ group, onEdit, onDelete, handleAddExpense, toggleMembers, onSettle }) {
  const groupName = group?.name || "Group";
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-900">
      {/* Left side: Breadcrumbs and Title */}
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {groupName}
          </h1>
        </div>
        {group?.description && (
          <p className="text-sm text-slate-400 mt-1">
            {group.description}
          </p>
        )}
      </div>

      {/* Right side: Action CTA Buttons */}
      <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
        {/* Settle Up Button */}
        {onSettle && (
          <button
            onClick={onSettle}
            className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 px-4 py-2 text-sm font-bold text-yellow-500 transition-colors shadow-lg cursor-pointer"
          >
            <i className="bi bi-check2-circle text-sm" />
            <span>Settle Up</span>
          </button>
        )}

        {/* Add Expense Button */}
        <button
          onClick={handleAddExpense}
          className="flex items-center gap-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 px-4 py-2 text-sm font-bold text-slate-950 transition-colors shadow-lg cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Expense</span>
        </button>

        {/* Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-xl z-20">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    toggleMembers();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-850 hover:text-white transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Group Members</span>
                </button>
                
                {onEdit && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-850 hover:text-white transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Edit Group</span>
                  </button>
                )}

                {onDelete && (
                  <>
                    <div className="my-1 border-t border-slate-800" />
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onDelete();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete Group</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupTopBar;
