import { distributionStatusLabels, distributionStatusStyles, type DistributionStatus } from "@/lib/distributions-shared";

export function DistributionStatusBadge({ status }: { status: DistributionStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${distributionStatusStyles[status]}`}>
      {distributionStatusLabels[status]}
    </span>
  );
}
