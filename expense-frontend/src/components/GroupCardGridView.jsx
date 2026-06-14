import { useState, useRef, useEffect } from "react";
import DeleteConfirmationModal from "./Modals/DeleteConfirmationModal";

function GroupCardGridView({
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

  if (!group) return null;

  return (
    <>
      <div
        className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden hover:border-slate-700 transition-all duration-300 shadow-lg cursor-pointer h-full"
        onClick={handleRedirection}
      >
        {/* THUMBNAIL */}
        <div
          className="relative h-32 bg-cover bg-center"
          style={{
            backgroundImage: `url(${group.thumbnail || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600"})`,
          }}
        >
          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

          {/* title & dropdown */}
          <div className="absolute bottom-0 left-0 w-full p-4 flex justify-between items-center z-10">
            <h5 className="font-bold text-white text-base truncate pr-2">
              {group.name}
            </h5>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(!dropdownOpen);
                }}
                className="rounded-lg p-1 text-slate-300 hover:bg-slate-900/60 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 bottom-full mb-1 w-32 rounded-lg border border-slate-800 bg-slate-950 py-1 shadow-xl z-20">
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

        {/* BODY */}
        <div className="flex flex-col flex-grow p-4 justify-between space-y-4">
          {group.description ? (
            <p className="text-xs text-slate-400 line-clamp-2">
              {group.description}
            </p>
          ) : (
            <p className="text-xs text-slate-600 italic">No description</p>
          )}

          {/* Members list */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
            <div className="flex items-center -space-x-2">
              {visibleMembers.map((m, i) => (
                <Avatar key={i} email={m} index={i} />
              ))}

              {extraMembers > 0 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-yellow-500/10 text-xs font-bold text-yellow-500">
                  +{extraMembers}
                </div>
              )}
            </div>

            <span className="text-xs font-medium text-slate-400">
              {members.length} members
            </span>
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

export default GroupCardGridView;
