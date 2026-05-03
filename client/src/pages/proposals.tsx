import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { FileText, ArrowRight, Phone } from "lucide-react";
import type { ItineraryProposal } from "@shared/schema";

export default function ProposalsPage() {
  const { data: proposals, isLoading } = useQuery<ItineraryProposal[]>({
    queryKey: ["/api/proposals"],
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold" data-testid="text-proposals-title">Proposals</h1>
        <p className="text-muted-foreground text-sm mt-1">Travel itineraries prepared by your concierge</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : !proposals?.length ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <p className="font-medium mb-1">No proposals yet</p>
          <p className="text-sm text-muted-foreground mb-4">Request a concierge call and we'll prepare a custom itinerary.</p>
          <Link href="/request-call">
            <Button data-testid="button-request-call-from-proposals">
              <Phone className="w-4 h-4 mr-2" /> Request a Call
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <Link key={proposal.id} href={`/proposals/${proposal.id}`}>
              <Card className="p-4 sm:p-5 hover-elevate cursor-pointer" data-testid={`card-proposal-${proposal.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium break-words min-w-0">{proposal.title}</span>
                      <StatusBadge status={proposal.status} />
                    </div>
                    {proposal.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{proposal.summary}</p>
                    )}
                    <div className="flex items-center gap-3 sm:gap-4 text-sm flex-wrap">
                      <span className="font-semibold tabular-nums whitespace-nowrap">${Number(proposal.totalEstimate).toLocaleString()}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{new Date(proposal.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
