import { starDoubleHCard } from './HorizontalDoubleCard';
import { starDoubleRCard } from './RotatedDoubleCard';
import { starSingleCard } from './SingleAnchorCard';

export * from './SingleAnchorCard';
export * from './HorizontalDoubleCard';
export * from './RotatedDoubleCard';

export const starCards = [starSingleCard, starDoubleHCard, starDoubleRCard];
export default starCards;