import { ProjectStatusRepository } from "../../repository/projectStatus.repository.js";

export const updateProjectStatus = async (
  sessionId: string,
  isGenerating: boolean,
) => {
  const projectStatusRepository = new ProjectStatusRepository();
  try {
    await projectStatusRepository.updateProjectStatus(sessionId, isGenerating);
  } catch (error) {
    console.error(`Failed to update project status: ${error}`);
  }
};
