"use client";

import { useState, useEffect } from "react";
import { Briefcase, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stages = ["Lead", "Quote", "Consultation", "Survey", "Accepted", "Production", "Delivery", "Complete"];

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [filterStage, setFilterStage] = useState("All");

  // Fetch jobs from Flask API
  useEffect(() => {
    fetch("http://127.0.0.1:5000/jobs")
      .then((res) => res.json())
      .then(setJobs)
      .catch((err) => console.error("Error fetching jobs:", err));
  }, []);

  const filteredJobs = jobs.filter((job) => filterStage === "All" || job.stage === filterStage);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Stages</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button>
            <Briefcase className="mr-2 h-4 w-4" /> Create Job
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Quote Price</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>{job.customer_name || job.customer}</TableCell>
                <TableCell>{job.type}</TableCell>
                <TableCell>{job.stage}</TableCell>
                <TableCell>£{job.quote_price?.toLocaleString()}</TableCell>
                <TableCell>{job.delivery_date}</TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
