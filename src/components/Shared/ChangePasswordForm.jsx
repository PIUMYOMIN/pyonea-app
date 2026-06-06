import React, { useState } from "react";
import { KeyIcon } from "@heroicons/react/24/outline";
import api from "../../utils/api";

const EMPTY = { current_password: "", new_password: "", confirm_password: "" };

const msgCls = (type) =>
  type === "success"
    ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
    : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg " +
  "bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 " +
  "focus:ring-2 focus:ring-green-500 focus:outline-none text-sm";

/**
 * Self-contained change-password card.
 * Renders its own state, validation, API call, and feedback message.
 * Drop it anywhere — no props required.
 */
const ChangePasswordForm = () => {
  const [data, setData]       = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);

  const handleChange = (e) =>
    setData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (data.new_password !== data.confirm_password) {
      setMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (data.new_password.length < 8) {
      setMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await api.put("/users/profile/password", {
        current_password:          data.current_password,
        new_password:              data.new_password,
        new_password_confirmation: data.confirm_password,
      });
      setMsg({ type: "success", text: "Password changed successfully." });
      setData({ ...EMPTY });
    } catch (err) {
      setMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to change password.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <KeyIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Change Password</h3>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msgCls(msg.type)}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {[
          ["Current Password",     "current_password"],
          ["New Password",         "new_password"],
          ["Confirm New Password", "confirm_password"],
        ].map(([label, name]) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {label}
            </label>
            <input
              type="password"
              name={name}
              value={data[name]}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Changing…" : "Change Password"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
