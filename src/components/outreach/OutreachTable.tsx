import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Mail } from "lucide-react";
import { format } from "date-fns";

export interface OutreachTarget {
  id: string;
  personName: string;
  personRole: string;
  sourceDomain: string;
  sourceUrl: string;
  articleTitle?: string;
  priorityScore: number;
  lastMentioned?: string;
  status: 'pending' | 'email_drafted' | 'email_sent' | 'contacted' | 'declined';
  citationCount: number;
}

interface OutreachTableProps {
  targets: OutreachTarget[];
  onRowClick: (target: OutreachTarget) => void;
  loading?: boolean;
}

export function OutreachTable({ targets, onRowClick, loading }: OutreachTableProps) {
  const getPriorityBadgeColor = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-gray-100 text-gray-800 border-gray-200" },
      email_drafted: { label: "Email Drafted", className: "bg-blue-100 text-blue-800 border-blue-200" },
      email_sent: { label: "Email Sent", className: "bg-purple-100 text-purple-800 border-purple-200" },
      contacted: { label: "Contacted", className: "bg-green-100 text-green-800 border-green-200" },
      declined: { label: "Declined", className: "bg-red-100 text-red-800 border-red-200" },
    };

    const badge = badges[status] || badges.pending;
    return (
      <Badge className={badge.className}>
        {badge.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className="text-center py-12 border border-gray-200 rounded-lg bg-white">
        <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">No outreach targets found.</p>
        <p className="text-sm text-gray-500">Click "Detect Targets" to identify potential contacts from your top sources.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Person Name</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Source Domain</TableHead>
            <TableHead className="font-semibold">AI Priority Score</TableHead>
            <TableHead className="font-semibold">Last Mentioned</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {targets.map((target) => (
            <TableRow
              key={target.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onRowClick(target)}
            >
              <TableCell className="py-4 px-4">
                <div className="font-medium text-gray-900">{target.personName}</div>
                {target.articleTitle && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">{target.articleTitle}</div>
                )}
              </TableCell>
              <TableCell className="py-4 px-4">
                <span className="text-sm text-gray-700">{target.personRole}</span>
              </TableCell>
              <TableCell className="py-4 px-4">
                <span className="text-sm text-gray-700">{target.sourceDomain}</span>
              </TableCell>
              <TableCell className="py-4 px-4">
                <Badge className={getPriorityBadgeColor(target.priorityScore)}>
                  {target.priorityScore.toFixed(0)}
                </Badge>
              </TableCell>
              <TableCell className="py-4 px-4">
                <span className="text-sm text-gray-600">
                  {target.lastMentioned
                    ? format(new Date(target.lastMentioned), "MMM d, yyyy")
                    : "N/A"}
                </span>
              </TableCell>
              <TableCell className="py-4 px-4">
                {getStatusBadge(target.status)}
              </TableCell>
              <TableCell className="py-4 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick(target);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

