import { OverviewCards } from "./_components/overview-cards";
import { TableCards } from "./_components/table-cards";

export default function Page() {
  return (
    <div className="space-y-4">
      <OverviewCards /> {/* All 4 cards in one row */}
      <TableCards /> {/* Recent Leads Table */}
    </div>
  );
}
