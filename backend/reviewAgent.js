import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export async function getAIReview(diff, title, description) {
  try {
    // Here you can replace this placeholder with an actual AI API call
    return `Review for: ${title}
Description: ${description}
Diff: ${diff.slice(0, 200)}... (truncated)
AI says: Looks good, but maybe double-check edge cases.`;
  } catch (error) {
    console.error("Error getting AI review:", error.message);
    throw error;
  }
}

export async function postPRComment(owner, repo, pullNumber, body) {
  try {
    const res = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
      { body },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    return res.data;
  } catch (error) {
    console.error("Error posting PR comment:", error.message);
    throw error;
  }
}
