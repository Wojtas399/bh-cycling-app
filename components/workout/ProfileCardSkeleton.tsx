import SkeletonBar from '@/components/SkeletonBar';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';

export default function ProfileCardSkeleton() {
  return (
    <WorkoutDetailsCard>
      <SkeletonBar width="100%" height={120} />
    </WorkoutDetailsCard>
  );
}
