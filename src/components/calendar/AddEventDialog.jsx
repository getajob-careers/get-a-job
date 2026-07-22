import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";

// PR 3I — AddEventDialog chrome restyled on rd-* tokens. Restyle-only on
// behavior: the calendar_events INSERT, all four validation toasts
// (missing start_time, missing end_time when end_date set, end <= start),
// the optional application_id linkage, and the formData reset on submit
// success are all preserved byte-for-byte.

const RD_INPUT_CLS = "border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-tertiary focus-visible:border-rd-primary focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_var(--rd-primary-tint)]";
const RD_LABEL = "block text-[11px] font-display font-semibold text-rd-text mb-1.5";

export default function AddEventDialog({ open, onClose, applications, onEventAdded }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "interview",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    all_day: false,
    application_id: "none",
    location: "",
    reminder_minutes: 60
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!formData.all_day && !formData.start_time) {
      toast.error("Please enter a start time.");
      return;
    }

    const startDateTime = formData.all_day
      ? formData.start_date
      : new Date(`${formData.start_date}T${formData.start_time}`).toISOString();

    if (formData.end_date && !formData.end_time) {
      toast.error("Please enter an end time when an end date is provided.");
      return;
    }

    const endDateTime = formData.end_date && formData.end_time
      ? new Date(`${formData.end_date}T${formData.end_time}`).toISOString()
      : null;

    if (endDateTime && endDateTime <= startDateTime) {
      toast.error("End time must be after start time.");
      return;
    }

    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      title: formData.title,
      description: formData.description,
      event_type: formData.event_type,
      start_date: startDateTime,
      end_date: endDateTime,
      all_day: formData.all_day,
      application_id: formData.application_id && formData.application_id !== "none" ? formData.application_id : null,
      location: formData.location,
      reminder_minutes: formData.reminder_minutes
    });

    if (error) {
      console.error("Failed to add event:", error);
      toast.error("Failed to add event. Please try again.");
      return;
    }

    onEventAdded();
    onClose();
    setFormData({
      title: "",
      description: "",
      event_type: "interview",
      start_date: "",
      start_time: "",
      end_date: "",
      end_time: "",
      all_day: false,
      application_id: "none",
      location: "",
      reminder_minutes: 60
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-rd-bg-card border border-rd-border rounded-[18px]">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-[18px] text-rd-text">
            Add calendar event
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className={RD_LABEL}>Event title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Interview with Google"
              className={RD_INPUT_CLS}
              required
            />
          </div>

          <div>
            <Label htmlFor="event_type" className={RD_LABEL}>Event type</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) => setFormData({ ...formData, event_type: value })}
            >
              <SelectTrigger className={RD_INPUT_CLS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="application_deadline">Application Deadline</SelectItem>
                <SelectItem value="networking_event">Networking Event</SelectItem>
                <SelectItem value="task_deadline">Task Deadline</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="application_id" className={RD_LABEL}>
              Link to application{" "}
              <span className="text-rd-text-tertiary font-normal normal-case tracking-normal">(optional)</span>
            </Label>
            <Select
              value={formData.application_id}
              onValueChange={(value) => setFormData({ ...formData, application_id: value })}
            >
              <SelectTrigger className={RD_INPUT_CLS}>
                <SelectValue placeholder="Select an application" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {applications?.map(app => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.role_title} {app.company ? `at ${app.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="all_day"
              checked={formData.all_day}
              onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
              className="border-rd-border data-[state=checked]:bg-rd-primary data-[state=checked]:border-rd-primary"
            />
            <Label htmlFor="all_day" className="text-[12px] text-rd-text-secondary cursor-pointer">
              All-day event
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date" className={RD_LABEL}>Start date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={RD_INPUT_CLS}
                required
              />
            </div>
            {!formData.all_day && (
              <div>
                <Label htmlFor="start_time" className={RD_LABEL}>Start time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className={RD_INPUT_CLS}
                />
              </div>
            )}
          </div>

          {!formData.all_day && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="end_date" className={RD_LABEL}>
                  End date{" "}
                  <span className="text-rd-text-tertiary font-normal normal-case tracking-normal">(optional)</span>
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className={RD_INPUT_CLS}
                />
              </div>
              <div>
                <Label htmlFor="end_time" className={RD_LABEL}>End time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className={RD_INPUT_CLS}
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="location" className={RD_LABEL}>Location / meeting link</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Zoom link or office address"
              className={RD_INPUT_CLS}
            />
          </div>

          <div>
            <Label htmlFor="description" className={RD_LABEL}>Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional notes about this event"
              rows={3}
              className={RD_INPUT_CLS}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 font-display font-semibold text-[13px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-3.5 py-2 transition-colors"
            >
              <X className="w-3.5 h-3.5" />Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-4 py-2.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />Add event
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
