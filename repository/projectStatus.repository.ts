import { DBRepository } from "./repository.js";

export class ProjectStatusRepository extends DBRepository {
  async updateProjectStatus(chatId: string, isGenerating: boolean) {
    const { data, error } = await this.client
      .from("chats")
      .update({ is_generating: isGenerating })
      .select("id")
      .eq("id", chatId)
      .single();

    if (error) {
      throw new Error(`Failed to update project status: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Project not found: ${chatId}`);
    }

    return data.id;
  }
}
