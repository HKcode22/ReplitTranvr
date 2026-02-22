import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Phone, Plus, MapPin, Calendar, Clock, Loader2, PhoneCall,
  FileText, ChevronDown, ChevronUp, Play, PhoneOff, AlertCircle, Plane, ArrowRight
} from "lucide-react";
import type { CallRequest, BlandCall, ItineraryProposal } from "@shared/schema";

function BlandCallCard({ blandCall }: { blandCall: BlandCall }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const summaryTruncateLength = 180;

  const statusColors: Record<string, string> = {
    queued: "bg-muted text-muted-foreground",
    ringing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-destructive/10 text-destructive",
    no_answer: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <div className="space-y-3 pt-3" data-testid={`bland-call-${blandCall.id}`}>
      <Separator />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <PhoneCall className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">AI Concierge Call</span>
          <Badge className={statusColors[blandCall.status] || "bg-muted text-muted-foreground"} data-testid={`badge-call-status-${blandCall.id}`}>
            {blandCall.status === "in_progress" ? "In Progress" : blandCall.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {blandCall.duration && (
            <span className="text-xs text-muted-foreground">
              {Math.ceil(blandCall.duration / 60)} min
            </span>
          )}
          {blandCall.startedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(blandCall.startedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {blandCall.errorMessage && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{blandCall.errorMessage}</span>
        </div>
      )}

      {blandCall.summary && (
        <div data-testid={`text-call-summary-${blandCall.id}`}>
          <p className="text-sm text-muted-foreground">
            {showFullSummary || blandCall.summary.length <= summaryTruncateLength
              ? blandCall.summary
              : `${blandCall.summary.slice(0, summaryTruncateLength).trimEnd()}...`}
          </p>
          {blandCall.summary.length > summaryTruncateLength && (
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs"
              onClick={() => setShowFullSummary(!showFullSummary)}
              data-testid={`button-toggle-summary-${blandCall.id}`}
            >
              {showFullSummary ? "Show less" : "Show more"}
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {blandCall.transcript && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTranscript(!showTranscript)}
            data-testid={`button-toggle-transcript-${blandCall.id}`}
          >
            <FileText className="w-4 h-4 mr-1" />
            {showTranscript ? "Hide" : "View"} Transcript
            {showTranscript ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        )}
        {blandCall.recordingUrl && (
          <a href={blandCall.recordingUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" data-testid={`button-play-recording-${blandCall.id}`}>
              <Play className="w-4 h-4 mr-1" /> Recording
            </Button>
          </a>
        )}
      </div>

      {showTranscript && blandCall.transcript && (
        <Card className="p-4 max-h-80 overflow-y-auto" data-testid={`container-transcript-${blandCall.id}`}>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {blandCall.transcript}
          </pre>
        </Card>
      )}
    </div>
  );
}

function CallRequestCard({ call, proposals }: { call: CallRequest; proposals?: ItineraryProposal[] }) {
  const { toast } = useToast();

  const linkedProposals = proposals?.filter(p => p.callRequestId === call.id) || [];

  const { data: blandCalls, isLoading: loadingBlandCalls } = useQuery<BlandCall[]>({
    queryKey: ["/api/bland/calls", call.id],
    queryFn: async () => {
      const res = await fetch(`/api/bland/calls/${call.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bland/dispatch", { callRequestId: call.id });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Call dispatched", description: "Your concierge call is being placed now." });
      queryClient.invalidateQueries({ queryKey: ["/api/bland/calls", call.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-requests"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to dispatch call", description: err.message, variant: "destructive" });
    },
  });

  const hasActiveBlandCall = blandCalls?.some(c => c.status === "queued" || c.status === "ringing" || c.status === "in_progress");
  const canDispatch = call.phone && call.status !== "completed" && !hasActiveBlandCall;
  const isCompleted = call.status === "completed";
  const hasProposal = linkedProposals.length > 0;

  return (
    <Card className="p-5" data-testid={`card-call-request-${call.id}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium">{call.destination || "No destination specified"}</span>
            <StatusBadge status={call.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {call.dateFrom && call.dateTo && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {call.dateFrom} — {call.dateTo}
              </span>
            )}
            {call.timeWindow && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {call.timeWindow}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{call.tripType === "both" ? "Flight + Hotel" : call.tripType}</span>
            {call.phone && (
              <>
                <span>|</span>
                <Phone className="w-3 h-3" />
                <span>{call.phone}</span>
              </>
            )}
          </div>
          {call.notes && (
            <p className="text-sm text-muted-foreground">{call.notes}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(call.createdAt).toLocaleDateString()}
          </span>
          {canDispatch && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchMutation.mutate()}
              disabled={dispatchMutation.isPending}
              data-testid={`button-dispatch-call-${call.id}`}
            >
              {dispatchMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <PhoneCall className="w-3 h-3 mr-1" />
              )}
              Call Now
            </Button>
          )}
          {hasActiveBlandCall && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin mr-1" /> Call Active
            </Badge>
          )}
        </div>
      </div>

      {loadingBlandCalls ? (
        <div className="pt-3">
          <Skeleton className="h-16 w-full" />
        </div>
      ) : blandCalls && blandCalls.length > 0 ? (
        blandCalls.map((bc) => <BlandCallCard key={bc.id} blandCall={bc} />)
      ) : null}

      {isCompleted && (
        <div className="mt-3 pt-3 border-t space-y-2">
          {hasProposal ? (
            linkedProposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 flex-wrap" data-testid={`linked-proposal-${p.id}`}>
                <div className="flex items-center gap-2 text-sm">
                  <Plane className="w-4 h-4 text-primary" />
                  <span className="font-medium">{p.title}</span>
                  <StatusBadge status={p.status} />
                </div>
                <Link href={`/proposals/${p.id}`}>
                  <Button size="sm" variant="outline" data-testid={`button-view-proposal-${p.id}`}>
                    View Proposal <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`text-proposal-pending-${call.id}`}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating your travel proposal...</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function CallHistoryPage() {
  const { data: callRequests, isLoading } = useQuery<CallRequest[]>({
    queryKey: ["/api/call-requests"],
  });

  const { data: proposals } = useQuery<ItineraryProposal[]>({
    queryKey: ["/api/proposals"],
  });

  const { data: blandConfig } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/bland/config"],
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold" data-testid="text-call-history-title">Call History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your concierge call requests
            {blandConfig?.configured && (
              <span className="ml-1">— AI voice calls enabled</span>
            )}
          </p>
        </div>
        <Link href="/request-call">
          <Button data-testid="button-new-request">
            <Plus className="w-4 h-4 mr-2" /> New Request
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : !callRequests?.length ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Phone className="w-6 h-6 text-primary" />
          </div>
          <p className="font-medium mb-1">No call requests yet</p>
          <p className="text-sm text-muted-foreground mb-4">Request your first concierge call to get started.</p>
          <Link href="/request-call">
            <Button data-testid="button-request-first-call">Request a Call</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {callRequests.map((call) => (
            <CallRequestCard key={call.id} call={call} proposals={proposals} />
          ))}
        </div>
      )}
    </div>
  );
}
