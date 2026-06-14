import { useState, useRef, useEffect } from "react";
import DeleteConfirmationModal from "./Modals/DeleteConfirmationModal";

function GroupCardListView({
  handleRedirection,
  group,
  members,
  visibleMembers,
  extraMembers,
  handleEditGroup,
  setShowDelete,
  showDelete,
  handleDeleteGroup,
  Avatar
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div
        className="flex items-center justify-between border-b border-slate-800 bg-slate-900/20 px-6 py-4 hover:bg-slate-900/50 transition-colors cursor-pointer"
        onClick={handleRedirection}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="font-semibold text-white truncate">{group.name}</div>
          <div className="text-xs text-slate-400 truncate">
            {group.description || "No description"}
          </div>
        </div>

        <div className="w-28 text-sm font-medium text-violet-400 text-center">
          {members.length} members
        </div>

        <div className="flex items-center -space-x-2 w-32 justify-center">
          {visibleMembers.map((m, i) => (
            <Avatar key={i} email={m} index={i} />
          ))}

          {extraMembers > 0 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 bg-yellow-500/10 text-[10px] font-bold text-yellow-500">
              +{extraMembers}
            </div>
          )}
        </div>

        {/* MENU */}
        <div className="w-10 flex justify-end" ref={dropdownRef}>
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-slate-800 bg-slate-950 py-1 shadow-xl z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
                    handleEditGroup(e);
                  }}
                  className="flex w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(false);
                    setShowDelete(true);
                  }}
                  className="flex w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-900 hover:text-red-300 transition-colors"
                >
                  Delete
                  </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        show={showDelete}
        setShow={setShowDelete}
        handleDelete={handleDeleteGroup}
      />
    </>
  );
}

export default GroupCardListView;
