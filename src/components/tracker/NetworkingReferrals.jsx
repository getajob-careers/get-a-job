import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
const RESPONSE_STATUS = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-700" },
  responded: { label: "Responded", className: "bg-emerald-100 text-emerald-700" },
  no_response: { label: "No Response", className: "bg-red-100 text-red-700" },
};

export default function NetworkingReferrals({ app, onUpdate }) {
  const [contacts, setContacts] = useState(
    (app.networking_contacts || []).map((c) => ({ ...c, id: c.id || crypto.randomUUID() }))
  );
  const [newContact, setNewContact] = useState({
    contact_name: "",
    contact_company: "",
    contact_role: "",
    outreach_sent: false,
    referral_requested: false,
    response_status: "pending",
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    if (!newContact.contact_name || saving) return;
    const previous = contacts;
    const updated = [...contacts, { ...newContact, id: crypto.randomUUID() }];
    setContacts(updated);
    saveContacts(updated, previous);
    setNewContact({
      contact_name: "",
      contact_company: "",
      contact_role: "",
      outreach_sent: false,
      referral_requested: false,
      response_status: "pending",
    });
  };

  const handleRemove = (id) => {
    if (saving) return;
    const previous = contacts;
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    saveContacts(updated, previous);
  };

  const handleUpdate = (id, field, value) => {
    if (saving) return;
    const previous = contacts;
    const updated = contacts.map((c) => (c.id === id ? { ...c, [field]: value } : c));
    setContacts(updated);
    saveContacts(updated, previous);
  };

  const saveContacts = async (updated, previous) => {
    setSaving(true);
    const { error } = await supabase.from("applications").update({ networking_contacts: updated }).eq("id", app.id);
    setSaving(false);
    if (error) {
      console.error("Failed to save contacts:", error);
      setContacts(previous);
      toast.error("Failed to save. Please try again.");
      return;
    }
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-[#52545A]" />
        <p className="text-[11px] uppercase tracking-wider text-[#9C9DA1] font-medium">
          Networking Contacts & Referrals
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
        <p className="text-xs font-bold text-amber-800">💡 Why a referral changes everything</p>
        <ul className="text-[11px] text-amber-700 space-y-1 leading-relaxed">
          <li>• <strong>Your CV gets seen by a human</strong> - not filtered out by an ATS before anyone reads it.</li>
          <li>• <strong>You get context no one else has</strong> - insider knowledge about the team, culture, and what the hiring manager actually wants.</li>
          <li>• <strong>Your contact is motivated to help you</strong> - many companies offer referral bonuses to employees when a referred candidate gets hired. They win when you win.</li>
          <li>• <strong>How to ask:</strong> Find someone on LinkedIn at the company. Send a short, specific message - mention the role, why you're a fit, and ask if they'd be open to a 10-min chat. Don't ask for a referral cold - build a connection first.</li>
        </ul>
      </div>

      {contacts.length === 0 ? (
        <p className="text-xs text-[#9C9DA1] py-4 text-center">
          No contacts yet. Search LinkedIn for people at this company and start reaching out.
        </p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact, i) => (
            <div key={contact.id ?? i} className="bg-[#F4F4F2] rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0E1014]">{contact.contact_name}</p>
                  <p className="text-xs text-[#9C9DA1]">
                    {contact.contact_role} at {contact.contact_company}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-xs text-[#52545A]">
                      <Checkbox
                        checked={contact.outreach_sent}
                        onCheckedChange={(v) => handleUpdate(contact.id, "outreach_sent", v)}
                      />
                      Outreach Sent
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#52545A]">
                      <Checkbox
                        checked={contact.referral_requested}
                        onCheckedChange={(v) => handleUpdate(contact.id, "referral_requested", v)}
                      />
                      Referral Requested
                    </label>
                  </div>
                  <Select
                    value={contact.response_status}
                    onValueChange={(v) => handleUpdate(contact.id, "response_status", v)}
                  >
                    <SelectTrigger className="mt-2 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                      <SelectItem value="no_response">No Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button onClick={() => handleRemove(contact.id)} className="text-[#9C9DA1] hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-[#DDDDDB] pt-4 space-y-3">
        <p className="text-xs font-medium text-[#52545A]">Add New Contact</p>
        <Input
          placeholder="Contact name (e.g., Sarah Chen)"
          value={newContact.contact_name}
          onChange={(e) => setNewContact({ ...newContact, contact_name: e.target.value })}
          className="text-sm"
        />
        <Input
          placeholder="Company (e.g., Google)"
          value={newContact.contact_company}
          onChange={(e) => setNewContact({ ...newContact, contact_company: e.target.value })}
          className="text-sm"
        />
        <Input
          placeholder="Role (e.g., Senior Data Analyst)"
          value={newContact.contact_role}
          onChange={(e) => setNewContact({ ...newContact, contact_role: e.target.value })}
          className="text-sm"
        />
        <Button onClick={handleAdd} className="bg-[#0E1014] hover:bg-[#F87060] text-sm w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>
    </div>
  );
}