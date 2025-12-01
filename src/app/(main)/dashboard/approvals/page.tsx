// "use client";

// import { useState, useEffect } from "react";
// import { CheckCircle, XCircle, Clock, FileText, Receipt, FileSpreadsheet } from "lucide-react";
// import { fetchWithAuth } from "@/lib/api"; // Import the centralized API helper

// interface PendingDocument {
//   id: number;
//   type: "invoice" | "quotation" | "receipt" | "checklist";
//   invoice_number?: string;
//   quotation_number?: string;
//   receipt_number?: string;
//   customer_name: string;
//   total_amount?: number;
//   created_by: string;
//   created_at: string;
// }

// export default function ApprovalsPage() {
//   const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
//   const [selectedDoc, setSelectedDoc] = useState<PendingDocument | null>(null);
//   const [rejectionReason, setRejectionReason] = useState("");
//   const [actionLoading, setActionLoading] = useState(false);

//   useEffect(() => {
//     fetchPendingApprovals();
//   }, []);

//   const fetchPendingApprovals = async () => {
//     try {
//       console.log("Fetching pending approvals...");

//       // Use centralized fetchWithAuth
//       const response = await fetchWithAuth("approvals/pending");

//       console.log("Response status:", response.status);
//       console.log("Response ok:", response.ok);

//       const data = await response.json();
//       console.log("Response data:", data);

//       if (data.success) {
//         setPendingDocuments(data.data);
//       } else {
//         console.error("API returned success: false", data);
//       }
//     } catch (error) {
//       console.error("Error fetching pending approvals:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleApprove = async (doc: PendingDocument) => {
//     if (!confirm(`Are you sure you want to approve this ${doc.type}?`)) return;

//     setActionLoading(true);
//     try {
//       // Use centralized fetchWithAuth
//       const response = await fetchWithAuth("approvals/approve", {
//         method: "POST",
//         body: JSON.stringify({
//           documentId: doc.id,
//         }),
//       });

//       const data = await response.json();
//       if (data.success) {
//         setPendingDocuments((prev) => prev.filter((d) => d.id !== doc.id));
//         alert("Document approved successfully!");
//       }
//     } catch (error) {
//       console.error("Error approving document:", error);
//       alert("Failed to approve document");
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleReject = async () => {
//     if (!selectedDoc || !rejectionReason.trim()) {
//       alert("Please provide a reason for rejection");
//       return;
//     }

//     setActionLoading(true);
//     try {
//       // Use centralized fetchWithAuth
//       const response = await fetchWithAuth("approvals/reject", {
//         method: "POST",
//         body: JSON.stringify({
//           documentId: selectedDoc.id,
//           reason: rejectionReason,
//         }),
//       });

//       const data = await response.json();
//       if (data.success) {
//         setPendingDocuments((prev) => prev.filter((d) => d.id !== selectedDoc.id));
//         setRejectDialogOpen(false);
//         setRejectionReason("");
//         setSelectedDoc(null);
//         alert("Document rejected");
//       }
//     } catch (error) {
//       console.error("Error rejecting document:", error);
//       alert("Failed to reject document");
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const getDocumentIcon = (type: string) => {
//     switch (type) {
//       case "invoice":
//         return <FileText className="h-5 w-5 text-blue-600" />;
//       case "quotation":
//         return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
//       case "receipt":
//         return <Receipt className="h-5 w-5 text-purple-600" />;
//       case "checklist":
//         return <FileText className="h-5 w-5 text-orange-600" />;
//       default:
//         return <FileText className="h-5 w-5 text-gray-600" />;
//     }
//   };

//   const getDocumentNumber = (doc: PendingDocument) => {
//     return doc.invoice_number || doc.quotation_number || doc.receipt_number || "N/A";
//   };

//   if (loading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center">
//         <div className="text-center">
//           <Clock className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600" />
//           <p className="text-gray-600">Loading approvals...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="mx-auto max-w-7xl p-6">
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
//         <p className="mt-1 text-gray-600">Review and approve documents submitted by your team</p>
//       </div>

//       {pendingDocuments.length === 0 ? (
//         <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
//           <Clock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
//           <p className="text-lg text-gray-600">No pending approvals at the moment</p>
//           <p className="mt-2 text-sm text-gray-500">All documents have been reviewed</p>
//         </div>
//       ) : (
//         <div className="grid gap-4">
//           {pendingDocuments.map((doc) => (
//             <div key={doc.id} className="rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md">
//               <div className="p-6">
//                 <div className="flex items-start justify-between">
//                   <div className="flex flex-1 items-start gap-4">
//                     <div className="rounded-lg bg-blue-50 p-3">{getDocumentIcon(doc.type)}</div>
//                     <div className="flex-1">
//                       <div className="mb-1 flex items-center gap-2">
//                         <h3 className="text-lg font-semibold text-gray-900 capitalize">{doc.type}</h3>
//                         <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
//                           {getDocumentNumber(doc)}
//                         </span>
//                       </div>
//                       <p className="mb-1 text-gray-600">
//                         <span className="font-medium">Customer:</span> {doc.customer_name}
//                       </p>
//                       {doc.total_amount && (
//                         <p className="mb-1 text-gray-600">
//                           <span className="font-medium">Amount:</span> £{doc.total_amount.toFixed(2)}
//                         </p>
//                       )}
//                       <p className="text-sm text-gray-500">
//                         Created by {doc.created_by} on {new Date(doc.created_at).toLocaleDateString()}
//                       </p>
//                     </div>
//                   </div>
//                   <div className="ml-4 flex gap-2">
//                     <button
//                       onClick={() => handleApprove(doc)}
//                       disabled={actionLoading}
//                       className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
//                     >
//                       <CheckCircle className="h-4 w-4" />
//                       Approve
//                     </button>
//                     <button
//                       onClick={() => {
//                         setSelectedDoc(doc);
//                         setRejectDialogOpen(true);
//                       }}
//                       disabled={actionLoading}
//                       className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
//                     >
//                       <XCircle className="h-4 w-4" />
//                       Reject
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Reject Dialog */}
//       {rejectDialogOpen && (
//         <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
//           <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
//             <h2 className="mb-2 text-xl font-bold">Reject Document</h2>
//             <p className="mb-4 text-gray-600">Please provide a reason for rejecting this {selectedDoc?.type}</p>
//             <textarea
//               placeholder="Enter rejection reason..."
//               value={rejectionReason}
//               onChange={(e) => setRejectionReason(e.target.value)}
//               rows={4}
//               className="w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
//             />
//             <div className="mt-4 flex gap-3">
//               <button
//                 onClick={() => {
//                   setRejectDialogOpen(false);
//                   setRejectionReason("");
//                   setSelectedDoc(null);
//                 }}
//                 className="flex-1 rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleReject}
//                 disabled={actionLoading || !rejectionReason.trim()}
//                 className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
//               >
//                 {actionLoading ? "Rejecting..." : "Reject"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
