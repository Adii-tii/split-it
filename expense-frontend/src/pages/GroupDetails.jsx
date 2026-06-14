import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { BeatLoader } from "react-spinners";

import GroupTopBar from "../components/GroupTopBar";
import AddExpense from "../components/Modals/AddExpense";
import ImportCSVModal from "../components/Modals/ImportCSVModal";
import MembersDrawer from "../components/MembersDrawer";
import ExpenseDetailsModal from "../components/Modals/ExpenseDetailsModal";
import GroupSummaryCards from "../components/Cards/GroupSummaryCard";
import ExpenseCard from "../components/Cards/ExpenseCard";
import TransactionCard from "../components/Cards/TransactionCard";
import SettleUpModal from "../components/Modals/SettleUpModal";
import { serverEndpoint } from "../config/appConfig";

function GroupDetails() {
  const { groupId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.userDetails);

  const [groupData, setGroupData] = useState(location.state?.group || null);
  const [loading, setLoading] = useState(!groupData);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isImportCSVOpen, setIsImportCSVOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [userOwes, setUserOwes] = useState(0);
  const [userIsOwed, setUserIsOwed] = useState(0);
  const [overallBalance, setOverallBalance] = useState(0);
  const [balances, setBalances] = useState([]);
  const [isSettleOpen, setIsSettleOpen] = useState(false);

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${serverEndpoint}/groups/${groupId}`);
      setGroupData(res.data);
    } catch (err) {
      console.error("Failed to fetch group details", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    if (!groupId) return;
    try {
      const [expRes, owedRes, isOwedRes, peopleIOweRes, settlementsRes] = await Promise.all([
        axios.get(`${serverEndpoint}/groups/${groupId}/expenses`),
        axios.get(`${serverEndpoint}/groups/${groupId}/total-owed`),
        axios.get(`${serverEndpoint}/groups/${groupId}/total-is-owed`),
        axios.get(`${serverEndpoint}/groups/${groupId}/people-i-owe`),
        axios.get(`${serverEndpoint}/groups/${groupId}/settlements`)
      ]);

      setExpenses(expRes.data.expenses || []);
      const totalOwed = owedRes.data.totalOwed || 0;
      const totalIsOwed = isOwedRes.data.totalIsOwed || 0;

      setUserOwes(totalOwed);
      setUserIsOwed(totalIsOwed);
      setOverallBalance(totalIsOwed - totalOwed);
      setBalances(peopleIOweRes.data.creditors || []);
      setSettlements(settlementsRes.data.settlements || []);
    } catch (err) {
      console.error("Expense fetch failed", err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    try {
      await axios.delete(`${serverEndpoint}/groups/${groupId}/delete`);
      navigate("/groups");
    } catch (err) {
      console.error("Failed to delete group", err);
    }
  };

  useEffect(() => {
    if (!groupData) {
      fetchGroup();
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      fetchExpenses();
    }
  }, [groupId]);

  const groupTimelineByDate = (items) => {
    const dates = {};
    items.forEach((item) => {
      const d = new Date(item.createdAt || item.created_at);
      const today = new Date();
      const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
      
      let label = d.toDateString();
      if (diff === 0) label = "Today";
      else if (diff === 1) label = "Yesterday";

      dates[label] ??= [];
      dates[label].push(item);
    });
    return dates;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <BeatLoader color="#7C6CF2" />
      </div>
    );
  }

  if (!groupData) {
    return <div className="p-8 text-center text-slate-400">Group not found</div>;
  }

  const sortedTimelineItems = [...expenses, ...settlements].sort(
    (a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at)
  );

  const groupedTimeline = groupTimelineByDate(sortedTimelineItems);

  return (
    <div className="w-full space-y-6">
      {/* Top Bar Header */}
      <GroupTopBar
        group={groupData}
        handleAddExpense={() => setIsAddExpenseOpen(true)}
        handleImportCSV={() => setIsImportCSVOpen(true)}
        toggleMembers={() => setShowMembers(true)}
        onDelete={handleDeleteGroup}
        onSettle={() => setIsSettleOpen(true)}
      />

      {/* Summary Cards Panel */}
      {sortedTimelineItems.length > 0 && (
        <GroupSummaryCards
          myBalance={overallBalance}
          userOwes={userOwes}
          userIsOwed={userIsOwed}
          balances={balances}
          memberEmails={groupData.memberEmail || []}
          totalSpent={expenses.reduce((sum, e) => {
            const mySplit = e.splits?.find(s => s.email === user?.email);
            return sum + Number(mySplit?.share || 0);
          }, 0)}
          onSettle={() => setIsSettleOpen(true)}
        />
      )}

      {/* Timeline Section */}
      <div className="space-y-4">
        {sortedTimelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center max-w-md mx-auto mt-12">
            <div className="rounded-full bg-slate-950 p-4 border border-slate-800 text-slate-400 mb-4">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Activity Yet</h3>
            <p className="text-sm text-slate-400 mb-6">Start tracking bills by creating your first expense split.</p>
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="rounded-lg bg-yellow-500 hover:bg-yellow-600 px-6 py-2.5 text-sm font-bold text-slate-950 transition-colors shadow-md cursor-pointer"
            >
              Add Expense
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTimeline).map(([dateLabel, items]) => (
              <div key={dateLabel} className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                  {dateLabel}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    item.fromUserEmail ? (
                      <TransactionCard
                        key={`settlement-${item.id || item._id}`}
                        settlement={item}
                      />
                    ) : (
                      <ExpenseCard
                        key={`expense-${item.id || item._id}`}
                        expense={item}
                        onClick={setSelectedExpense}
                      />
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <AddExpense
        isOpen={isAddExpenseOpen}
        setIsOpen={setIsAddExpenseOpen}
        group={groupData}
        refreshExpenses={fetchExpenses}
      />

      <ImportCSVModal
        isOpen={isImportCSVOpen}
        setIsOpen={setIsImportCSVOpen}
        group={groupData}
        refreshExpenses={fetchExpenses}
      />

      <ExpenseDetailsModal
        expense={selectedExpense}
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
      />

      <MembersDrawer
        group={groupData}
        isOpen={showMembers}
        setIsOpen={setShowMembers}
      />

      <SettleUpModal
        isOpen={isSettleOpen}
        setIsOpen={setIsSettleOpen}
        group={groupData}
        balances={balances}
        refreshExpenses={fetchExpenses}
      />
    </div>
  );
}

export default GroupDetails;
