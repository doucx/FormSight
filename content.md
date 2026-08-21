## [WIP] src/app.tsx

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~ts.old
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db/index';
~~~~~
~~~~~ts.new
import {
  type TrainingDomain,
  type UnifiedProfileData,
  repository,
} from './utils/db/index';
~~~~~
