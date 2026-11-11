import SkeletonBar from '@/components/SkeletonBar';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';

/** Placeholder of the large profile card while what it draws loads. */
export default function ProfileCardSkeleton() {
  return (
    <WorkoutDetailsCard>
      <SkeletonBar width="100%" height={120} />
    </WorkoutDetailsCard>
  );
}
