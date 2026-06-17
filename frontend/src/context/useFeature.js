import { useContext } from 'react';
import { FeatureContext } from './FeatureContext';

export const useFeature = () => useContext(FeatureContext);
