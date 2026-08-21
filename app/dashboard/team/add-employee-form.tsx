"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddEmployeeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("technician");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function create() {
    if (!fullName.trim() || !email.trim() || !password) {
      return setError("Name, email, and password are required.");
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/create-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, phone, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create the account.");
        setCreating(false);
        return;
      }
      setSuccess(true);
      setFullName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setRole("technician");
      router.refresh();
    } catch {
      setError("Couldn't create the account.");
    }
    setCreating(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-signal text-white font-bold rounded-xl py-3 mb-4"
      >
        + Add employee
      </button>
    );
  }

  return (
    <div className="bg-white border-2 border-signal rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold">New employee login</div>
        <button onClick={() => setOpen(false)} className="text-neutral-400 text-sm font-bold">
          Cancel
        </button>
      </div>

      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">Full name</label>
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2.5 mb-3"
      />

      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">Email (login)</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2.5 mb-3"
      />

      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">Password</label>
      <input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 6 characters — tell them this to log in"
        className="w-full border border-line rounded-lg px-3 py-2.5 mb-3"
      />

      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">Phone (optional)</label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2.5 mb-3"
      />

      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1.5">Role</label>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2.5 mb-4"
      >
        <option value="admin">admin</option>
        <option value="salesman">salesman</option>
        <option value="technician">technician</option>
      </select>

      {error && <p className="text-danger text-sm mb-3">{error}</p>}
      {success && <p className="text-good text-sm font-bold mb-3">Account created ✓</p>}

      <button
        onClick={create}
        disabled={creating}
        className="w-full bg-signal text-white font-bold rounded-xl py-3 disabled:opacity-60"
      >
        {creating ? "Creating..." : "Create login"}
      </button>
    </div>
  );
}
