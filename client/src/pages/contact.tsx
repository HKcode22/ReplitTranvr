// Public Contact us form; submissions emailed via /api/public/contact.

import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import SEO from "@/components/seo";

export default function ContactPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/public/contact", {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || null,
        message: message.trim(),
      });
      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: "We couldn't send your message",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contact Travnr"
        description="Send a message to the Travnr concierge team."
        path="/contact"
      />
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center" data-testid="link-contact-home">
            <span className="font-serif font-semibold text-lg">Travnr</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold">Contact us</h1>
          <p className="text-muted-foreground text-sm">
            Have a question or feedback? Send us a note — we usually reply
            within one business day.
          </p>
        </div>

        {!submitted && (
          <Card className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Your name</Label>
                <Input
                  id="contact-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  maxLength={120}
                  data-testid="input-contact-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  maxLength={200}
                  data-testid="input-contact-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-subject">Subject (optional)</Label>
                <Input
                  id="contact-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  data-testid="input-contact-subject"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={4000}
                  required
                  data-testid="textarea-contact-message"
                  placeholder="How can we help?"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full" data-testid="button-contact-submit">
                {submitting ? "Sending…" : "Send message"}
              </Button>
            </form>
          </Card>
        )}

        {submitted && (
          <Card className="p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">Message sent</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Thanks! We'll get back to you at <span className="font-medium">{email}</span>.
            </p>
            <div className="pt-2">
              <Link href="/">
                <Button variant="outline">Back to home</Button>
              </Link>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
