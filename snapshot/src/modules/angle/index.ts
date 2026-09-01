import { angleComparisonCard } from './ComparisonCard';
import { angleEstimationCard } from './EstimationCard';
import { angleParallelCard } from './ParallelCard';

export * from './EstimationCard';
export * from './ComparisonCard';
export * from './ParallelCard';

export const angleCards = [angleEstimationCard, angleComparisonCard, angleParallelCard];
export default angleCards;
