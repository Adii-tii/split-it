import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { serverEndpoint } from "../../config/appConfig";

function CreateGroupModal({
  isOpen,
  setIsOpen,
  refreshGroups,
  setMode,
  mode,
  currentGroup
}) {
  const userDetails = useSelector((state) => state.userDetails);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    adminEmail: userDetails?.email || "",
    memberEmail: userDetails?.email ? [userDetails.email] : [],
    thumbnail: ""
  });

  const [tempEmail, setTempEmail] = useState("");

  /* ================= INIT ================= */
  useEffect(() => {
    if (mode === "edit" && currentGroup) {
      setFormData({
        name: currentGroup.name || "",
        description: currentGroup.description || "",
        adminEmail: currentGroup.adminEmail || (userDetails?.email || ""),
        memberEmail: currentGroup.memberEmail || [],
        thumbnail: currentGroup.thumbnail || ""
      });
      setThumbnailFile(null);
    }

    if (mode === "create" && userDetails) {
      setFormData({
        name: "",
        description: "",
        adminEmail: userDetails.email,
        memberEmail: [userDetails.email],
        thumbnail: ""
      });
      setThumbnailFile(null);
    }
  }, [mode, currentGroup, userDetails]);

  /* ================= THUMBNAIL UPLOAD ================= */
  const handleThumbnailUpload = async (file) => {
    if (!file) return;

    try {
      // preview immediately
      const preview = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, thumbnail: preview }));
      setThumbnailFile(file);

      // if editing existing group → upload instantly
      if (mode === "edit" && currentGroup?.id) {
        const form = new FormData();
        form.append("image", file);

        const res = await axios.post(
          `${serverEndpoint}/groups/${currentGroup.id}/thumbnail`,
          form
        );

        setFormData(prev => ({
          ...prev,
          thumbnail: res.data.thumbnail
        }));
      }

    } catch (err) {
      console.error("Thumbnail upload failed", err);
    }
  };

  /* ================= FORM ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddMembers = (e) => {
    if (e) e.preventDefault();
    if (tempEmail && !formData.memberEmail.includes(tempEmail)) {
      setFormData(prev => ({
        ...prev,
        memberEmail: [...prev.memberEmail, tempEmail]
      }));
      setTempEmail("");
    }
  };

  const handleRemoveMember = (index) => {
    setFormData(prev => ({
      ...prev,
      memberEmail: prev.memberEmail.filter((_, i) => i !== index)
    }));
  };

  const closeModal = () => {
    setIsOpen(false);
    setErrors({});
    setTempEmail("");
    setThumbnailFile(null);
    setSuccessMsg("");
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setSuccessMsg("");

    try {
      if (mode === "create") {
        const body = {
          adminEmail: formData.adminEmail,
          name: formData.name,
          description: formData.description,
          memberEmail: formData.memberEmail,
          createdBy: userDetails.id,
          thumbnail: "" // start with empty thumbnail
        };

        const res = await axios.post(
          `${serverEndpoint}/groups/create`,
          body
        );

        if (res.status === 201 || res.status === 200) {
          const createdGroup = res.data.group;
          if (thumbnailFile && createdGroup?.id) {
            const form = new FormData();
            form.append("image", thumbnailFile);
            try {
              await axios.post(
                `${serverEndpoint}/groups/${createdGroup.id}/thumbnail`,
                form
              );
            } catch (uploadErr) {
              console.error("Failed to upload group thumbnail", uploadErr);
            }
          }
          setSuccessMsg("Group created successfully!");
          refreshGroups();
          setTimeout(() => {
            closeModal();
          }, 1500);
        }
      }

      if (mode === "edit") {
        const body = {
          adminEmail: formData.adminEmail,
          name: formData.name,
          description: formData.description,
          thumbnail: formData.thumbnail
        };

        const res = await axios.patch(
          `${serverEndpoint}/groups/${currentGroup.id}`,
          body
        );

        if (res.status === 200 || res.status === 201) {
          setSuccessMsg("Group updated successfully!");
          refreshGroups();
          setTimeout(() => {
            closeModal();
          }, 1500);
        }
      }

    } catch (error) {
      if (error.response) {
        setErrors({ general: error.response.data.message || "Request failed" });
      } else {
        setErrors({ general: "Something went wrong" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
        onClick={closeModal}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl transition-all">
        {/* hidden file input */}
        <input
          id="coverUpload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleThumbnailUpload(e.target.files[0])}
        />

        {/* COVER HEADER */}
        <div
          onClick={() => document.getElementById("coverUpload").click()}
          className="relative h-40 flex items-end p-6 cursor-pointer bg-cover bg-center select-none"
          style={{
            backgroundImage: formData.thumbnail
              ? `url(${formData.thumbnail})`
              : "linear-gradient(135deg, #7C6CF2, #5849D9)",
          }}
        >
          {/* overlay */}
          <div className="absolute inset-0 bg-slate-950/35" />

          {/* title */}
          <div className="relative z-10 flex items-center gap-2 text-white font-bold text-lg">
            <span>{mode === "create" ? "Create group" : "Edit group"}</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>

          {/* change hint */}
          <div className="absolute top-4 left-4 z-10 bg-slate-950/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-white">
            {formData.thumbnail ? "Change cover" : "Add cover"}
          </div>

          {/* close */}
          <button
            type="button"
            className="absolute top-4 right-4 z-10 rounded-full bg-slate-950/40 p-1.5 text-white hover:bg-slate-950/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              closeModal();
            }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.general && (
            <div className="rounded-lg bg-red-950/50 border border-red-500/30 p-3 text-center text-sm font-medium text-red-200">
              {errors.general}
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg bg-emerald-950/50 border border-emerald-500/30 p-3 text-center text-sm font-medium text-emerald-200">
              {successMsg}
            </div>
          )}

          {/* NAME */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Group Name
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Flatmates 402, Trip to Goa"
              value={formData.name}
              onChange={handleChange}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Description
            </label>
            <textarea
              name="description"
              placeholder="Provide a short description..."
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm resize-none"
            />
          </div>

          {/* PARTICIPANTS INVITE (Only in create mode) */}
          {mode === "create" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Add Participants
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  placeholder="Invite user by email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMembers();
                    }
                  }}
                  className="block flex-grow rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddMembers}
                  className="rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* EMAILS LIST */}
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
            {formData.memberEmail.map((email, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 rounded-full bg-violet-950/40 border border-violet-500/20 px-3 py-1 text-xs text-violet-300"
              >
                <span>{email}</span>
                {mode === "create" && email !== userDetails?.email && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(index)}
                    className="text-violet-400 hover:text-white transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60">
            <button
              type="button"
              className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              onClick={closeModal}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-yellow-500 hover:bg-yellow-600 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[80px]"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                mode === "create" ? "Create" : "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateGroupModal;
