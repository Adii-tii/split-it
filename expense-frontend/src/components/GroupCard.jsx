import axios from "axios";
import { serverEndpoint } from "../config/appConfig";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import GroupCardListView from "./GroupCardListView";
import GroupCardGridView from "./GroupCardGridView";

function GroupCard({
  group,
  refreshGroups,
  setMode,
  mode,
  setIsOpen,
  isOpen,
  setCurrentGroup,
  layout
}) {
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  const MAX_VISIBLE_MEMBERS = 4;
  const members = group.memberEmail || [];
  const visibleMembers = members.slice(0, MAX_VISIBLE_MEMBERS);
  const extraMembers = Math.max(members.length - MAX_VISIBLE_MEMBERS, 0);

  const handleRedirection = () => {
    navigate(`/groups/${group.id}`, { state: { group } });
  };

  const handleDeleteGroup = async () => {
    try {
      await axios.delete(`${serverEndpoint}/groups/${group.id}/delete`);
      refreshGroups();
    } catch (err) {
      console.error("Delete group failed", err);
    }
  };

  const handleEditGroup = (e) => {
    if (e) e.stopPropagation();
    setMode("edit");
    setCurrentGroup(group);
    setIsOpen(true);
  };

  const Avatar = ({ email, index }) => (
    <div
      className="flex items-center justify-center rounded-full font-bold select-none border-2 border-slate-900 bg-violet-500/10 text-violet-400"
      style={{
        width: layout === "list" ? "28px" : "32px",
        height: layout === "list" ? "28px" : "32px",
        fontSize: layout === "list" ? "10px" : "11px",
        marginLeft: index === 0 ? 0 : "-8px",
      }}
    >
      {email?.[0]?.toUpperCase()}
    </div>
  );

  if (layout === "list") {
    return (
      <GroupCardListView
        handleRedirection={handleRedirection}
        group={group}
        members={members}
        visibleMembers={visibleMembers}
        extraMembers={extraMembers}
        handleEditGroup={handleEditGroup}
        setShowDelete={setShowDelete}
        showDelete={showDelete}
        handleDeleteGroup={handleDeleteGroup}
        Avatar={Avatar}
      />
    );
  }

  return (
    <GroupCardGridView
      handleRedirection={handleRedirection}
      group={group}
      members={members}
      visibleMembers={visibleMembers}
      extraMembers={extraMembers}
      handleEditGroup={handleEditGroup}
      setShowDelete={setShowDelete}
      showDelete={showDelete}
      handleDeleteGroup={handleDeleteGroup}
      Avatar={Avatar}
    />
  );
}

export default GroupCard;
