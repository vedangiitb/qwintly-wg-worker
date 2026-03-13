import { DBRepository } from "./repository.js";

export class ProjectStatusRepository extends DBRepository {
  async updateProjectStatus(sessionId: string, isGenerating: boolean) {
    const { data, error } = await this.client
      .from("chats")
      .update({ is_generating: isGenerating })
      .select("id")
      .eq("id", sessionId)
      .single();

    if (error) {
      throw new Error(`Failed to update project status: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Project not found: ${sessionId}`);
    }

    return data.id;
  }
}
