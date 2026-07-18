import { Badge } from "@/components/ui/badge";
import {
  workFitnessAssessmentOutcomeDisplay,
  workFitnessOutcomeBadgeVariant,
  isWorkFitnessCaseReviewed,
} from "@shared/workFitness";

type WorkFitnessOutcomeCellProps = {
  fitnessOutcome: string | null | undefined;
  status: string | null | undefined;
  workRestrictions?: string | null;
  className?: string;
};

export function WorkFitnessOutcomeCell({
  fitnessOutcome,
  status,
  workRestrictions,
  className,
}: WorkFitnessOutcomeCellProps) {
  const reviewed = isWorkFitnessCaseReviewed(status);
  const restrictions = workRestrictions?.trim();

  return (
    <div className={className}>
      <Badge variant={workFitnessOutcomeBadgeVariant(fitnessOutcome)} className="whitespace-normal text-left">
        {workFitnessAssessmentOutcomeDisplay(fitnessOutcome, reviewed)}
      </Badge>
      {restrictions ? (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2" title={restrictions}>
          {restrictions}
        </p>
      ) : null}
    </div>
  );
}
