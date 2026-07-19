"use client";

import { useState } from "react";
import { Send, CheckCircle2, MessageSquare } from "lucide-react";
import type { Session } from "next-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/index";
import { Textarea } from "@/components/ui/form-fields";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  user?: Session["user"];
}

export function ContactModal({ open, onClose, user }: ContactModalProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSent(false);
      setMessage("");
      setError("");
      if (!user?.name) setName("");
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setError("");
    setIsPending(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), message: message.trim() }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            Contact Us
          </DialogTitle>
        </DialogHeader>

        {!sent ? (
          <>
            <p className="text-sm text-muted-foreground -mt-1">
              Send your feedback, complaint, or question to the DhanTracker team.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                  maxLength={100}
                />
              </div>

              {user?.email && (
                <div className="flex flex-col gap-1.5">
                  <Label>Email</Label>
                  <Input
                    value={user.email}
                    disabled
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label>Message</Label>
                <Textarea
                  placeholder="Share your feedback, report an issue, or ask a question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isPending}
                  className="min-h-[120px] text-sm resize-none"
                  maxLength={2000}
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {message.length} / 2000
                </p>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                loading={isPending}
                disabled={isPending || !name.trim() || message.trim().length < 5}
                className="gap-2"
              >
                <Send className="size-3.5" />
                Send Message
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <div className="w-14 h-14 rounded-full bg-profit/10 flex items-center justify-center">
              <CheckCircle2 className="size-7 text-profit" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Message sent!</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Thanks for reaching out. We'll get back to you soon.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}