import { createContext, useContext } from 'react';
import { SAMPLE_PROJECT } from '../data/projectModel';

export const ProjectContext = createContext(SAMPLE_PROJECT);

export function useProject() {
  return useContext(ProjectContext);
}
