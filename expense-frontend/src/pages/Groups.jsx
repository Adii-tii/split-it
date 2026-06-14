import axios from "axios";
import { serverEndpoint } from "../config/appConfig";
import { useState, useEffect } from "react";
import { BeatLoader } from "react-spinners";
import GroupCard from "../components/GroupCard";
import CreateGroupModal from "../components/Modals/CreateGroupModal";
import Can from "../components/Can";
import { useLocation } from "react-router-dom";

function Groups() {
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);

  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState("grid");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState("create");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [groupCount, setGroupCount] = useState(0);
  const [limit, setLimit] = useState(8);
  const [sortBy, setSortBy] = useState("newest");

  const fetchGroups = async (page = 1) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${serverEndpoint}/groups/my-groups?limit=${limit}&page=${page}&sortBy=${sortBy}`
      );
      setGroups(res.data.groups || []);
      setGroupCount(res.data.groupCount || 0);
      setTotalPages(res?.data?.pagination?.totalPages || 1);
      setCurrentPage(res?.data?.pagination?.currentPage || 1);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups(currentPage);
  }, [currentPage, sortBy, limit]);

  const handleCreate = () => {
    setMode("create");
    setCurrentGroup(null);
    setIsModalOpen(true);
  };

  const location = useLocation();
  useEffect(() => {
    if (location.state?.openCreate) {
      handleCreate();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleLimitChange = (e) => {
    const value = Number(e.target.value);
    if (!isNaN(value) && value > 0) {
      setLimit(value);
      setCurrentPage(1);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Your Groups</h1>
          <p className="text-sm text-slate-400">Manage and track shared expenses with your groups</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* LAYOUT SWITCHER */}
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
            {["list", "grid"].map((type) => (
              <button
                key={type}
                onClick={() => setLayout(type)}
                className={`rounded-md p-1.5 transition-all ${
                  layout === type 
                    ? "bg-violet-600 text-white shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {type === "grid" ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* SORT DROPDOWN */}
          <div className="relative rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-sm font-semibold text-white focus-within:border-violet-500">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-white outline-none cursor-pointer pr-6 appearance-none"
            >
              <option value="newest" className="bg-slate-950">Newest First</option>
              <option value="oldest" className="bg-slate-950">Oldest First</option>
              <option value="atoz" className="bg-slate-950">A → Z</option>
              <option value="ztoa" className="bg-slate-950">Z → A</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* CREATE GROUP BUTTON */}
          <Can requiredPermission={"canCreateGroups"}>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 px-4 py-2 text-sm font-bold text-slate-950 transition-colors shadow-lg"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Group</span>
            </button>
          </Can>
        </div>
      </div>

      {/* GROUPS CONTAINER */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <BeatLoader color="#7C6CF2" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center max-w-md mx-auto">
          <div className="rounded-full bg-slate-950 p-4 border border-slate-800 text-slate-400 mb-4">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Groups Yet</h3>
          <p className="text-sm text-slate-400 mb-6">Create a group to start splitting bills and managing shared expenses.</p>
          <button
            onClick={handleCreate}
            className="rounded-lg bg-yellow-500 hover:bg-yellow-600 px-6 py-2 text-sm font-bold text-slate-950 transition-colors shadow-md"
          >
            Create Group
          </button>
        </div>
      ) : layout === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((group) => (
            <div key={group.id}>
              <GroupCard
                group={group}
                refreshGroups={fetchGroups}
                setMode={setMode}
                mode={mode}
                setIsOpen={setIsModalOpen}
                isOpen={isModalOpen}
                setCurrentGroup={setCurrentGroup}
                currentGroup={currentGroup}
                layout={layout}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden divide-y divide-slate-800/60">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              refreshGroups={fetchGroups}
              setMode={setMode}
              setIsOpen={setIsModalOpen}
              setCurrentGroup={setCurrentGroup}
              layout={layout}
            />
          ))}
        </div>
      )}

      {/* PAGINATION SECTION */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-slate-900">
          <div className="flex gap-1.5">
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              const active = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                    active 
                      ? "bg-violet-600 text-white" 
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <div className="flex items-center rounded-full bg-slate-900 border border-slate-800 px-4 py-1.5 text-xs text-slate-400 font-semibold">
            <span>Show</span>
            <input
              value={limit}
              onChange={handleLimitChange}
              className="bg-transparent text-white border-none w-10 text-center font-bold outline-none"
            />
            <span>of {groupCount}</span>
          </div>
        </div>
      )}

      {/* MODAL */}
      <CreateGroupModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        mode={mode}
        currentGroup={currentGroup}
        setMode={setMode}
        refreshGroups={fetchGroups}
      />
    </div>
  );
}

export default Groups;
