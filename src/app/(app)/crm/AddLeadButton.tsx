"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import AddLeadForm from "./AddLeadForm";

type UserRow = { id: string; name: string; avatarColor: string; role: string };

export default function AddLeadButton({ users }: { users: UserRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-primary flex items-center gap-2 text-sm"
      >
        <Icon name="UserPlus" size={15} />
        Add Lead
      </button>

      {open && (
        <AddLeadForm users={users} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
