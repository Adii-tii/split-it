import { useState, useEffect } from "react";
import axios from "axios";
import { serverEndpoint } from "../config/appConfig";

function MembersDrawer({ group, isOpen, setIsOpen }) {
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState(group?.memberEmail || []);

  const handleAddMember = async () => {
    if (!email.trim()) return;

    try {
      setLoading(true);
      const groupId = group.id || group._id;

      const res = await axios.patch(
        `${serverEndpoint}/groups/${groupId}/add-members`,
        {
          newMembers: [email]
        }
      );

      if (res.status === 200) {
        setMembers((prev) => [...prev, email]);
        setEmail("");
        setAdding(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMembers(group?.memberEmail || []);
  }, [group]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div 
        className="fixed inset-0" 
        onClick={() => setIsOpen(false)}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-10 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Group Members</h3>
            <p className="text-xs text-slate-400 mt-0.5">Add members or view group participants</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-4">
          {/* Add member button/input */}
          <div>
            {!adding ? (
              <button
                onClick={() => setAdding(true)}
                className="w-full rounded-xl border border-dashed border-violet-500/50 bg-violet-500/5 hover:bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-all cursor-pointer"
              >
                + Add Member
              </button>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-3">
                <input
                  type="email"
                  placeholder="Enter member email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition-colors"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => {
                      setAdding(false);
                      setEmail("");
                    }}
                    className="rounded-lg px-3 py-1.5 font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={loading || !email.trim()}
                    className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800/40 px-3.5 py-1.5 font-bold text-white transition-all"
                  >
                    {loading ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="space-y-2.5">
            {members.map((member, index) => {
              const initial = member?.[0]?.toUpperCase() || "?";
              return (
                <div 
                  key={index}
                  className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800/60 p-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-xs font-bold text-violet-400 border border-violet-500/20">
                    {initial}
                  </div>
                  <span className="text-sm font-medium text-slate-200 truncate">{member}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg bg-slate-800 hover:bg-slate-750 px-4 py-2 text-sm font-bold text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default MembersDrawer;
