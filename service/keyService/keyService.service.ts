import { UserKeysRepository } from "../../repository/userKeys.repository.js";

export const checkKeyExists = async (userId: string, provider: string) => {
  try {
    const userKeyRepo = new UserKeysRepository();
    const encryptedKey = await userKeyRepo.fetchKeyByUserIdAndProvider(
      userId,
      provider,
    );
    if (!encryptedKey) throw Error("No Key Found");
  } catch (error) {
    throw new Error(`No API key found for ${provider} for the user`);
  }
};
