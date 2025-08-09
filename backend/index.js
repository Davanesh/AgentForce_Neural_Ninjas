// backend/index.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import bodyParser from "body-parser";

dotenv.config();
const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("🚀 AI PR Reviewer Backend is running!");
});


app.post("/webhook", async (req, res) => {
  try {
    const prData = req.body.pull_request;
    if (!prData) return res.status(200).send("No PR data");

    const diffUrl = prData.diff_url;
    const prNumber = prData.number;
    const repoName = req.body.repository.full_name;

    // Get PR diff
    const diffRes = await axios.get(diffUrl);
    const diffContent = diffRes.data;

    // Send to AI
    const review = await getAIReview(diffContent, prData.title, prData.body);

    // Post comment to PR
    await axios.post(
      `https://api.github.com/repos/${repoName}/issues/${prNumber}/comments`,
      { body: review },
      { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
    );

    res.status(200).send("Review posted!");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error processing webhook");
  }
});

async function getAIReview(diff, title, description) {
  const prompt = `
You are a senior software engineer reviewing a PR.
PR Title: ${title}
PR Description: ${description}

Diff:
${diff}

Give feedback in this format:
1. Summary
2. Strengths
3. Issues Found
4. Suggestions with code snippets
5. Code Quality Score (out of 100)
  `;

  const openaiRes = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
  );

  return openaiRes.data.choices[0].message.content;
}

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
